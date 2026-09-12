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
not running" state instead of hanging or failing silently.

## Bind address and CORS

- uvicorn binds `127.0.0.1` explicitly, **never `0.0.0.0`** — this
  backend drives a local GPU with no authentication and must not be
  reachable from the network. Every documented run command uses
  `--host 127.0.0.1`.
- Cross-origin requests are restricted to an explicit allowlist
  (`http://localhost:5173`, `http://127.0.0.1:5173` — Vite's dev
  server), configured via `CORSMiddleware` in `backend/app/main.py`.
  **Never `allow_origins=["*"]`** — a wildcard would let any page the
  user happens to have open in the same browser call this endpoint.
  Task 1.4 adds its Playwright e2e origin to this same allowlist if it
  differs from the dev server's.

## Concurrency

Route handlers are `async def`. The three model calls (STT, judge LLM,
TTS) are serialized behind one module-level `asyncio.Lock`
(`app.main.MODEL_LOCK`, used via `app.main.run_serialized`), held only
around the model call itself — never around a whole request — so
`/health` keeps answering while a judge call is in flight, and two
overlapping requests never hit the GPU at the same time.

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

### `GET /conversation/opening`

No request body.

Response `200`:

```json
{
  "question_text": "สบายดีไหม",
  "question_audio_base64": "<base64-encoded audio bytes>",
  "question_audio_mime_type": "audio/wav"
}
```

Returns the one fixed opening question for this phase, spoken by the
voice-cloned TTS. `question_audio_mime_type` is whatever MIME type the
backend actually encoded the synthesized audio as (a simple,
non-chunked response — there is exactly one short clip to return in
this phase, no streaming). Placeholder in task 1.1: `501 Not
Implemented`.

### `POST /conversation/judge`

Request body:

```json
{
  "question_text": "สบายดีไหม",
  "reply_audio_base64": "<base64-encoded audio bytes>",
  "reply_audio_mime_type": "audio/webm;codecs=opus"
}
```

All three fields are required; a missing or malformed body is `422`
(FastAPI's own Pydantic validation, no custom logic).

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
  is never recorded as one (relevant once phase 3 tallies verdicts).

Placeholder in task 1.1: well-formed bodies get `501 Not Implemented`;
malformed bodies still get `422` (validation runs before the handler
body).

## Error shapes

- `422 Unprocessable Entity` — FastAPI/Pydantic request validation
  failure (missing/malformed field). Standard FastAPI error body.
- `501 Not Implemented` — endpoint recognized, pipeline not wired yet
  (task 1.1 only; task 1.2 replaces these with real responses).
- Any other server-side failure surfaces as a `5xx` with a plain-text
  or JSON detail message; the frontend's job (task 1.3) is to render a
  clear "backend not running / request failed" state, never hang.
