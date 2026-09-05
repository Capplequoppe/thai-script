---
doc_type: reference
title: "Task 2.1 — Word pool + mix in the selection service"
description: Add a WordGameItemSource (content from VocabEntry, eligibility from vocab cards) and extend GameItem with a word member — purely additive against task 1.1's source/sampling decomposition.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/WordGameItemSource.ts
  - src/domain/game/services/WordGameItemSource.test.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/presentation/context/AppContext.tsx
status: draft
task_id: "2.1"
task_status: pending
depends_on: ["1.4"]
size: medium
verify:
  - npm test -- src/domain/game
  - npm run build
ac_enforcement:
  - "AC1 -> cases in GameItemSelectionService.test.ts requesting pools [\"script\"], [\"vocab\"], and [\"script\",\"vocab\"] against a fixture with both kinds eligible, asserting the returned items' `kind` matches the requested pools"
  - "AC2 -> a fixture with two vocab cards sharing one `thai` value under two different VocabProperty values, asserting that word is selected at most once per round"
  - "AC3 -> a case where only one pool (e.g. vocab) has any eligible items and [\"script\",\"vocab\"] is requested with a count exceeding that pool's size, asserting the result is capped at that pool's eligible count"
  - "AC4 -> a case asserting every returned word item's challengeDirection is \"dictationTranslate\" or \"production\", verified with a seeded RandomSource against an exact expected sequence, not a trial count"
  - "AC5 -> all of task 1.1's existing GameItemSelectionService.test.ts cases pass unmodified, enforced by npm run build + npm test rather than a rewritten expectation"
  - "AC6 -> a case in WordGameItemSource.test.ts: a fixture with two vocab cards for one word under differing properties (one thaiToEnglish, one englishToThai — differing promptWord meaning), asserting the produced content's Thai spelling, English meaning, and Thai audio URL come from the injected VocabEntry, never from either card's own promptWord/correctAnswer"
  - "AC7 -> a case: a vocab card whose id does not match `vocab:{thai}:{property}` is skipped by eligibility, never turned into an item with an undefined/empty word"
  - "AC8 -> a case using a seeded RandomSource and a fixture sized so a uniform draw of the requested count is guaranteed to include both kinds, asserting a [\"script\",\"vocab\"] round with no fixed ratio still contains at least one of each — deterministic, not statistical"
ac_tests:
  - "AC1 -> src/domain/game/services/GameItemSelectionService.test.ts::word pool and mix (task 2.1) > returns only script/word/both items for pools:[...]"
  - "AC2 -> src/domain/game/services/GameItemSelectionService.test.ts::word pool and mix (task 2.1) > treats a word with cards under several VocabProperty values as one item"
  - "AC3 -> src/domain/game/services/GameItemSelectionService.test.ts::word pool and mix (task 2.1) > caps a combined-pool request at the size of the only eligible pool"
  - "AC4 -> src/domain/game/services/GameItemSelectionService.test.ts::word pool and mix (task 2.1) > assigns the exact word direction sequence a seeded source dictates"
  - "AC5 -> src/domain/game/services/GameItemSelectionService.test.ts (whole file, task 1.1 cases unmodified) + npm run build"
  - "AC6 -> src/domain/game/services/WordGameItemSource.test.ts::takes content from the injected VocabEntry, never from either card's own promptWord/correctAnswer"
  - "AC7 -> src/domain/game/services/WordGameItemSource.test.ts::skips a card whose id does not match vocab:{thai}:{property}, rather than producing an undefined word"
  - "AC8 -> src/domain/game/services/GameItemSelectionService.test.ts::word pool and mix (task 2.1) > a deterministic mixed-pool draw contains at least one of each kind"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 2.1 — Word pool + mix in the selection service

## Description

Revised after panel review found the original draft's "dedupe vocab words
the way `getLearnedThaiWords()` does" instruction gives only a
`Set<string>` of Thai words — `VocabCard` has no `thai`/`english` field, and
`promptWord` holds the Thai word for five `VocabProperty` values but the
*English* word for `englishToThai` (`VocabCardGenerator.ts`). Building a
word's displayable content from cards alone is not implementable as
originally specified; the same rule CONTEXT.md now states for symbols
applies here too: **cards decide eligibility, `VocabEntry` decides content.**

Because task 1.1 already decided the `GameItemSource`/`sampleWithoutReplacement`
decomposition, this task is additive, not a rewrite:

- Add a `WordItemContent` variant to `GameItemContent` (Thai spelling,
  English meaning, Thai audio URL) and add it to the `GameItem` union
  (`{ kind: "word"; ...WordItemContent; challengeDirection:
  "dictationTranslate" | "production" }`) alongside phase 1's `kind: "symbol"`
  member — this is why task 1.1 tagged the union: nothing in phase 1's
  already-built code needs to change.
- Implement `WordGameItemSource`: eligibility from `CardRepository
  .findAll("vocab")` (dedupe by the Thai word parsed from each card's id,
  `vocab:{thai}:{property}` — skip, don't crash on, any id that doesn't match
  this shape), content from a constructor-injected `VocabEntry[]` (matching
  `AppContext.tsx`'s existing pattern for `VocabularyService`/`GrammarService`
  /`SentenceService`, which each receive `vocabularyData as VocabEntry[]`
  directly — do this here too; add `AppContext.tsx` to this task's `covers`
  for that wiring). Do **not** import or depend on `VocabularyService` itself
  — it owns lesson-unlock/mastery concerns this feature has no business with;
  only its dedup *technique* is being reused, not the class.
- Register `WordGameItemSource` alongside the existing
  `SymbolGameItemSource` in `GameItemSelectionService`'s source array (in
  `AppContext.tsx`'s wiring) — `GameRoundConfig.pools` (already
  `readonly GameCardPool[]` since task 1.1) now meaningfully accepts
  `["vocab"]` or `["script","vocab"]` with no change to
  `GameItemSelectionService` itself.
- Direction assignment for word content is 50/50 between
  `"dictationTranslate"` and `"production"`, using the same `RandomSource`
  task 1.1 already threads through.

## Acceptance Criteria

- AC1: Requesting pools `["script"]` / `["vocab"]` / `["script","vocab"]`
  returns items whose `kind` matches, when both kinds have eligible items.
- AC2: A vocab word with cards under more than one `VocabProperty` is one
  eligible word, never selected twice in one round.
- AC3: If only one pool has eligible items, a combined request still returns
  up to the requested count from the pool that does.
- AC4: Word items are assigned `"dictationTranslate"` or `"production"`,
  verified against a seeded source's exact expected sequence.
- AC5: All of task 1.1's existing cases in this same test file pass
  unmodified — enforced by this task's `verify` running the full domain
  suite and `npm run build`, not merely the new cases.
- AC6: A word's content (Thai spelling, English meaning, Thai audio) comes
  from its `VocabEntry`, never from any individual card's `promptWord`/
  `correctAnswer` — proven against a fixture with two differently-propertied
  cards for one word whose `promptWord` meanings differ.
- AC7: A malformed vocab card id is excluded from eligibility rather than
  producing a word item with an undefined identity.
- AC8: A mixed-pool round with no fixed ratio still contains at least one of
  each kind, when both are eligible and the fixture/seed make this
  deterministic (not a statistical near-miss on small pools).

## Architectural Decision

This task is additive by design: a new `GameItemContent` variant, a new
`GameItemSource` implementation, one new registration in `AppContext.tsx`'s
composition of `GameItemSelectionService`. No change to
`GameItemSelectionService`'s own logic, `sampleWithoutReplacement`, or any
phase-1 presentation component — task 1.1's decomposition is what makes this
true, and it is the reason that decomposition was decided before phase 2
started rather than discovered here.

Content sourcing mirrors the symbol-content decision from task 1.1 exactly:
cards establish that a word is eligible; `VocabEntry` (constructor-injected,
matching the existing `AppContext.tsx` convention for large data files)
establishes what it looks like. This is not a new pattern invented for
words — it is the same rule, applied consistently, that the original draft
missed for both pools.

## Test Cases

- Pools `["script"]` / `["vocab"]` / `["script","vocab"]`, both kinds
  eligible: correct `kind` composition.
- A word with two `VocabProperty` cards: selected once.
- Only-vocab-eligible fixture, combined pools requested: capped at vocab's
  size, no throw.
- Word direction distribution: exact seeded sequence.
- All of task 1.1's existing cases: unmodified, still passing.
- A fixture with a `thaiToEnglish` card and an `englishToThai` card for one
  word (differing `promptWord` meanings): content matches the injected
  `VocabEntry`, not either card.
- A malformed vocab card id: excluded, not crashed on.
- A deterministic mixed-pool draw: at least one of each kind present.
