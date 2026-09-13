# Conversation practice backend — HTTP API contract

This is the contract between the frontend (`src/`, Vite dev server on
`http://localhost:5173`) and the new local backend (`backend/`,
uvicorn on `http://127.0.0.1:8000`) added by
`plans/ai-conversation-practice/`. It is authoritative: task 1.2 builds
the backend side against it, task 1.3 builds the frontend side against
it, and neither diverges from it silently — a task that wants to
change a field name edits this document and both consumers in the same
change.

The backend is local-only: single-process, single-GPU, synchronous per
request. It is never deployed alongside the app's static GitHub Pages
build, which cannot reach `localhost` and must show a clear "backend
not running" state instead of hanging or failing silently — unless the
learner has pointed the app at a reachable backend on another device
(see "Reaching it from another device" below).

## Bind address and CORS

- uvicorn binds `127.0.0.1` by default. Every documented run command
  uses `--host 127.0.0.1` unless the learner deliberately opts into LAN
  access (below) — this backend drives a local GPU with **no
  authentication**, so its reachability is the whole security boundary.
- Cross-origin requests are restricted to an explicit allowlist
  (`http://localhost:5173`, `http://127.0.0.1:5173` — Vite's dev
  server, plus whatever origins `CONVERSATION_ALLOWED_ORIGINS` adds),
  configured via `CORSMiddleware` in `backend/app/main.py`. **Never
  `allow_origins=["*"]`** — a wildcard would let any page the user
  happens to have open in the same browser call this endpoint. Task 1.4
  added its Playwright e2e origin to this same allowlist.
- **CORS is not an access-control mechanism against a direct request**
  (curl, another process, a non-browser client) — it only restricts
  what a *browser tab* is allowed to read back cross-origin. Once the
  bind address makes the port reachable at all, anything that can
  address it can call every route, allowlist or not.

## Reaching it from another device (e.g. a phone on the same LAN)

An explicit, per-run opt-in — never the default:

```
CONVERSATION_ALLOWED_ORIGINS="https://your-deployed-pwa.example" \
  uv run --project backend uvicorn app.main:app --host 0.0.0.0 --reload
```

`--host 0.0.0.0` binds every network interface instead of only the
loopback one; `CONVERSATION_ALLOWED_ORIGINS` (comma-separated) adds the
phone's actual origin to the CORS allowlist. The frontend's own
Settings page holds the corresponding "Conversation backend URL"
field (`src/infrastructure/conversation/HttpConversationPracticeClient.ts`),
which a learner points at `http://<the backend machine's LAN IP>:8000`.

This closes no security gap by itself — see the CORS caveat above —
and is appropriate only on a network the user trusts. It is the first
step of a two-step plan: a private tunnel (Tailscale, Cloudflare
Tunnel) is the intended way to reach the backend from outside the LAN,
not opening the bind address to the public internet.

## Concurrency

Route handlers are `async def`. The three model calls (STT, judge LLM,
TTS) are serialized behind one module-level `asyncio.Lock`
(`app.main.MODEL_LOCK`, used via `app.main.run_serialized`), held only
around the model call itself — never around a whole request — so
`/health` keeps answering while a judge call is in flight, and two
overlapping requests never hit the GPU at the same time.

This is not the only lock from phase 3 onward: each conversation session
also holds its own (see *Conversation sessions* below), taken around the
session's own state and always *outside* `MODEL_LOCK`, never the
reverse.

## Audio encoding

Audio is carried as base64 inside a JSON body, paired with the MIME
type it was actually encoded as — never assumed to be WAV. The
browser's `MediaRecorder` (via `useMicRecorder`) has no WAV output
mode; Chromium emits `audio/webm;codecs=opus`. The backend decodes
whatever MIME type it's given via `faster-whisper`'s own decoder, never
the stdlib `wave` module.

## Endpoints

### `GET /health`

No request body.

Response `200`:

```json
{
  "status": "ok",
  "models_loaded": {
    "whisper": false,
    "judge": false,
    "tts": false
  }
}
```

Each `models_loaded` value starts `false` and becomes `true`
independently as that model finishes loading at backend startup — a
per-model shape, not one aggregate boolean, so a slow cold start can
say *which* model is still loading. This endpoint is fully implemented
from task 1.1 onward, before any model-loading code exists (all three
values are `false` until task 1.2 adds real loading).

Every other endpoint is session-scoped (below) — phase 1/2 originally
shipped standalone `POST /conversation/opening` and
`POST /conversation/judge` endpoints for a single fixed exchange, but
once the session endpoints existed those had no remaining caller
(task 3.3 switched `ConversationPracticePage` to the session endpoints
exclusively) and were removed (task 3.4), along with the tests in
`backend/tests/` that had exercised them directly.

## Conversation sessions (phase 3)

A session is one multi-turn conversation: several question / spoken
reply / verdict exchanges in a row, each new question drawn from the
bank and never one this session has already asked.

All session state is **in this process's memory only** — `app/session.py`
— and never persisted. A backend restart loses an in-progress
conversation; it never loses SRS state, which is entirely browser-side.
The store is **bounded** (`MAX_SESSIONS = 500`) and drops the oldest
session when a new one pushes it over. There is **no time-based
expiry**: an evicted id and an id that never existed are the same
`404`, so the frontend has no third state to handle.

`session_id` is server-generated and opaque (a `uuid4` hex). It is
never derived from the learner's snapshot: two learners — or one
learner starting twice — can hold an identical snapshot, and a
content-derived key would collide their histories.

### `POST /conversation/session/start`

Request body:

```json
{
  "known_words": ["สวัสดี", "ขอบคุณ", "..."]
}
```

`known_words` is the learner's own known-vocabulary snapshot — every
Thai word their SRS state already counts as learned
(`VocabularyLessonService.getLearnedEntries()` on the frontend), sent
once at session start rather than cached server-side or re-sent per
turn. It is a **required field, always an array** — a learner with no
learned words yet sends `known_words: []`, never an omitted field.

There is no separate "vocabulary/grammar snapshot" shape, and no
`known_grammar_ids` field: nothing in this plan reads a grammar-id list
back. The snapshot is **frozen for the session's life** — re-reading it
mid-session could move the matched tier under the learner and make
"already asked" meaningless.

Response `200`:

```json
{
  "session_id": "b3f1c0a24d7e4a5f9c8e1d2b3a4f5061",
  "question_text": "สบายดีไหม",
  "question_audio_base64": "<base64-encoded audio bytes>",
  "question_audio_mime_type": "audio/wav"
}
```

The question is drawn from the pre-generated, filtered content bank,
tiered by vocabulary size (task 2.2/2.3) and picked to match
`known_words`. `question_audio_mime_type` is whatever MIME type the
backend actually encoded the synthesized audio as. A missing or
malformed body (e.g. no `known_words` field) is `422` (Pydantic
validation, no custom logic).

### `POST /conversation/session/{session_id}/judge`

Request body:

```json
{
  "question_text": "สบายดีไหม",
  "reply_audio_base64": "<base64-encoded audio bytes>",
  "reply_audio_mime_type": "audio/webm;codecs=opus"
}
```

All three fields are required; a missing or malformed body is `422`
(FastAPI's own Pydantic validation, no custom logic) — checked before
the handler body runs, so this applies even for an unrecognized
`session_id`.

Response `200`:

```json
{
  "transcript": "สบายดีค่ะ",
  "verdict": "pass",
  "feedback_en": "Correct — a natural, on-topic reply."
}
```

`verdict` is one of three states:

- `"pass"` — the learner's reply is an acceptable answer.
- `"fail"` — the learner's reply is not an acceptable answer.
- `"unscored"` — a **system-side** failure (unparseable judge output,
  a transcription error), distinct from a learner's wrong answer.
  Never returned for a learner's actual mistake, so a backend hiccup
  is never recorded as one (phase 3's tally keeps it a separate
  bucket, never folded into `"fail"`).

The judged turn is recorded into the session's history. An
unrecognized `session_id` is `404` (see *Error shapes* below).

### `POST /conversation/session/{session_id}/next`

No request body.

Response `200`, a question:

```json
{
  "exhausted": false,
  "question_text": "ไปไหนมา",
  "question_audio_base64": "<base64-encoded audio bytes>",
  "question_audio_mime_type": "audio/wav"
}
```

Response `200`, no content left:

```json
{
  "exhausted": true,
  "question_text": null,
  "question_audio_base64": null,
  "question_audio_mime_type": null
}
```

`exhausted` is a **named field, not an empty `200` and not an error**.
The bank can be smaller than a session is long, so "this tier has no
unasked entry left" is a normal end to a conversation and must stay
distinguishable from "selecting an entry went wrong" — the same
never-asked / empty / failed distinction the judge endpoint's
`"unscored"` verdict exists for. The endpoint stays `exhausted: true`
on every further call; it never wraps around to a repeat.

Selection excludes the ids this session has already asked
(`app.bank.select_entry`'s `exclude_ids`), narrowing the *candidates*
within the learner's matched tier and never the tier itself — a session
stays at one difficulty rather than sliding down to easier entries as
it goes on.

Two overlapping `/next` calls on one session (a double-click, or React
StrictMode double-invoking an effect in development) can never both be
served the same question, nor collapse into a single advance: the
select → synthesize → record sequence is held under that session's own
`asyncio.Lock`. The lock is **per session**, so unrelated sessions still
run concurrently; only the three models remain globally serialized
behind `MODEL_LOCK`.

## Error shapes

- `422 Unprocessable Entity` — FastAPI/Pydantic request validation
  failure (missing/malformed field). Standard FastAPI error body.
- `404 Not Found` — a session endpoint was given a `session_id` this
  process does not hold: unknown, mistyped, evicted under the store's
  size cap, or lost to a restart. One state, never a distinct
  "expired" status, and never a silently created new session.
- `501 Not Implemented` — a model this call needs (`tts` for
  `/session/start`; `whisper`/`judge` for `/session/{id}/judge`) has
  not finished loading in this process yet. Transient at real startup
  (task 1.2's models load once, at `lifespan`); permanent only in a
  non-GPU test process that never loads them.
- Any other server-side failure surfaces as a `5xx` with a plain-text
  or JSON detail message; the frontend's job (task 1.3) is to render a
  clear "backend not running / request failed" state, never hang.
