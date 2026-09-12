# Decisions

The runner writes the questions here; you write the answers. This file is part of
the plan's frozen prefix, so **every executor and reviewer on the next run reads it**
— which is what makes an answer take effect without anyone translating it into work.

Write below each `**Answer:**` marker. Leave it blank to say "still undecided"; the
question will be raised again. A run never edits or removes an answer you have written,
and never removes a block, so this file is the standing record of what was settled.

Two kinds of answer, and it is worth being explicit about which you are giving:

- **A policy** — "preserve the destination's mode, do not narrow to 0600". Agents can
  act on this directly.
- **An amendment** — "a task must own `uv.lock`". Prose cannot deliver this. Say so
  here, then amend the plan; the answer alone will change nothing.

## 0247e163 — f1 · phase 1 round 2 · e2e/conversation-practice.spec.ts

Task 1.4's e2e criteria AC1, AC3, and AC4 (backend per-model readiness gating, fail-verdict rendering, simulated-connection-failure handling) have no recorded red proof — unlike AC2, which was validated with one. Their tests have never been observed failing, so per the ledger's own legend they are not yet evidence of anything beyond 'ran once and passed'.

> This block's id includes the finding's wording, because the review supplied no
> criterion to anchor it to. If a later review rewords this finding it will be
> asked again as a new block, and this answer will stay here unattached.

**Scored severity 4/10, effort 7/10** — the effort is the cost of the repair including proving it safe. It reached you because a real defect that is expensive to fix is the one case where spending without your agreement is itself the risk.

**Options:**

- **A** — Accept the manual-verification note as sufficient compensating evidence for a gate:human task and leave AC1/AC3/AC4 without formal red proofs permanently  ← recommended
  Matches how this task was actually executed and gated, but leaves these three criteria's tests unvalidated against a known-failing mutation — a future regression in readiness-polling or connection-failure handling could pass silently if the e2e suite itself has a latent bug.
- **B** — Require a follow-up task/session with real GPU hardware to run mutation-based red proofs for AC1, AC3, AC4 and record them under red-proofs/
  Closes the gap properly but costs another full GPU-backed e2e run cycle (cold model load + ~30s per mutation × 3 criteria) for a phase that is otherwise complete and already human-gated.

**Answer:**

A

**Applied:**

answered — later raisings are dispatched as work, not asked again

## 9f6a4b82 — F1 · phase 2 round 1 · plans/ai-conversation-practice/red-proofs/2.3.md

Task 2.3 shipped as `complete` with real, correct tests for all four of its own acceptance criteria (AC1-AC4 in backend/tests/test_bank.py and the e2e AC4 case), and the executor's own summary narrates having proven each one red-then-green by mutation — but no `plans/ai-conversation-practice/red-proofs/2.3.md` was ever written, unlike every other completed task in this phase (2.1.md and 2.2.md both exist). The criteria ledger reflects this gap by falling back to `[none]`/`intended:` placeholder text copied from the task description, rather than `[red]`, even though the tests plainly exist and assert the right things (verified by reading them and cross-checking the shipped bank/vocabulary files directly). This is a process/audit-trail gap in how task 2.3's completion was recorded, not a code defect inside the diff, and I have deliberately not tried to reconstruct the missing red-proof myself (re-deriving it by reading the test against the implementation, or re-running mutation tests, is exactly the cost this record exists to remove, and is against this role's standing policy).

> This block's id includes the finding's wording, because the review supplied no
> criterion to anchor it to. If a later review rewords this finding it will be
> asked again as a new block, and this answer will stay here unattached.

**Scored severity 5/10, effort 8/10** — the effort is the cost of the repair including proving it safe. It reached you because a real defect that is expensive to fix is the one case where spending without your agreement is itself the risk.

**Answer:**

decline — the tests themselves are real and correct (verified directly), and reconstructing the missing red-proof retroactively costs more than the gap is worth. Accepted as a known audit-trail omission for task 2.3, same reasoning as 0247e163's option A.

**Applied:**

declined — closed; later raisings are settled without asking again

## 1ecbe61f — continuation-3.2 · continuation/3.2 · Task 3.2 — the continuation bound

Task 3.2 could not fix itself. The runner handed the failure back to the executor's own session for every continuation this run was allowed to spend, and the task is still not green. Continuing is no longer the runner's call — the remedy on record for this cause is that the executor's own session is shown the failure and fixes it, and it has now been tried to the bound. What is left is a larger bound, or you.

**Options:**

- **A** — raise `--max-continuations` above 2
  2 continuation(s) were spent against a bound of 2 and the gate is still red. Worth it only if the last attempt was closer than the first: every continuation is a paid invocation, and a task that cannot fix itself in a bounded number of attempts usually has a problem no further attempt will find
- **B** — take this task by hand, then reset its `task_status` to `pending`
  the ending the runner has always had — the next run re-reads the plan and picks the task up from wherever you left the tree
- **C** — narrow task 3.2, or split the part that will not go green into its own task
  for work that turned out to be two jobs — the half that passes lands, and the half that does not stops holding everything downstream of it

**Answer:**

B (done directly to `complete`, not `pending` — see task 3.2's own "Cross-Task Regression Fixed During Integration" section for the fix: the executor had already correctly diagnosed the cause and extended `seedLearner.ts`; what was missing was widening `playwright.config.ts`'s `testMatch` to actually run its new spec, updating the pre-existing fixtures in `conversation-practice.spec.ts`/`-fail.spec.ts` to seed grammar too, regenerating `reply-pass.wav` to answer the now-personalized opening question, and hardening `conversation-backend.setup.ts` against a stale process found holding port 8000. All 9 e2e cases pass.)

**Applied:**

answered — later raisings are dispatched as work, not asked again

## 1b2f771f — F3 · phase 2 round 2 · src/presentation/pages/ConversationPracticePage.test.tsx

Task 2.1's AC3 ('a learner with no learned words yet sends an empty list, not a missing field or a crash — a real, tested state') had its only page-level proof deleted in this diff with no replacement. `ConversationPracticePage.test.tsx`'s test 'still sends a request, with a real empty array, for a learner with no learned words yet' (which rendered the page with no graduated vocab and asserted `port.openingCalls[0]` was `[]`) is gone; the file now defaults every render to `UNLOCKED_VOCAB` (220 words) because phase 3's unlock gate (landed concurrently in the same file) makes the zero-known-words state unreachable through the real page — `checkConversationUnlock` requires `vocab.getLearnedCount() >= MIN_VOCAB_COUNT` (200), and in both the app and this test harness that count is backed by the same underlying card set as `getLearnedEntries()`, so 'unlocked' and 'zero known words' can never co-occur. The two new 'unlock gate' tests prove the page never calls the backend at all below threshold, which is a real and useful property, but it is a different claim from AC3's — it doesn't show that an in-range learner's real (possibly gappy-down-to-empty at low counts, though not literally zero above 200) snapshot round-trips as an honest array. The adapter-level test in `HttpConversationPracticeClient.test.ts` ('sends an empty known-word list as a real empty array, not an omitted field') still proves the wire-format half of AC3 (empty array, not an omitted field) independent of the page, but nothing now proves the *page's own* mapping (`vocab.getLearnedEntries().map(e => e.thai)`) doesn't crash or misbehave when that array happens to be empty — a defensive property that's currently unreachable in production (thanks to a positive `MIN_VOCAB_COUNT`) but was deliberately tested before the gate existed.

> This block's id includes the finding's wording, because the review supplied no
> criterion to anchor it to. If a later review rewords this finding it will be
> asked again as a new block, and this answer will stay here unattached.

**Scored severity 5/10, effort 7/10** — the effort is the cost of the repair including proving it safe. It reached you because a real defect that is expensive to fix is the one case where spending without your agreement is itself the risk.

**Options:**

- **A** — Accept the adapter-level test (`HttpConversationPracticeClient.test.ts`'s 'sends an empty known-word list as a real empty array, not an omitted field') as sufficient proof of AC3's substance, and record that the page-level empty-vocabulary scenario is now unreachable by design once phase 3's gate landed (MIN_VOCAB_COUNT=200 > 0 makes 'unlocked' and 'zero known words' mutually exclusive).  ← recommended
  No new test needed now; the ledger's AC3 entry should be understood as satisfied by a test at a different layer than originally scoped. If a later change ever lowers MIN_VOCAB_COUNT toward 0, this gap becomes live again with nothing flagging it.
- **B** — Restore page-level coverage for the empty-known-words send path by making it testable independent of the unlock gate (e.g. extract the known-words-effect into a unit that can be exercised without satisfying `checkConversationUnlock`, or accept a test-only override).
  Preserves a defensive regression test against a future gate-threshold change, but adds test/production surface area whose only job is guarding a currently-unreachable state, and risks colliding with whatever task is concurrently editing this same file's gate wiring.

**Answer:**

A

**Applied:**

answered — later raisings are dispatched as work, not asked again

