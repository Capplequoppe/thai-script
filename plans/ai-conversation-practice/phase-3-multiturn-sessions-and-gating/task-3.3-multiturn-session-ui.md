---
doc_type: reference
title: "Task 3.3 — Multi-turn session UI + end-to-end proof"
description: Loop the record-judge-next cycle across a real session against the new session endpoints, retiring the phase-1/2 single-exchange port methods entirely, show a summary at the end that accounts for the "unscored" verdict state honestly, and prove the multi-turn flow end to end against the real backend — the gate itself is task 3.2's own proof, not repeated here.
covers:
  - src/domain/ports/ConversationPracticePort.ts
  - src/domain/conversation/types.ts
  - src/infrastructure/conversation/HttpConversationPracticeClient.ts
  - src/infrastructure/conversation/HttpConversationPracticeClient.test.ts
  - src/presentation/pages/ConversationPracticePage.tsx
  - src/presentation/pages/ConversationPracticePage.test.tsx
  - e2e/conversation-practice.spec.ts
status: draft
task_id: "3.3"
task_status: pending
depends_on: ["1.4", "3.1", "3.2"]
size: x-large
gate: human
verify:
  - npm test -- src/domain/conversation src/infrastructure/conversation src/presentation/pages/ConversationPracticePage
  - npm run test:e2e -- --project=conversation-practice
ac_enforcement:
  - "AC1 -> a case in ConversationPracticePage.test.tsx, stub port: after a judged reply, the page automatically calls next() and shows the following question, without a full page reload; the running tally updates correctly for each of the three verdict outcomes (pass increments passed and total, fail increments only total, unscored increments only total and a separate unscored count - never silently folded into fail, since CONTEXT.md's never-asked/empty/failed distinction exists precisely so these don't collapse together)"
  - "AC2 -> a case: the stub port returning exhausted: true ends the session and shows a summary (e.g. \"2 passed / 3 asked, 1 unscored\"), rather than the page hanging waiting for a question that will never come"
  - "AC3 -> a case: a mid-session network failure (port returns unavailable on next() or judge()) shows the same 'backend not running' state task 1.3 established, with the tally-so-far preserved and visible rather than discarded"
  - "AC4 -> a case: the question audio blob URL created via URL.createObjectURL is revoked (URL.revokeObjectURL) when the page advances to the next question and on unmount - a multi-turn session creates one blob per question, and a first draft never revoked any of them, leaking one object URL per turn for the session's lifetime"
  - "AC5 -> extends e2e/conversation-practice.spec.ts (task 1.4): an above-threshold seeded run (task 2.3's seedLearner.ts) completes a real 3-turn session (three fake-mic record/stop cycles against the real backend and bank) and sees a summary correctly naming how many of the 3 passed - this spec no longer asserts the locked path at all, since task 3.2's own e2e/conversation-gate.spec.ts is that proof now"
  - "AC6 -> none - manual: a person runs a real session end to end with their own voice (not the fake-mic fixture) at least once, confirming the full multi-turn loop feels usable - recorded as a close-out note, matching task 1.4's AC5 precedent for what automated tests can't judge"
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 8"
---

# Task 3.3 — Multi-turn session UI + end-to-end proof

## Description

Replace, not extend, `ConversationPracticePort`'s phase-1/2 methods
(`getOpening`, `judgeReply` — tasks 1.3, 2.1) with session-scoped ones
matching task 3.1's three endpoints: `startSession(knownWords)`,
`next(sessionId)`, `judgeReply(sessionId, audio)`. Task 3.1 already
retires the backend routes these old methods called; this task retires
the frontend side in the same PR, so the port never carries a method
with nowhere left to send its request. Same
`{status: "ok" | "unavailable"}` result-type discipline task 1.3
established, not a new error-handling convention for this task.

`ConversationPracticePage.tsx` becomes a small state machine: `locked`
(task 3.2's gate — this task does not re-implement or re-prove it,
only renders it) → `loading` → `question` (current question shown,
record control live) → `judging` → back to `question` (next one) or
`summary` (on `exhausted`) — with a running tally carried through
every transition, never reset except by starting a new session.

**The tally accounts for `"unscored"` honestly, not as a silent
fail.** Task 1.2 established `"unscored"` as a real, distinct verdict
for when judging itself failed (empty transcript, a transcription
exception, a judge-parse exception) — never conflated with `"fail"`
(a real, judged wrong answer). A first draft of this task's tally
tracked only pass/fail, which would have silently miscounted every
system hiccup as the learner having gotten a question wrong. The
summary reports all three: passed, failed-with-a-real-verdict, and
unscored, out of the total attempted.

A mid-session network failure (AC3) shows the same unavailable-state UI
task 1.3 built, with the tally still visible rather than the whole
session state being thrown away — a learner who got through three
questions before the backend dropped should still see their tally so
far, not nothing.

**Revoke question-audio blob URLs (AC4).** Each question's audio
arrives as base64, decoded into a `Blob` and played via
`URL.createObjectURL` — task 1.3's pattern for a single exchange, where
the page's lifetime and the blob's both end together. A multi-turn
session creates one new blob per question; without an explicit
`URL.revokeObjectURL` on each transition (and on unmount), every object
URL for the session's lifetime leaks, which a single-exchange page
never surfaced.

**This task's own e2e case proves only the multi-turn session
mechanic.** Task 3.2 now owns the locked-path e2e proof
independently (see its README/task rationale) — extending
`e2e/conversation-practice.spec.ts` here to also re-assert the lock
would duplicate that proof and let the two capabilities' regressions
mask each other behind one shared spec file.

## Acceptance Criteria

- AC1: A judged reply automatically advances to the next question,
  with the tally correctly distinguishing pass/fail/unscored.
- AC2: Session exhaustion ends cleanly at a summary naming all three
  tally components, never an indefinite wait.
- AC3: A mid-session backend failure shows the established unavailable
  state without discarding the tally already earned.
- AC4: Question-audio blob URLs are revoked on question change and on
  unmount — no leaked object URLs across a session.
- AC5: A real 3-turn session, above threshold, is proven end to end
  against the real backend and bank — the locked path is not
  re-asserted here.
- AC6: A person has run one real session with their own voice and
  confirmed it's usable — a manual note, not a test.

## Architectural Decision

**The tally is frontend-only state for this phase, not persisted or
fed into the SRS scheduler.** Same reasoning task 1.3's Architectural
Decision gave for not building an SRS/history integration prematurely
— how a conversation session's pass/fail record should (or shouldn't)
feed into the spaced-repetition system is a real product question this
plan doesn't answer, and building a persistence layer for it now would
be guessing. A session's tally living only in the page's own state,
gone on navigation away, is the honest reflection of that: this plan
ships a working practice loop, not a scored, reviewable artifact.

**`"unscored"` is its own tally bucket, never merged into `"fail"`.**
CONTEXT.md's never-asked/empty/failed distinction exists precisely to
stop these three states collapsing into each other; a tally that
silently counted a transcription failure as a wrong answer would
undermine that discipline at the very last, most user-visible step of
the pipeline.

**The old single-exchange port methods are removed, not deprecated
alongside the new ones.** Task 3.1 retires their backend routes in the
same phase; keeping a frontend method that calls a route which no
longer exists is dead code with a runtime failure mode, not a harmless
leftover. Removing both sides together in coordinated tasks (3.1
backend, 3.3 frontend) is simpler than staging a deprecation window
neither this plan nor its single consuming page needs.

## Test Cases

- Judged reply → automatic advance; tally correctly splits
  pass/fail/unscored.
- Exhaustion → summary naming all three tally components, not a hang.
- Mid-session failure → unavailable state, tally still visible.
- Question audio blob URLs: revoked on advance and on unmount.
- E2e: above-threshold seeded run → real 3-turn session → real summary
  naming how many of 3 passed (no locked-path assertion in this spec).

Note: this task depends on 1.4 not only for `startSession`/`next`
availability (via 3.1) but because it extends the same
`e2e/conversation-practice.spec.ts` file 1.4 created — a real
file-level dependency, not just an API one.
- Manual: one real end-to-end session with a real voice, confirmed
  usable.
- `getOpening`/single-exchange `judgeReply`: removed from
  `ConversationPracticePort` and its HTTP client — confirmed by their
  absence, not a still-passing test against a removed method.
