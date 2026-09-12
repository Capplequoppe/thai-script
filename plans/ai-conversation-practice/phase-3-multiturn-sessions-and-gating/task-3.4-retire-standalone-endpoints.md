---
doc_type: reference
title: "Task 3.4 — Retire the standalone opening/judge endpoints"
description: Actually deliver task 3.1's own claim to remove /conversation/opening and /conversation/judge, by migrating the two backend test files that were the reason it didn't happen onto the session endpoints first.
covers:
  - backend/app/main.py
  - backend/app/schemas.py
  - backend/tests/test_health.py
  - backend/tests/test_pipeline.py
  - backend/tests/conftest.py
  - docs/conversation-backend-api.md
  - src/domain/ports/ConversationPracticePort.ts
status: draft
task_id: "3.4"
task_status: complete
depends_on: ["3.1", "3.3"]
size: medium
verify:
  - uv run --project backend pytest backend/tests -v -m "not gpu"
  - uv run --project backend ruff check backend
ac_enforcement:
  - "AC1 -> backend/tests/test_health.py and test_pipeline.py's HTTP-level cases (422 validation, CORS preflight, concurrency/health-responsiveness, 501-not-loaded, opening/judge happy paths, the two real-model gpu cases) all call the session endpoints instead of the retired standalone pair, and pass non-gpu"
  - "AC2 -> POST /conversation/opening, the GET /conversation/opening back-compat shim, and POST /conversation/judge no longer exist in backend/app/main.py - confirmed by their absence (a request to them 404s, unrecorded by any route), not by a still-passing test against a removed route"
  - "AC3 -> OpeningRequest/OpeningResponse are removed from backend/app/schemas.py once nothing constructs them - dead schema classes are not left behind as harmless-looking leftovers"
  - "AC4 -> docs/conversation-backend-api.md documents only the routes that exist: the standalone endpoints' sections and the forward-looking 'Retiring' section are removed, and every session-endpoint description that used to say 'exactly /conversation/opening's shape' states its own shape directly"
  - "AC5 -> the full e2e suite (npm run test:e2e -- --project=conversation-practice) still passes 10/10 - the frontend never called these routes (task 3.3), so their removal changes nothing it can observe, and this is the proof of that"
generated: {by: claude-sonnet-5/agent, at: 2026-09-12}
profile_version: 1
weight_votes:
  - "author -> 5"
---

# Task 3.4 — Retire the standalone opening/judge endpoints

## Description

Task 3.1's own Description and Architectural Decision commit to
removing `/conversation/opening` (both the documented `POST` and the
undocumented `GET` back-compat shim) and `/conversation/judge` from
`backend/app/main.py` once the session endpoints exist. It did not
happen: `backend/tests/test_health.py` and
`backend/tests/test_pipeline.py` — task 1.1/1.2's files, outside task
3.1's own `covers` — call these routes directly to prove the scaffold
contract (422 validation, CORS, concurrency, 501-when-unloaded) and the
real pipeline's HTTP-level behavior, and task 3.1 correctly declined to
edit files outside its scope to make room for their removal. Decision
`bcb3cf9c` (phase 3 review) confirmed this independently and
recommended exactly this task.

**Migrate the tests first, then delete the routes — not the reverse.**
Every HTTP-level case in both files that hit `/conversation/opening` or
`/conversation/judge` now hits the session-scoped equivalent instead:

- Cases that only assert body-validation (`422`) or CORS-preflight
  behavior don't need a real session at all — FastAPI validates the
  body and CORSMiddleware answers a preflight before a route handler's
  own code (including the session lookup) ever runs, so a placeholder
  `session_id` in the URL is enough.
- Cases that need a *real* session (the 200 happy-path, the 501s, the
  concurrency probe) call `POST /conversation/session/start` first and
  use its `session_id`. `session_start` only requires `tts_loaded`, so
  a `tts_only_client` fixture (`tts` faked, `whisper`/`judge` left
  unloaded) reaches the same "judge on a real session with the judge
  models unloaded → 501" state the retired endpoint's own
  not-yet-implemented case proved, without needing whisper/judge faked
  too.
- The two `gpu`-marked cases (`test_opening_speaks_the_selected_question_as_decodable_audio`,
  `test_judging_a_real_spoken_reply_parses_into_a_valid_shape`,
  `test_true_silence_through_real_whisper_is_unscored_as_empty_transcript`)
  migrate the same way, against `gpu_client`.

**Then the routes come out for real**: `POST`/`GET /conversation/opening`
and `POST /conversation/judge` are deleted from `main.py`, along with
the now-dead `_opening_pipeline` helper (only those two routes ever
called it) and the now-dead `OpeningRequest`/`OpeningResponse` schema
classes (nothing else constructs them). `_judge_pipeline` stays — it is
`session_judge`'s own shared implementation now, not dead code, just a
docstring update to stop describing a route that no longer exists.

**The docs come out too.** `docs/conversation-backend-api.md`'s
sections for the two standalone endpoints, and its forward-looking
"Retiring" section (whose entire premise — that they're still live for
now — becomes false), are removed. Every session-endpoint description
that previously said "exactly `/conversation/opening`'s shape" as a
shorthand now states its own shape directly, since the thing it was
pointing at no longer exists to be dereferenced.

## Acceptance Criteria

- AC1: Every migrated backend test passes against the session
  endpoints, non-GPU suite green.
- AC2: The two standalone routes are gone from `main.py`, not merely
  unused.
- AC3: The schema classes only they used are gone too.
- AC4: The API doc describes only what exists.
- AC5: The full e2e suite is unaffected (still 10/10) — the frontend
  never called these routes.

## Architectural Decision

**Migrate first, delete second — never the reverse.** Deleting the
routes before the tests that called them were migrated would have left
the backend suite red with no way to make it green again short of
reverting; migrating first means every commit in between stays
buildable.

**A `tts_only_client` fixture, not a third full-registry variant.** The
retired standalone judge endpoint's "not yet implemented" case needed
whisper/judge unloaded with no session concept at all. The session
endpoint's equivalent needs a session to exist (requiring `tts`) while
whisper/judge stay unloaded — a genuinely different fixture shape task
3.1's own `fake_model_client` (all three faked) and `client` (none
faked) don't cover between them.

**This is new scope this phase did not originally budget for**,
accepted via decision `bcb3cf9c` option B rather than left as the
`bcb3cf9c` option A "documented, deliberate known gap." The dead routes
were low practical risk on a local-only single-user tool, but the
plan's own stated trust-boundary mitigation (retiring surface reachable
by any local origin, per the README's Trust Boundary Inventory) was not
actually in place until this task landed.

## Test Cases

- 422/CORS cases against the session endpoints: same behavior as
  before, no real session needed.
- A real session (tts faked) with whisper/judge unloaded: judge call
  501s, distinct from an unknown-session 404.
- Concurrency probe against a real session: `/health` stays responsive,
  two concurrent judge calls never overlap.
- `fake_model_client`/`gpu_client` happy-path and two-learners-different-questions
  cases: migrated to `session_start`, same assertions.
- The three `gpu`-marked cases: migrated to a started session, same
  assertions (manual verdict note unaffected — it was never about the
  route).
- Full e2e suite: still 10/10.
