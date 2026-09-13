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

## aef1a949 — F1 · phase 2 round 3 · src/presentation/pages/ConversationPracticePage.test.tsx

Confirmed still open from the previous round (F3), unchanged since: task 2.1's AC3 ('a learner with no learned words yet sends an empty list, not a missing field or a crash — a real, tested state') has no page-level proof anymore. The only test that ever exercised it — 'still sends a request, with a real empty array, for a learner with no learned words yet' — is gone; every render in this file now seeds graduatedVocab with UNLOCKED_VOCAB (220 words) because phase 3's gate (checkConversationUnlock, landed in the same file) makes the request-effect never fire below MIN_VOCAB_COUNT=200, and the harness's graduatedVocab option seeds both vocab.getLearnedCount() and vocab.getLearnedEntries() from the same card set, so 'unlocked' and 'zero known words' can never co-occur through the normal renderPage() path. The wire-format half of AC3 (empty array, not an omitted field) is still proven at the adapter level (HttpConversationPracticeClient.test.ts), but nothing now proves the page's own mapping (vocab.getLearnedEntries().map(e => e.thai), line 81) behaves correctly when that array is empty. Failure scenario: no live production risk today (the gate makes the branch unreachable while vocab count is 0), but the ledger and task document both still claim an automated page-level proof for AC3 that no longer exists — a future change to the mapping expression could regress silently with no test to catch it, and an auditor reading the ledger would believe it's covered when it isn't.

> This block's id includes the finding's wording, because the review supplied no
> criterion to anchor it to. If a later review rewords this finding it will be
> asked again as a new block, and this answer will stay here unattached.

**Scored severity 4/10, effort 7/10** — the effort is the cost of the repair including proving it safe. It reached you because a real defect that is expensive to fix is the one case where spending without your agreement is itself the risk.

**Options:**

- **A** — Extract the known-words mapping (vocab.getLearnedEntries().map(e => e.thai)) into a small named function and unit-test it directly with a stub returning zero entries.  ← recommended
  Restores an automated, isolated proof that an empty entry list maps to a real empty array; cheapest and matches the harness's existing style, but tests the mapping in isolation rather than the full page flow AC3's wording implied.
- **B** — Add a page-level test that stubs/mocks checkConversationUnlock (or the vocab port directly) so the request effect fires with zero known words despite being below the real MIN_VOCAB_COUNT gate.
  Restores full-page coverage matching AC3's original wording exactly, but exercises a learner state (unlocked with zero vocabulary) that can never occur in production once the gate is enforced, and introduces module-mocking not otherwise used in this test file.
- **C** — Formally re-scope AC3 to the adapter-level test only (HttpConversationPracticeClient.test.ts already proves empty array vs. omitted field over the wire) and record that the page-level half is superseded by phase 3's gate.
  No code change needed, but leaves the page's own mapping logic with no dedicated test — a defensible position only if the plan explicitly accepts that AC3's page-level clause is now moot.

**Answer:**

A — done: extracted `knownWordsFor(vocab)` in `ConversationPracticePage.tsx` and added a direct unit test in `ConversationPracticePage.test.tsx` asserting a stub with zero learned entries maps to a real empty array. 13/13 page tests pass, `tsc -b` clean.

**Applied:**

answered — later raisings are dispatched as work, not asked again

## bcb3cf9c — F1 · phase 3 round 1 · backend/app/main.py

Task 3.1's own description and Architectural Decision commit to removing `/conversation/opening` and `/conversation/judge` from `backend/app/main.py` ("This task removes their route handlers... and their entries from docs/conversation-backend-api.md"), but both routes are still live in `main.py` (lines 215-235, 237-239) and still documented (docs/conversation-backend-api.md's own 'Retiring' section admits this). The reason is real and well-documented: `backend/tests/test_health.py` and `backend/tests/test_pipeline.py` exercise these routes directly to prove task 1.1's CORS/concurrency/501 contract and task 1.2's judge behavior, and rewriting those tests to exercise the same properties through the session endpoints instead is substantial, cross-cutting work (verified: test_health.py's five judge/opening-route tests are the *only* vehicle it has for proving CORS-allow, CORS-reject, and the two-call concurrency/health-stays-responsive behavior). `ConversationPracticePort`'s own doc comment compounds this by asserting a falsehood: "their backend routes are retired in the same phase (task 3.1)" (ConversationPracticePort.ts line ~15) — the frontend side is retired, the backend side is not. Net effect: the plan's stated trust-boundary mitigation (retiring dead surface reachable by any local origin, per the plan README's Trust Boundary Inventory) was not actually delivered, and no task in phase 3 owns the fix — task 3.1 explicitly scoped it out, task 3.3 explicitly declined to touch it (documented in its own Manual Verification section) as being outside its covers.

> This block's id includes the finding's wording, because the review supplied no
> criterion to anchor it to. If a later review rewords this finding it will be
> asked again as a new block, and this answer will stay here unattached.

**Scored severity 4/10, effort 8/10** — the effort is the cost of the repair including proving it safe. It reached you because a real defect that is expensive to fix is the one case where spending without your agreement is itself the risk.

**Options:**

- **A** — Accept as a documented, deliberate known gap for now (current state)
  The dead routes stay reachable by any local origin per the plan's own Trust Boundary Inventory (SA-1/QA-31) — low practical risk on a local-only single-user tool, but the plan's stated mitigation is not actually in place.
- **B** — Add a new task (or extend an existing one's covers) to migrate test_health.py/test_pipeline.py's CORS/concurrency/501 proofs onto the session endpoints and then delete the two routes  ← recommended
  Closes the gap properly but is real new scope this phase did not budget for.

**Answer:**

B — done as task 3.4: migrated backend/tests/test_health.py and test_pipeline.py's HTTP-level cases onto the session endpoints (a new tts_only_client fixture covers the "real session, whisper/judge still unloaded" case), then deleted /conversation/opening (POST + GET shim) and /conversation/judge, the dead _opening_pipeline helper, and the dead OpeningRequest/OpeningResponse schemas. Updated docs/conversation-backend-api.md and ConversationPracticePort.ts's own doc comment to match. 39/39 non-GPU backend tests pass, ruff clean, full e2e suite still 10/10.

**Applied:**

answered — later raisings are dispatched as work, not asked again

