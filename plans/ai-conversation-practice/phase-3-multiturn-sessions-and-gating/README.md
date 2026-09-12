---
doc_type: index
title: "Phase 3 — Multi-turn sessions + feature gating"
description: Turn one fixed exchange into a real multi-question conversation session, and gate the whole mode behind a vocabulary/grammar threshold so it only unlocks once a learner has enough known words for a meaningful conversation.
covers: [backend/app/session.py, backend/app/main.py, backend/app/pipeline.py, backend/app/bank.py, backend/tests, docs/conversation-backend-api.md, src/domain/conversation, src/domain/ports/ConversationPracticePort.ts, src/infrastructure/conversation, src/presentation/context/AppContext.tsx, src/presentation/test-utils/renderWithApp.tsx, src/presentation/pages/ConversationPracticePage.tsx, src/presentation/pages/ConversationPracticePage.test.tsx, src/presentation/pages/Dashboard.tsx, src/presentation/pages/Dashboard.test.tsx, e2e]
phase_id: "3"
depends_on: ["2"]
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
---

# Phase 3 — Multi-turn sessions + feature gating

**Capability added**: a learner who has crossed the vocabulary/grammar
threshold (`MIN_VOCAB_COUNT`/`MIN_GRAMMAR_POINTS`, CONTEXT.md) sees
conversation practice as an unlocked entry point (from the Dashboard,
matching how other unlockable content already surfaces in this app) and
can complete a real multi-turn session — several question/reply/verdict
exchanges in a row, each new question drawn from the bank and not
repeating one already asked this session — ending in a summary. A
learner below the threshold sees the mode locked, with a clear
explanation of what's still needed (not a hidden nav item, not a dead
link) — the existing sentence-reading/listening/segmentation/
composition challenges remain their practice content until they cross
it, per the product decision that started this plan.

**End-to-end criterion — two independent ones, not one shared signal**:
task 3.2's own e2e case (a seeded below-threshold learner sees the
locked state through the real page and never reaches a live session)
and task 3.3's e2e case (a seeded above-threshold learner completes a
real 3-question session end to end and sees a summary naming how many
passed). A review of this plan's first draft found these two,
genuinely independent capabilities sharing one task's single human-gate
signoff — split so a gating failure and a session-mechanics failure
don't block on each other.

**Would this phase stand alone?** Yes, and it's the phase that makes
the feature what was actually asked for — phases 1-2 are real but
intentionally partial (one exchange, no persistence across turns, no
gating) technical stepping stones; this is the first phase where "AI
conversation practice mode" as discussed with the user actually exists.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 3.1 | Backend session state + a "continue" endpoint | 1.2 |
| 3.2 | Frontend unlock gate (unit + its own e2e proof) | 2.3 |
| 3.3 | Multi-turn session UI + end-to-end proof | 1.4, 3.1, 3.2 |
| 3.4 | Retire the standalone opening/judge endpoints | 3.1, 3.3 |

3.1 (`backend/`) and 3.2 (`src/domain`/`src/presentation`, the gate
logic, its UI, and its own e2e case) are disjoint in `covers` and
independent of each other — 3.1 doesn't know or care whether a session
is gated; 3.2 is a pure function of the learner's existing SRS counts
plus a locked/unlocked UI state, and needs nothing from the backend to
be built, tested, or proven end to end (a locked screen never calls the
backend at all — its own e2e case, extending 2.3's `seedLearner.ts`
helper, needs only a below-threshold seed and the real page). Both are
prerequisites for 3.3, which is the first task to actually drive a real
multi-turn session through an already-proven-unlocked gate — 3.3's own
e2e case seeds an above-threshold learner and never re-proves the
locked state, since 3.2 already owns that proof.

**No seam task between 3.1 and 3.3**, unlike phase 1's 1.1/1.2/1.3
seam-then-pair shape: 3.3 simply `depends_on` 3.1 and consumes its
already-fixed endpoint contract sequentially, rather than building in
parallel against a contract nobody has written yet. That's a real
difference in shape, not an oversight — phase 1 needed a seam because
1.2 and 1.3 built concurrently against an unwritten contract; 3.1 and
3.3 don't, since 3.3 starts only once 3.1's contract already exists.

**3.4, added after review, closes a gap task 3.1 declared but did not
deliver**: task 3.1's own Architectural Decision commits to retiring
`/conversation/opening`/`/conversation/judge` once the session
endpoints exist, but the backend test files that exercised them
directly (task 1.1/1.2's, outside task 3.1's `covers`) meant it never
actually happened — confirmed independently by a phase 3 review
(decision `bcb3cf9c`). 3.4 depends on both 3.1 (the routes it should
have retired) and 3.3 (the frontend side must already be retired
before the backend side follows) and migrates the affected tests onto
the session endpoints before deleting the routes for real.
