---
doc_type: reference
title: "Task 2.1 — Frontend sends a known-vocabulary snapshot"
description: Change /conversation/opening from a bodyless GET to a POST carrying the learner's own known-word list, sourced from the app's existing SRS data — corrected from a first draft whose GET+query-param design underestimated the payload size by roughly 9x.
covers:
  - docs/conversation-backend-api.md
  - backend/app/main.py
  - backend/app/schemas.py
  - src/domain/conversation/types.ts
  - src/domain/ports/ConversationPracticePort.ts
  - src/infrastructure/conversation/HttpConversationPracticeClient.ts
  - src/infrastructure/conversation/HttpConversationPracticeClient.test.ts
  - src/presentation/pages/ConversationPracticePage.tsx
  - src/presentation/pages/ConversationPracticePage.test.tsx
status: draft
task_id: "2.1"
task_status: pending
depends_on: ["1.2", "1.3"]
size: medium
verify:
  - npm test -- src/domain/conversation src/infrastructure/conversation src/presentation/pages/ConversationPracticePage
  - npx tsc -b
  - uv run --project backend pytest backend/tests -v -m "not gpu"
ac_enforcement:
  - "AC1 -> a case in HttpConversationPracticeClient.test.ts: getOpening(knownWords) POSTs a JSON body {known_words: string[]} to /conversation/opening, and a backend non-GPU case asserts the route accepts a realistic 600-word body without a 431/connection reset"
  - "AC2 -> a case in ConversationPracticePage.test.tsx: the page calls getOpening with the REAL learner's known-word list, sourced from VocabularyLessonService.getLearnedEntries() (via AppContext, not a hardcoded/fixture list), proven by asserting the exact word set a seeded harness produces reaches the stub port call"
  - "AC3 -> a case: a learner with zero learned words still calls getOpening with an empty array, never omits the field or crashes - the empty-vocabulary case is a real, testable state, not an assumed-never-happens one"
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 5"
---

# Task 2.1 — Frontend sends a known-vocabulary snapshot

## Description

Change `GET /conversation/opening` (task 1.1's contract, task 1.2's
handler) to `POST /conversation/opening` carrying the learner's known
Thai words in a JSON body, and have `ConversationPracticePage` actually
source and send them from the app's own existing SRS data
(`VocabularyLessonService`). **This task does not build the bank or the
selection logic** — it only gets the real learner-state snapshot from
the browser to the backend; task 2.3 is what the backend does with it.
It does **not** send a learned-grammar-id list: nothing in this plan
consumes one (task 3.2's gate reads a grammar *count* locally in the
browser, never from the backend) — sending it would be untested,
unconsumed payload, dropped rather than carried "in case."

Update `docs/conversation-backend-api.md`'s `/conversation/opening`
entry: now `POST /conversation/opening`, body `{known_words: string[]}`,
same response shape as before. Update `backend/app/main.py`/`schemas.py`
(task 1.2 built the `GET` version — change the method and the Pydantic
request model together, in this task, so the two never disagree).
`ConversationPracticePort.getOpening` gains a `knownWords: string[]`
parameter; `HttpConversationPracticeClient` sends it as a POST body;
`ConversationPracticePage` calls it with
`vocab.getLearnedEntries().map(e => e.thai)`, already available through
`AppContext` exactly as every other page reads vocabulary state.

## Acceptance Criteria

- AC1: `getOpening` sends the known-word list as a POST body, per the
  updated contract doc, and the backend accepts a realistic (600-word)
  snapshot without a size-limit error.
- AC2: The page sources the list from the learner's real SRS-backed
  state (`VocabularyLessonService`), not a placeholder or fixture list.
- AC3: A learner with no learned words yet sends an empty list, not a
  missing field or a crash — a real, tested state.

## Architectural Decision

**A POST body, not query parameters on the existing `GET`.** The first
draft of this task kept `GET` with comma-separated query parameters,
reasoning that "even the full vocabulary fits well within a URL length
limit" — that arithmetic counted Thai *characters*, not the bytes a
query string actually carries once percent-encoded (a Thai character is
3 UTF-8 bytes, ~9 bytes once percent-encoded). A 200-word learner —
exactly phase 3's unlock threshold — already produces roughly 7.4KB of
request line; the largest bank tier (600 words) is roughly 22KB, past
the request-line limits most servers (including uvicorn's h11 backend)
enforce by default. The first learner who can legitimately use this
feature was already near the limit. A POST body has no such ceiling and
matches the shape task 3.1 already uses for its own session-start
endpoint — this removes an inconsistency rather than introducing one.

**No `known_grammar_ids` field.** An earlier draft transmitted, typed,
and documented one; nothing in any task of this plan ever reads it back
— task 2.3's selection is vocabulary-only (see task 2.2/2.3's word-list
containment rule), and task 3.2's gate reads a local count, never a
transmitted id list. Carrying an unconsumed field inflates every
request for no return; add it back only alongside the task that
actually needs it.

## Test Cases

- `getOpening` with a known-word list: reaches the request as a POST
  body; a realistic 600-word list is accepted end to end (backend
  non-GPU case).
- Page: real learned-vocabulary snapshot (from a seeded harness) is
  what actually gets sent, not a fixture standing in for it.
- Page: zero learned words still sends a valid (empty-array) request.
