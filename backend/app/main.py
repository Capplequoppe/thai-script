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
    """Load all three models once, before the server accepts requests.

    Tests pre-seed `app.state.models` (with fakes, or empty) before
    startup; a pre-seeded registry is used as-is and nothing loads —
    that is the whole non-GPU test mechanism, so never "helpfully" load
    missing models here when a registry already exists.
    """
    if getattr(app.state, "models", None) is None:
        app.state.models = ModelRegistry()
        await load_models_into(app.state.models)
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

    `payload.known_words` is accepted and validated here (task 2.1) but not
    yet read — the bank and tier-selection logic that consumes it is task
    2.2/2.3's; this phase still always synthesizes the one fixed question.
    """
    registry = _registry()
    _require_loaded(registry.tts_loaded, "tts")
    question_text, audio_bytes, mime_type = pipeline.synthesize_opening(registry.tts)
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
