"""FastAPI app for the conversation practice backend.

Task 1.2: the two conversation endpoints are real — models load once at
startup (lifespan), the pipeline functions live in `app/pipeline.py`,
and every model call is serialized behind `MODEL_LOCK` via
`run_serialized`. The shapes in `app/schemas.py` and
`docs/conversation-backend-api.md` are unchanged.

Two properties task 1.1 decided are kept exactly:

- **CORS**: an explicit origin allowlist, never `allow_origins=["*"]``
  — this endpoint drives a local GPU with no auth, so a wildcard would
  make it callable by any page the user happens to have open.
- **Concurrency**: handlers are `async def`; the blocking pipeline
  bodies run through `run_serialized` (one module-level `asyncio.Lock`
  held around each body — input decoding plus its model calls, never a
  whole request), so `/health` keeps answering while a call is in
  flight and two overlapping requests never hit the GPU at the same
  time (proven in `backend/tests/test_health.py`).

`MODEL_LOCK` is no longer the module's only lock: phase 3 gave each
conversation session its own (`app/session.py`), held around the
select-synthesize-record sequence in `/conversation/session/*`. The
two are always taken in that order — session lock first, then
`MODEL_LOCK` inside `run_serialized` — and never the reverse, so they
cannot deadlock against each other.

Model presence: production startup loads all three models before the
server accepts requests, so a served request can rely on them. The only
process that can lack a model is one whose startup was pre-seeded by a
test (an empty or partial registry) — for that process the pipeline
genuinely isn't available, which still answers `501`, matching the
"endpoint recognized, functionality not available in this process"
meaning it has had since task 1.1.
"""

from __future__ import annotations

import asyncio
import base64
import binascii
from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import pipeline
from app.bank import load_bank, select_entry
from app.models import ModelRegistry, load_models_into
from app.pipeline import UndecodableAudioError
from app.schemas import (
    HealthResponse,
    JudgeRequest,
    JudgeResponse,
    ModelsLoaded,
    OpeningRequest,
    OpeningResponse,
)
from app.session import (
    NextQuestionResponse,
    SessionStartRequest,
    SessionStartResponse,
    SessionState,
    SessionStore,
    Turn,
)

# Vite's default dev server origin, plus its 127.0.0.1 equivalent —
# the only origins allowed to call this backend. Add task 1.4's
# Playwright e2e origin here when that task defines it; never widen
# this to a wildcard.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all three models, the question bank and the session store,
    before serving requests.

    Tests pre-seed `app.state.models` (with fakes, or empty) before
    startup; a pre-seeded registry is used as-is and nothing loads —
    that is the whole non-GPU test mechanism, so never "helpfully" load
    missing models here when a registry already exists.
    """
    if getattr(app.state, "models", None) is None:
        app.state.models = ModelRegistry()
        await load_models_into(app.state.models)
    # The conversation-starter bank: a small JSON file, read once here
    # for the same reason the models are — no per-request file I/O — and
    # loud at startup rather than per learner if it is missing or empty.
    if getattr(app.state, "bank", None) is None:
        app.state.bank = load_bank()
    # Phase 3's conversation sessions: built once here for the same
    # reason, and bounded (app/session.py) so a client that starts
    # sessions in a loop can't grow this process without end.
    if getattr(app.state, "sessions", None) is None:
        app.state.sessions = SessionStore()
    yield


app = FastAPI(title="conversation-backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serializes access to the local models (STT, judge LLM, TTS) — the
# backend is single-process, single-GPU, synchronous per request (see
# the plan's CONTEXT.md). Held around a pipeline body (the cheap input
# decoding plus its model calls), never around an entire request, and
# never by /health — so unrelated routes are never blocked by a model
# call in flight.
MODEL_LOCK = asyncio.Lock()


async def run_serialized(fn: Callable, *args, **kwargs):
    """Run a blocking callable under `MODEL_LOCK`, off the event loop.

    `asyncio.to_thread` keeps the blocking call from ever stalling the
    event loop itself (so `/health` stays responsive); the lock keeps
    two overlapping calls from ever running at once. Both real pipeline
    entry points below route through this one helper.
    """
    async with MODEL_LOCK:
        return await asyncio.to_thread(fn, *args, **kwargs)


def _registry() -> ModelRegistry:
    registry = getattr(app.state, "models", None)
    return registry if registry is not None else ModelRegistry()


def _require_loaded(loaded: bool, model_name: str) -> None:
    if not loaded:
        raise HTTPException(
            status_code=501,
            detail=f"{model_name} model is not loaded in this process",
        )


def _opening_pipeline(payload: OpeningRequest) -> OpeningResponse:
    """Blocking body of POST /conversation/opening (runs under MODEL_LOCK).

    `payload.known_words` is the learner's own known-vocabulary snapshot;
    it picks which bank entry gets spoken (`app.bank.select_entry`), so
    two learners at different points in the course are asked different
    questions.
    """
    registry = _registry()
    _require_loaded(registry.tts_loaded, "tts")
    question_text, audio_bytes, mime_type = pipeline.synthesize_opening(
        registry.tts, payload.known_words, app.state.bank
    )
    return OpeningResponse(
        question_text=question_text,
        question_audio_base64=base64.b64encode(audio_bytes).decode("ascii"),
        question_audio_mime_type=mime_type,
    )


def _judge_pipeline(payload: JudgeRequest) -> JudgeResponse:
    """Blocking body of POST /conversation/judge (runs under MODEL_LOCK)."""
    registry = _registry()
    _require_loaded(registry.whisper_loaded, "whisper")
    _require_loaded(registry.judge_loaded, "judge")

    try:
        reply_audio_bytes = base64.b64decode(payload.reply_audio_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=422, detail="reply_audio_base64 is not valid base64"
        ) from exc

    try:
        outcome = pipeline.judge_reply(
            registry.whisper,
            registry.judge_llm,
            registry.judge_tokenizer,
            payload.question_text,
            reply_audio_bytes,
            payload.reply_audio_mime_type,
        )
    except UndecodableAudioError as exc:
        # The caller's payload, not a pipeline failure: a client error
        # with a `detail` body, never a verdict and never a raw 500.
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return JudgeResponse(
        transcript=outcome.transcript,
        verdict=outcome.verdict,
        feedback_en=outcome.feedback_en,
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    registry = _registry()
    return HealthResponse(
        status="ok",
        models_loaded=ModelsLoaded(
            whisper=registry.whisper_loaded,
            judge=registry.judge_loaded,
            tts=registry.tts_loaded,
        ),
    )


@app.post("/conversation/opening", response_model=OpeningResponse)
async def opening(payload: OpeningRequest) -> OpeningResponse:
    return await run_serialized(_opening_pipeline, payload)


@app.get("/conversation/opening", response_model=OpeningResponse, include_in_schema=False)
async def opening_get_compat() -> OpeningResponse:
    """Back-compat shim, not part of the documented contract.

    Task 2.1's real contract (`docs/conversation-backend-api.md`) is the
    `POST` above, carrying the learner's known-word snapshot — that is
    what `HttpConversationPracticeClient` calls. This bodyless `GET`
    alias exists only because `backend/tests/test_health.py` and
    `backend/tests/test_pipeline.py` (task 1.1/1.2's files, outside task
    2.1's own `covers`) still call the old bodyless `GET` and this task
    is not scoped to edit them. It behaves exactly like a `POST` with an
    empty `known_words` list — no different pipeline path, no separate
    behavior to keep in sync.
    """
    return await run_serialized(_opening_pipeline, OpeningRequest(known_words=[]))


@app.post("/conversation/judge", response_model=JudgeResponse)
async def judge(payload: JudgeRequest) -> JudgeResponse:
    return await run_serialized(_judge_pipeline, payload)


# ---------------------------------------------------------------------------
# Conversation sessions (phase 3)
# ---------------------------------------------------------------------------


def _require_session(session_id: str) -> SessionState:
    """The live session with this id, or a 404.

    An id this process does not hold is a `404` whether it never
    existed, was mistyped, or was evicted under the store's size cap —
    one state, not three, so the frontend has nothing extra to
    special-case. It is never turned into a freshly created session:
    that would silently hand the learner an empty history and re-ask a
    question they had already answered.
    """
    state = app.state.sessions.get(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="unknown session id")
    return state


async def _ask_next_question(state: SessionState) -> tuple[str, str, str] | None:
    """Select, speak and record this session's next unasked question.

    Returns (question_text, audio_base64, mime_type), or `None` when the
    session's matched tier holds nothing it has not already been asked.

    **The caller holds `state.lock` around this whole call.** Selection
    reads `state.asked_ids` and the recording writes it, with an `await`
    (the TTS call) in between — without the lock two overlapping `/next`
    requests would both read the same asked-set, both pick the same
    entry, and both return it as "new". Recording only after synthesis
    succeeds is deliberate too: a question the learner never heard
    because TTS failed should not be burned for the rest of the session.
    """
    registry = _registry()
    _require_loaded(registry.tts_loaded, "tts")
    entry = select_entry(state.known_words, app.state.bank, exclude_ids=state.asked_ids)
    if entry is None:
        return None
    audio_bytes, mime_type = await run_serialized(
        pipeline.synthesize_question, registry.tts, entry.thai
    )
    state.asked_ids.add(entry.id)
    return entry.thai, base64.b64encode(audio_bytes).decode("ascii"), mime_type


@app.post("/conversation/session/start", response_model=SessionStartResponse)
async def session_start(payload: SessionStartRequest) -> SessionStartResponse:
    # Checked before the session exists, so a process that cannot speak
    # answers 501 without first leaving an unusable session in the store.
    _require_loaded(_registry().tts_loaded, "tts")
    state = app.state.sessions.start(payload.known_words)
    # Nobody else can hold this id yet, so there is nothing to race with
    # here; taken anyway to keep `_ask_next_question`'s "caller holds the
    # lock" contract unconditional rather than true at one call site only.
    async with state.lock:
        question = await _ask_next_question(state)
    if question is None:
        # Only reachable with a bank whose matched tier is empty, which
        # `load_bank` already refuses at startup. A 500 rather than an
        # `exhausted` response: a session with no first question at all
        # is a server misconfiguration, not an end-of-content state.
        raise HTTPException(
            status_code=500, detail="the conversation-starter bank offered no question"
        )
    question_text, audio_base64, mime_type = question
    return SessionStartResponse(
        session_id=state.session_id,
        question_text=question_text,
        question_audio_base64=audio_base64,
        question_audio_mime_type=mime_type,
    )


@app.post("/conversation/session/{session_id}/judge", response_model=JudgeResponse)
async def session_judge(session_id: str, payload: JudgeRequest) -> JudgeResponse:
    state = _require_session(session_id)
    # No session lock here, unlike `/start` and `/next`: this appends one
    # turn to `history` and reads nothing back, so there is no
    # read-modify-write window for a second call to land inside. Taking
    # the lock would only make a slow judge call block the `/next` that
    # follows it.
    response = await run_serialized(_judge_pipeline, payload)
    state.history.append(
        Turn(
            question_text=payload.question_text,
            transcript=response.transcript,
            verdict=response.verdict,
            feedback_en=response.feedback_en,
        )
    )
    return response


@app.post("/conversation/session/{session_id}/next", response_model=NextQuestionResponse)
async def session_next(session_id: str) -> NextQuestionResponse:
    state = _require_session(session_id)
    async with state.lock:
        question = await _ask_next_question(state)
    if question is None:
        return NextQuestionResponse(exhausted=True)
    question_text, audio_base64, mime_type = question
    return NextQuestionResponse(
        question_text=question_text,
        question_audio_base64=audio_base64,
        question_audio_mime_type=mime_type,
    )
