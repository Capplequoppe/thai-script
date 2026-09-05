---
doc_type: reference
title: "Task 3.1 — Weighted selection"
description: A weight function plus wiring into task 1.1's already-parameterized sampler — purely additive, with an explicit rule for never-reviewed items and no coupling to ReviewService.
covers:
  - src/domain/game/services/itemWeight.ts
  - src/domain/game/services/itemWeight.test.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/domain/game/test-fixtures/weakStrongFixture.ts
status: draft
task_id: "3.1"
task_status: complete
depends_on: ["2.3"]
size: medium
verify:
  - npm test -- src/domain/game
  - npm run build
ac_enforcement:
  - "AC1 -> a case requesting selection without prioritizeWeakItems set, asserting no behavioral difference from the phase-1/phase-2 unweighted cases"
  - "AC2 -> a direct unit test of itemWeight: given fixture items with known ease-factor/lapse-count/repetitions values, assert the weaker items' computed weight is strictly greater than the stronger items'"
  - "AC3 -> a case requesting a count equal to the full eligible set with weighting on, asserting every eligible item is returned exactly once regardless of weight"
  - "AC4 -> a case with prioritizeWeakItems set, a seeded RandomSource, and the shared weak/strong fixture (exported from test-fixtures/weakStrongFixture.ts), requesting a count smaller than the eligible set, asserting the returned items are exactly the weak subset the seed dictates"
  - "AC5 -> a case: an item with repetitions === 0 (never reviewed) receives the stated baseline weight (neutral, not maximum) — asserted against a fixture containing one never-reviewed, one weak, and one strong item, confirming the never-reviewed item is not preferred over the weak one"
  - "AC6 -> a case where all eligible items have equal weight (or total weight is 0), asserting selection still returns exactly the requested count of distinct items, no NaN/undefined entries"
  - "AC7 -> none — that this task reads stats via CardRepository and does not call ReviewService is a structural property, checked by review, not a runtime assertion"
ac_tests:
  - "AC1 -> src/domain/game/services/GameItemSelectionService.test.ts::AC1: without prioritizeWeakItems, behaves exactly as the unweighted draw"
  - "AC2 -> src/domain/game/services/itemWeight.test.ts::AC2: a lower-ease, higher-lapse item weighs strictly more than a higher-ease, lapse-free one"
  - "AC3 -> src/domain/game/services/GameItemSelectionService.test.ts::AC3: a full-set request with weighting on still returns every item exactly once"
  - "AC4 -> src/domain/game/services/GameItemSelectionService.test.ts::AC4: with the shared seeded fixture, under-sampling returns exactly the weak item"
  - "AC5 -> src/domain/game/services/GameItemSelectionService.test.ts::AC5: a never-reviewed item is not preferred over a genuinely weak one"
  - "AC6 -> src/domain/game/services/GameItemSelectionService.test.ts::AC6: equal weight across all eligible items still returns the requested count, no NaN/undefined"
  - "AC7 -> none"
red_proof:
  - "AC2 -> itemWeight.ts: reversed the ease-factor term (`easeFactor - EaseFactor.MIN` instead of `EaseFactor.MAX - easeFactor`, dropping lapseCount)."
  - "AC4 -> GameItemSelectionService.ts selectRound: forced `weightOf` to always be `undefined` (`false && config.prioritizeWeakItems && ...`)."
  - "AC1 -> GameItemSelectionService.ts selectRound: dropped the `config.prioritizeWeakItems &&` guard so weighting activates whenever a `cardRepository` is present, regardless of the flag."
red_proof_waived:
  - "AC3 -> traced: Not independently mutated; exercises the same weightOf-wiring path already broken and restored for AC1/AC4 (full-set membership is unaffected by weight either way, by sampleWithoutR… [see red-proofs/]"
  - "AC5 -> traced: The AC4 mutation (weighting forced off) was independently observed to fail this same test too (fresh drawn instead of weak) before being reverted; not re-run through the observe-red… [see red-proofs/]"
  - "AC6 -> traced: itemWeight's AC6 test (every weight finite and >0) and worstStats' empty-list case are straightforward pure-function assertions with no conditional logic to mutate meaningfully beyo… [see red-proofs/]"
lint:
  before: 7
  after: 6
  outcome: incomplete
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 3.1 — Weighted selection

## Description

Because task 1.1 already defined `sampleWithoutReplacement(items, count,
{weightOf?, rng?})`, this task is additive: it adds `itemWeight()` (a pure
function from a card's `schedule` stats to a number) and wires it into the
existing sampler as a `weightOf` callback when `GameRoundConfig
.prioritizeWeakItems` is set. No signature of `GameItemSelectionService` or
`sampleWithoutReplacement` changes — this task supplies an argument to a
parameter that already existed, which is exactly the point of deciding the
decomposition in task 1.1 rather than here.

Read CONTEXT.md's "Reusing SRS stats for weak-item weighting" section before
writing anything — it is the corrected version of guidance a prior draft
gave self-contradictorily (both "don't reimplement `getCriticalItems`'s
sort" and "call through `CardRepository`", which are mutually exclusive).
The rule: read `card.schedule.easeFactor.value`/`.lapseCount`/`.repetitions`
directly via `CardRepository`, the same fields `ReviewService
.getCriticalItems` reads — **never call `ReviewService` itself**, which is
structurally unusable here anyway (card-level DTOs, `limit = 10`, no
`symbolCharacter`/Thai word).

A symbol/word with more than one underlying card uses the **worst**
performing card's stats (lowest ease factor) as its representative — the
game drills the symbol/word as a whole, and averaging would dilute a single
badly-lapsed property with several well-known ones.

**Never-reviewed items** (`repetitions === 0`) need an explicit rule:
`DEFAULT_SRS_DATA.easeFactor` is 2.0, *below* `EaseFactor.DEFAULT`'s 2.5, so
a naive "lower ease = weaker" formula ranks brand-new items as the weakest
in the pool. `itemWeight` must treat `repetitions === 0` as a stated,
neutral case (recommended: the same weight a mid-range known item would get)
— not the maximum weight a genuinely lapsed item would receive.

Export the weak/strong fixture (and the seeded `RandomSource` used against
it) from `src/domain/game/test-fixtures/weakStrongFixture.ts` so task 3.2
can import the same fixture rather than re-deriving one that might not
actually exhibit the bias it claims to.

## Acceptance Criteria

- AC1: Without `prioritizeWeakItems`, selection behaves exactly as phases 1
  and 2 already established.
- AC2: `itemWeight` assigns a strictly higher weight to a fixture item with
  lower ease factor / higher lapse count than one with higher ease / lower
  lapse.
- AC3: Requesting the full eligible set with weighting on still returns
  every item exactly once.
- AC4: With the shared seeded fixture and a count smaller than the eligible
  set, weighted selection returns exactly the weak subset the seed dictates
  — the actual sampling behavior, not just the weight function in isolation.
- AC5: A never-reviewed item (`repetitions === 0`) receives a stated,
  neutral weight — not preferred over a genuinely weak (lapsed) item.
- AC6: Equal or zero total weight across all eligible items still returns
  exactly the requested count, with no `NaN`/undefined entries.
- AC7: This task reads stats via `CardRepository` directly and does not call
  `ReviewService` — `GameItemSelectionService` and `ReviewService` remain
  siblings over the same port, not a chain.

## Architectural Decision

`GameItemSelectionService` and `ReviewService` are siblings over the same
`CardRepository` port, not a chain — this task deliberately does not call
`ReviewService.getCriticalItems`, and this line exists specifically so a
future reader doesn't "fix" this task into that coupling on the mistaken
assumption that reuse means calling the existing method.

The never-reviewed baseline rule is stated explicitly rather than left to
fall out of whatever formula gets written, because the natural formula
(lower ease = higher weight) gets this case backwards by construction (see
Description) — this is not a hypothetical edge case, it is the default state
of every freshly-introduced item.

Splitting weight computation from sampling into two independently testable
pieces (already true from task 1.1's design) is what makes AC2 (a pure
function, trivial to assert an exact ordering over) and AC4 (the actual
sampling behavior, needing a seeded source) each cheap to write and hard to
get wrong in a way the other would mask.

## Test Cases

- Weighting off: identical to phase 1/2 behavior.
- `itemWeight`: weak fixture item's weight strictly exceeds strong fixture
  item's, given known inputs.
- Full-set request, weighting on: exact-once membership, unaffected by
  weight.
- Under-sampling with the shared seeded weak/strong fixture: returns exactly
  the weak subset.
- A never-reviewed item alongside a weak and a strong item: not preferred
  over the weak one.
- Equal/zero total weight: still returns the requested count, no
  `NaN`/undefined.
