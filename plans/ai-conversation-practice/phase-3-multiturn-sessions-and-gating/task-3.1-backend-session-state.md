---
doc_type: reference
title: "Task 3.1 — Backend session state + a continue endpoint"
description: In-memory, per-session conversation history so the backend can ask a new bank question that hasn't already been asked this session, and judge a reply with the running conversation as context — including the concurrency guard a double `/next` call needs and a clear retirement note for the endpoints this supersedes.
covers:
  - backend/app/session.py
  - backend/app/main.py
  - backend/app/pipeline.py
  - backend/app/bank.py
  - backend/tests/test_session.py
  - docs/conversation-backend-api.md
status: draft
task_id: "3.1"
task_status: complete
depends_on: ["1.2"]
size: large
verify:
  - uv run --project backend pytest backend/tests -v -m "not gpu"
ac_enforcement:
  - "AC1 -> a non-GPU test in test_session.py: POST /conversation/session/start (new endpoint) with a known-vocabulary snapshot ({known_words: string[]}, same POST-body shape task 2.1 established) returns a session_id and a first question; a second call to POST /conversation/session/{id}/next after a judged turn returns a DIFFERENT question than the first, drawn from the same tier's bank entries via select_entry's exclude_ids parameter, never repeating one already asked this session"
  - "AC2 -> a non-GPU test: after every entry in the matched tier has been asked once, a further /next call returns an explicit exhausted: true response rather than repeating an entry or erroring - the bank can be smaller than a full session"
  - "AC3 -> a non-GPU test: an unknown session_id on /next or /judge returns 404, not a 500 or a silently-created new session; a session evicted under AC5's bound (see below) returns the same 404, not a distinct 'expired' status the frontend would have to handle separately - there is no time-based expiry in this design, only a count-based bound"
  - "AC4 -> a non-GPU test asserting the session store never touches disk across a full start/judge/next lifecycle (monkeypatch builtins.open, or an equivalent filesystem-write guard, to fail the test if called) - a genuine in-memory-only proof, replacing a first draft's AC4 that only proved a freshly-constructed empty dict has no keys in it, which was true by construction and proved nothing about the real store"
  - "AC5 -> a non-GPU test: two concurrent /next calls against the same session_id (e.g. asyncio.gather of two requests, simulating a double-click or a React StrictMode double-invoke) never both return the same question, and never both succeed in advancing the asked-set past a single entry for one logical 'next' - protected by the same async def + asyncio.Lock pattern task 1.1 required for the judge endpoint, scoped per-session so unrelated sessions still run concurrently"
  - "AC6 -> a non-GPU test: the session store enforces a maximum size (e.g. 500 concurrent sessions); starting one more than the cap evicts the oldest session first, and the evicted session's id then behaves exactly like AC3's unknown-id case"
ac_tests:
  - "AC1 -> backend/tests/test_session.py::test_next_after_a_judged_turn_asks_a_different_question"
  - "AC2 -> backend/tests/test_session.py::test_exhausting_the_tier_returns_exhausted_rather_than_repeating"
  - "AC3 -> backend/tests/test_session.py::test_next_on_an_unknown_session_is_404"
  - "AC4 -> backend/tests/test_session.py::test_a_full_lifecycle_never_writes_to_disk"
  - "AC5 -> backend/tests/test_session.py::test_concurrent_next_calls_never_serve_the_same_question"
  - "AC6 -> backend/tests/test_session.py::test_an_evicted_session_behaves_exactly_like_an_unknown_one"
red_proof:
  - "AC1 -> In backend/app/bank.py, made select_entry ignore its exclude_ids parameter entirely: replaced the filtered comprehension with `candidates = list(_matched_tier(known, bank))`. /next… [see red-proofs/]"
  - "AC2 -> In backend/app/bank.py, replaced `if not candidates: return None` with a silent wrap-around: `if not candidates: candidates = list(_matched_tier(known, bank))` — the exact repeat-in… [see red-proofs/]"
  - "AC3 -> In backend/app/session.py, made SessionStore.get silently create a session for an unrecognized id instead of returning None. /next then answered 200 with a real question for an id t… [see red-proofs/]"
  - "AC4 -> In backend/app/session.py, made SessionStore.start append the new session id to /tmp/mutant-sessions.log — a one-line persistence of session state. Verified against red-proofs/3.1.m… [see red-proofs/]"
  - "AC5 -> In backend/app/main.py, removed the per-session lock from the /next handler (`async with state.lock:` dropped, body dedented). Both threads then read the same asked-set across the a… [see red-proofs/]"
  - "AC6 -> In backend/app/session.py, deleted the eviction loop from SessionStore.start. With a cap-of-1 store the first session survived a second start, so its id answered 200 instead of beha… [see red-proofs/]"
lint:
  before: 5
  after: 5
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 8"
---

# Task 3.1 — Backend session state + a continue endpoint

## Description

`backend/app/session.py` — an in-memory, size-bounded store (a
`dict[str, SessionState]` with a simple oldest-first eviction once a
cap is hit — AC6) on `app.state` (same "load/init once at startup,
never per-request" pattern as models and the bank), `SessionState`
holding a `session_id` (server-generated, e.g. `uuid4`), the
known-vocabulary snapshot it was started with, the set of bank entry
ids already asked, and its own `asyncio.Lock` (AC5). New endpoints,
added to `docs/conversation-backend-api.md` alongside the existing
ones:

- `POST /conversation/session/start` — body: `{known_words: string[]}`,
  the exact POST-body shape task 2.1 already established (not a
  separate "vocabulary/grammar snapshot" shape — nothing in this plan
  reads a grammar-id list back, per task 2.1's own decision). Response:
  `{session_id, question_text, question_audio_base64}` — same content
  shape as phase 2's `/conversation/opening`, now inside a session.
- `POST /conversation/session/{id}/judge` — body: the reply audio (same
  shape as task 1.1's `/conversation/judge`). Response: same
  `{transcript, verdict, feedback_en}` shape, recorded into the
  session's history.
- `POST /conversation/session/{id}/next` — no body. Response:
  `{question_text, question_audio_base64}` **or** `{exhausted: true}`
  once the matched tier's every entry has been asked this session
  (AC2 — a real, named state, not an error). Guarded by the session's
  own lock (AC5) so two overlapping calls can't both consume the same
  "next" slot.

`backend/app/bank.py`'s `select_entry` (task 2.3) gains an
`exclude_ids: set[str]` parameter so session.py can ask it for
"anything in this tier not already asked" via the same entry-level
containment logic task 2.3 built, rather than duplicating the
tier-matching rule here.

**Retiring phase 1/2's standalone endpoints.** Once sessions exist,
`/conversation/opening` and `/conversation/judge` (tasks 1.1/1.2, POST
per task 2.1) have no remaining caller this plan builds — task 3.3
switches `ConversationPracticePage` to the session endpoints
exclusively, and a single fixed exchange with no session concept
stops being a state this app needs to support once phase 3 ships. This
task removes their route handlers from `backend/app/main.py` and their
entries from `docs/conversation-backend-api.md` (their underlying
logic isn't wasted — `synthesize_opening`/`select_entry`/the judge
pipeline are exactly what the new session endpoints call). Retiring the
corresponding frontend port methods and the phase-1/2 e2e assertions
that exercise them directly is task 3.3's responsibility, tracked there
— this task only removes the backend surface so the two layers change
together in one PR rather than leaving a dead backend route live for a
release.

## Acceptance Criteria

- AC1: A session can be started and advanced, with `/next` never
  repeating a question already asked in that session.
- AC2: Exhausting a tier's bank surfaces an explicit `exhausted: true`
  state, not an error or a silent repeat.
- AC3: An invalid or evicted session id is a `404`, never a silent new
  session, a `500`, or a distinct "expired" response the frontend must
  special-case.
- AC4: The session store is genuinely in-memory-only across a real
  lifecycle, not merely by an unfalsifiable construction.
- AC5: Concurrent `/next` calls against one session can't double-serve
  or double-advance.
- AC6: The store is bounded in size, with oldest-first eviction.

## Architectural Decision

**A server-generated opaque session id, not the learner's known-word
snapshot itself used as an implicit key.** Two learners (or the same
learner starting twice) could share an identical snapshot; an id keyed
on content would collide their histories. A random id per session-start
call keeps sessions genuinely independent regardless of vocabulary
overlap.

**Exhaustion is a named response field, not an exception or an empty
`200`.** An empty `200` at this endpoint would be indistinguishable
from "no more content" *by design* versus "something went wrong
selecting an entry" — the same never-asked/empty/failed distinction
CONTEXT.md and task 1.2 already established for the judge endpoint,
applied here too.

**No time-based expiry — a count bound with oldest-first eviction
instead.** A first draft's AC3 referred to an "expired" session with no
mechanism anywhere in the design that would ever produce one — pure
unimplemented vocabulary. Real unbounded growth is a memory-leak risk
(SA-23), not a staleness one, so the actual fix is a size cap (AC6);
an evicted session is indistinguishable from an unknown one to the
client, which needs no new state to handle it.

**A per-session `asyncio.Lock`, not a reliance on FastAPI's own request
scheduling.** Task 1.1 already established that `async def` handlers
need an explicit lock to be genuinely serialized per model-bound
operation; a session's asked-set mutation has the identical hazard —
two `/next` calls racing (a double-click, or React StrictMode's
double-invoke of effects in development) could otherwise both read the
same asked-set before either writes, and both return the same "new"
question. Scoping the lock per-session (not one global lock across all
sessions) keeps unrelated learners' sessions from serializing against
each other.

**Retire, don't leave parallel, the phase-1/2 endpoints.** A plan
review flagged that shipping session endpoints alongside still-live
standalone ones is a maintenance and testing burden with no user who
needs both — `ConversationPracticePage` is a single page with one
flow, not two products. Removing the old routes here, in the same task
that adds their replacement, prevents the two from silently drifting
out of sync (e.g., a judge-pipeline bugfix applied to one and not the
other).

## Test Cases

- Start a session, judge a turn, request `/next`: a new, distinct
  question.
- Exhaust a small fixture tier: `exhausted: true`, not a repeat or an
  error.
- Unknown session id: `404` on both `/next` and `/judge`.
- A full start/judge/next lifecycle with disk writes guarded against:
  no filesystem access occurs.
- Two concurrent `/next` calls on the same session: never the same
  question twice, never a double-advance.
- Starting past the store's size cap: oldest session evicted, then
  behaves as an unknown id.
- `/conversation/opening` and `/conversation/judge` (phase 1/2 routes):
  removed — confirmed by their absence in `main.py` and the API doc,
  not by a still-passing test against a route that no longer exists.
