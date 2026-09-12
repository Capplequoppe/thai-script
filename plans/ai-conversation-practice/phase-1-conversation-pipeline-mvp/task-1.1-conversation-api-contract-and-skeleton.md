---
doc_type: reference
title: "Task 1.1 — Conversation API contract + backend project skeleton"
description: Write down the HTTP contract between the frontend and the new local backend — including CORS, bind address, audio format, and concurrency, all previously-missing decisions a review found would otherwise surface for the first time in task 1.4 — and scaffold a running-but-empty FastAPI project that answers it.
covers:
  - backend/pyproject.toml
  - backend/app/main.py
  - backend/app/schemas.py
  - backend/tests/test_health.py
  - backend/tests/conftest.py
  - docs/conversation-backend-api.md
status: draft
task_id: "1.1"
task_status: complete
depends_on: []
size: medium
verify:
  - uv run --project backend pytest backend/tests/test_health.py -v -m "not gpu"
  - uv run --project backend ruff check backend
ac_enforcement:
  - "AC1 -> uv run --project backend pytest backend/tests/test_health.py, asserting GET /health returns 200 with a fixed per-model shape before any model is loaded"
  - "AC2 -> none — a documentation artifact (docs/conversation-backend-api.md); read for completeness by the phase reviewer, not asserted by a test"
  - "AC3 -> uv run --project backend ruff check backend exits 0 against the scaffolded project, with backend/vendor/ (added in task 1.2) pre-declared as excluded in this task's ruff config so 1.2's vendor drop does not retroactively break this AC"
  - "AC4 -> a case in test_health.py asserting POST /conversation/judge with no request body (or a body missing the required audio field) returns 422, not a 500 or a hang"
  - "AC5 -> a case in test_health.py: an OPTIONS preflight on /conversation/judge from the allowed dev origin (http://localhost:5173) returns the CORS allow-origin header; the same preflight from a foreign Origin header does not"
  - "AC6 -> none - verified by reading backend/app/main.py: uvicorn's bind address is 127.0.0.1, never 0.0.0.0, in every documented run command (CONTEXT.md, this task, task 1.4)"
  - "AC7 -> a non-GPU case in conftest.py/test_health.py using fake model objects: two overlapping requests to a handler wrapping a fake blocking call never execute the fake concurrently (proven by a shared counter/flag the fakes increment and check), and /health responds while one is in flight"
ac_tests:
  - "AC1 -> backend/tests/test_health.py::test_health_before_any_model_is_loaded"
  - "AC2 -> none"
  - "AC3 -> none"
  - "AC4 -> backend/tests/test_health.py::test_judge_missing_required_field_is_422"
  - "AC5 -> backend/tests/test_health.py::test_cors_preflight_rejected_from_foreign_origin"
  - "AC6 -> none"
  - "AC7 -> backend/tests/test_health.py::test_concurrent_judge_calls_never_overlap_and_health_stays_responsive"
red_proof:
  - "AC1 -> Changed HealthResponse's models_loaded to whisper=True in app/main.py's /health handler."
  - "AC4 -> Gave JudgeRequest.reply_audio_base64 a default value (str = \"\") in app/schemas.py, making it optional."
  - "AC5 -> Set ALLOWED_ORIGINS = [\"http://evil.example\"] in app/main.py (the dev origin no longer allowed, and the foreign origin allowed)."
  - "AC7 -> Removed 'async with MODEL_LOCK:' from run_serialized in app/main.py, leaving only the asyncio.to_thread call (no serialization)."
lint:
  before: 3
  after: 3
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 8"
---

# Task 1.1 — Conversation API contract + backend project skeleton

## Description

This is phase 1's seam task. Its only job is to make tasks 1.2 and 1.3
able to run **at the same time without talking to each other** — by the
time this task is done, both the exact HTTP contract and a real running
process answering it (with placeholder/`501 Not Implemented` logic
where the real pipeline will go) must exist. A review of this plan's
first draft found that the browser-facing half of the contract was
under-specified in ways no pre-1.4 test could catch (CORS, audio
format, concurrency) — those are folded in below precisely because they
belong in the seam, not discovered later by the one task meant to
integrate, not diagnose.

**1. Write the contract**, as `docs/conversation-backend-api.md` (this
repo already has a `docs/` directory — this file joins it, alongside
`docs/plans/`). Three endpoints, matching CONTEXT.md's naming:

- `GET /health` — `{ status: "ok", models_loaded: { whisper: bool,
  judge: bool, tts: bool } }`. Every value starts `false` in this task
  (no model loading exists yet) and each becomes `true` independently
  as task 1.2's startup loads that model — a per-model shape, not one
  aggregate boolean, so a slow cold start can say *which* model is
  still loading rather than just "not ready" (needed by task 1.4's
  readiness poll).
- `GET /conversation/opening` — no request body. Response:
  `{ question_text: string, question_audio_base64: string,
  question_audio_mime_type: string }` (base64-encoded audio plus the
  MIME type it was actually encoded as — simplest thing that works for
  a single short clip; do not build a streaming/chunked response for
  this one fixed question).
- `POST /conversation/judge` — request body
  `{ question_text: string, reply_audio_base64: string,
  reply_audio_mime_type: string }`. **The MIME type is not a formality**:
  the browser's `MediaRecorder` (which `useMicRecorder` wraps) has no
  WAV output mode — Chromium emits `audio/webm;codecs=opus` — so the
  backend must decode whatever the browser actually sent via
  `faster-whisper`'s own decoder, never assume WAV or reach for the
  stdlib `wave` module on this field. Response:
  `{ transcript: string, verdict: "pass" | "fail" | "unscored",
  feedback_en: string }`. `"unscored"` is a **third verdict state**,
  distinct from a learner's wrong answer — task 1.2 returns it for a
  system-side failure (unparseable judge output, a transcription error),
  never `"fail"`, so a backend hiccup is never recorded as a learner's
  mistake (task 3.3's tally excludes it). A malformed/missing body is a
  `422` (FastAPI's own Pydantic validation, not custom logic) — this is
  what AC4 proves.

Every field name above is final for this phase — 1.2 and 1.3 both build
against these exact names; a task that wants to change one edits this
file and both consumers in the same change; it does not diverge them
silently.

**CORS and bind address** (AC5, AC6): the frontend (`http://localhost:5173`)
and this backend (`http://localhost:8000`) are different origins — every
`fetch` from the page is cross-origin, and a JSON `POST` triggers a
preflight `OPTIONS` FastAPI answers `405` without configuration. Add
`CORSMiddleware` with an **explicit origin allowlist**
(`http://localhost:5173`; add whatever origin the Playwright e2e run
uses in task 1.4), **never `allow_origins=["*"]`** — a wildcard makes an
unauthenticated, GPU-driving local endpoint callable by any page the
user happens to have open. Bind uvicorn to `127.0.0.1` explicitly in
every run command this plan documents (CONTEXT.md, this task's local-run
instructions, task 1.4's `webServer` entry) — never `0.0.0.0`.

**Concurrency** (AC7): CONTEXT.md's "synchronous per request" is a
decision this task makes operative, not FastAPI's default. Declare
route handlers `async def`, and serialize the three model calls behind
one module-level `asyncio.Lock` (acquired in `backend/app/pipeline.py`,
task 1.2, around whichever call is in flight) — so `/health` keeps
answering while a judge call is running, and two overlapping requests
never hit the GPU at the same time. This task proves the mechanism
exists using fake blocking calls (AC7); task 1.2 is where the real
model calls acquire the lock.

**2. Scaffold the backend project.** `backend/pyproject.toml` (a `uv`-
managed project — `uv init` inside `backend/`, then add `fastapi`,
`uvicorn`, `pytest`, `ruff`, `httpx` as dependencies; httpx is for
`fastapi.testclient.TestClient`, not for calling anything external).
Pin `[tool.pytest.ini_options]` with `pythonpath = ["."]` and
`testpaths = ["tests"]` so `from app.main import app` resolves
regardless of the invocation's working directory, and register a `gpu`
marker (`markers = ["gpu: requires a real GPU and model weights"]`) —
every later task's `-m "not gpu"` depends on this marker existing.
Configure `ruff`'s `extend-exclude = ["vendor"]` now, before task 1.2
adds `backend/vendor/flowtts` — a third-party source drop is not
expected to pass this repo's lint rules, and AC3 must stay honest once
it lands. `backend/app/main.py`: a FastAPI app with the three routes
above wired to Pydantic models in `backend/app/schemas.py`, each
handler's body `raise HTTPException(501, "not implemented")` except
`/health`, which is fully real (task 1.2 replaces the 501s, never the
shapes). Run locally with `uv run --project backend uvicorn app.main:app
--host 127.0.0.1 --reload` from `backend/`.

**3. `backend/tests/test_health.py`** — `/health`'s fixed shape, the
CORS preflight cases, and `/conversation/judge` with an invalid/missing
body returning `422`. Do not test the `501` endpoints' happy path here
— there is no happy path yet; that's 1.2's job. `backend/tests/conftest.py`
gets the fake blocking calls AC7's concurrency test uses — the same
fixture file task 1.2 extends with fake models.

## Acceptance Criteria

- AC1: `GET /health` returns `200` with `{status: "ok", models_loaded:
  {whisper: false, judge: false, tts: false}}` before any model-loading
  code exists.
- AC2: `docs/conversation-backend-api.md` documents all three endpoints'
  exact request/response shapes, matching this task's description
  verbatim.
- AC3: The scaffolded project (routes present, bodies mostly `501`,
  `vendor/` pre-excluded) passes `ruff check` with zero findings.
- AC4: `POST /conversation/judge` with a missing/malformed body returns
  `422`, never `500` or a hang.
- AC5: A CORS preflight from the allowed dev origin succeeds; from a
  foreign origin, it does not.
- AC6: uvicorn binds `127.0.0.1` in every documented run command, never
  `0.0.0.0`.
- AC7: Two overlapping requests to a fake blocking call never execute
  concurrently; `/health` stays responsive while one is in flight.

## Architectural Decision

**Base64-encoded audio (with its MIME type) in a JSON body, not
multipart/binary upload or a WebSocket.** Rejected multipart: no
meaningful benefit for a single short clip and it complicates the
contract with a second content-type per endpoint. Rejected a
WebSocket/streaming protocol: one question and one reply per exchange,
not a continuous stream (real streaming STT was already rejected in
CONTEXT.md for the same class of reason). Revisit only if phase 3's
multi-turn sessions need lower per-turn latency than a JSON round trip
provides, which nothing measured in the spike suggests.

**A written contract doc, not generated OpenAPI.** Nothing in this task
depends on 1.3 (TypeScript, no shared codegen pipeline) consuming
machine-readable OpenAPI — the contract needs to be *read* by a person
writing a `fetch()` call. Revisit if a third consumer ever makes
hand-copying the bottleneck.

**A MIME-type companion field, not client-side transcoding to WAV.**
The browser cannot produce WAV from `MediaRecorder` without adding a
real transcode step (`AudioContext.decodeAudioData` → PCM → WAV) to
task 1.3; `faster-whisper` already decodes webm/opus natively, so
carrying the MIME type and decoding on the backend is strictly less
work for an equivalent result. Revisit only if a future STT engine
lacks that native decode.

**An explicit CORS allowlist and an `asyncio.Lock` around model calls,
decided here rather than discovered in task 1.4.** Both are properties
of the contract every later task builds against — a review of this
plan's first draft found that neither was decided anywhere, and that
the plan's own test topology (in-process `TestClient` for 1.2, mocked
`fetch` for 1.3) meant neither failure mode could surface before the
one human-gated integration task, at which point a CORS block renders
identically to "backend not running" — silently wrong, not loudly
broken.

## Test Cases

- `GET /health` before any model is loaded: `200`, fixed per-model
  shape.
- `POST /conversation/judge` with no body: `422`.
- `POST /conversation/judge` with a body missing `reply_audio_base64`:
  `422`.
- `GET /conversation/opening`, `POST /conversation/judge` with a
  well-formed body: both currently `501`.
- CORS preflight from `http://localhost:5173`: allowed. From
  `http://evil.example`: not allowed.
- Two overlapping fake-blocking-call requests: never run concurrently;
  `/health` answers during one.
- `ruff check backend`: zero findings, `vendor/` excluded.
