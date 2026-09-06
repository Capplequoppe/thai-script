---
doc_type: reference
title: "Task 3.1 — Composition selection over unlocked grammar points"
description: A composition item shape kept OUT of GameItemContent (only added to the wider GameItem union), and a plain selection function over unlocked GrammarEntry values — not GameItemSource, and not the dynamic template generator.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/compositionSelection.ts
  - src/domain/game/services/compositionSelection.test.ts
status: draft
task_id: "3.1"
task_status: pending
depends_on: ["2.1"]
size: medium
verify:
  - npm test -- src/domain/game
  - npm run build
ac_enforcement:
  - "AC1 -> a case: a fixture GrammarEntry whose cards.application.correctExample-indexed example carries a `words` breakdown, asserting the produced item's tiles are a PERMUTATION of that example's Thai words (same multiset as correctOrder — exact order is AC5's job, not this one, since a 2-tile entry's shuffle is 50% likely to equal the original and a not.toEqual assertion here would be flaky)"
  - "AC2 -> a case: a fixture GrammarEntry whose correctExample-indexed example has no `words` but a LATER example does, asserting the function falls back to that example rather than skipping the entry"
  - "AC3 -> a case: a fixture GrammarEntry with no example carrying `words` at all, asserting the entry is excluded from the selectable set rather than producing a broken item"
  - "AC4 -> a case: zero unlocked grammar entries passed in, asserting an empty result, not a throw"
  - "AC5 -> a case with a seeded RandomSource asserting the exact tile shuffle order for one fixture entry, not a statistical sample"
  - "AC6 -> a case requesting more items than eligible entries, asserting the result is capped at the eligible count (reuses sampleWithoutReplacement's own already-tested clamp rule, verified here only at the call site)"
  - "AC7 -> a case: a fixture GrammarEntry whose cards.application.correctExample index is out of range for its own examples array, asserting the function falls back to the first words-bearing example rather than throwing on the out-of-bounds access"
  - "AC8 -> none — that CompositionItemContent is absent from GameItemContent's union (and therefore from GameItemSource/assignDirection/weightOfFor) is a structural property checked by reading domain/game/types.ts, not a runtime assertion; see architecture.test.ts for the enforced half of this (no domain/game file outside this one and PlayGameUseCase.ts references CompositionItemContent)"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 3.1 — Composition selection over unlocked grammar points

## Description

**Revised after panel review found this task's own type change quietly
undid its central architectural decision.** Read CONTEXT.md's
`GameItemContent`/`GameItem` split before writing anything: `type GameItem
= SourcedGameItem | CompositionGameItem` — `CompositionItemContent`/
`CompositionGameItem` are added **only** to `GameItem`, never to
`GameItemContent`. `GameItemContent` is exactly `GameItemSource
.eligibleContent()`'s return type, consumed by `assignDirection` and
`weightOfFor` — composition items are never produced by a
`GameItemSource` and never flow through that pipeline, so adding them to
`GameItemContent` would (a) force dead `case "composition":` branches
into those two functions and (b) let `weightOfFor` be handed a shape it
can never weight. Only `recordRating`/`finishRound`/`GameRatingRecord` in
`PlayGameUseCase` (task 3.2) operate on the wider `GameItem` — that reuse
is the actual point of sharing the class, and it does not require
`CompositionItemContent` to be part of `GameItemContent`.

**`getUnlockedGrammarPoints()`'s eligibility is also corrected from an
earlier draft.** It is prerequisite-gated *and* learned-prefix-gated (it
reads `cardRepo.findAll("grammar")`) — it is not true that no SRS card is
involved at all. The reason this selection function is still not a
`GameItemSource` is narrower and still sound: the interface promises
per-item card eligibility, and this is a set-level computation over
prerequisites and a learned prefix, not that. See CONTEXT.md.

Add to `types.ts`:
- `CompositionItemContent`: `{ kind: "composition"; grammarId: string;
  englishMeaning: string; tiles: readonly string[]; correctOrder:
  readonly string[] }` — **no `audioUrl` field** (grammar examples carry
  no per-example audio; a field specified to always be `undefined`
  invites a future reader to try playing it) and **no
  `challengeDirection` on the content type** (same content/direction
  split as every other kind — see CONTEXT.md).
  `CompositionChallengeDirection` is a single-literal type (e.g.
  `"build"`). `CompositionGameItem = CompositionItemContent & {
  challengeDirection: CompositionChallengeDirection }`.
- `type GameItem = SourcedGameItem | CompositionGameItem` (replacing
  whatever flat union existed before this task) — `SourcedGameItem` is the
  four kinds `GameItemContent` already covers after phases 1-2.

Implement `selectCompositionRound(unlockedGrammarPoints: readonly
GrammarEntry[], count: number, rng: RandomSource = Math.random):
CompositionGameItem[]` in `src/domain/game/services
/compositionSelection.ts` — it receives an already-filtered
`GrammarEntry[]` as a plain argument (task 3.2 resolves "currently
unlocked" and passes it in), so it is testable with fixture entries only,
no `GrammarService`/`CardRepository` fixture needed:

- For each entry, choose one example with a `words` breakdown: try the
  example at `cards.application.correctExample`'s index first (the same
  pointer the shipped "application" card already treats as canonical —
  guard the index against being out of range, since
  `GrammarCardGenerator.ts` itself accesses it with `?.` for exactly this
  reason); if that example has no `words` (or the index is out of range),
  fall back to the first example in `examples` that does; if none do,
  exclude the entry.
- `tiles` is `example.words.map(w => w.thai)`, shuffled with `rng` via
  `sampleWithoutReplacement(words, words.length, {rng})` — reuse the
  existing, already-tested primitive rather than writing a second shuffle.
  `correctOrder` is the unshuffled list. `englishMeaning` is
  `example.english`.
- Sample `count` of the resulting items using
  `sampleWithoutReplacement` again.

## Acceptance Criteria

- AC1: A canonical example with `words` produces tiles that are a
  permutation of `correctOrder` (same multiset — exact order is AC5's
  job).
- AC2: Canonical example without `words`, a later one with: falls back
  correctly.
- AC3: No example with `words`: entry excluded.
- AC4: Zero unlocked entries: empty, no throw.
- AC5: Tile shuffle order matches a seeded source's exact permutation.
- AC6: Over-request: capped at eligible count.
- AC7: An out-of-range `correctExample` index falls back rather than
  throwing.
- AC8: `CompositionItemContent` is absent from `GameItemContent`.

## Architectural Decision

**Not a `GameItemSource`**, for the interface-contract reason stated
above — this is the only argument the decision rests on; an earlier
draft additionally (and incorrectly) claimed `getUnlockedGrammarPoints()`
requires no SRS card at all, which is false and has been struck.

**`CompositionItemContent` kept out of `GameItemContent`**: the
interface's return type is a promise about what a `GameItemSource`
produces; composition is deliberately not one, so its content type
belongs only in the wider `GameItem` union `PlayGameUseCase` operates on.

**Tile shuffle reuses `sampleWithoutReplacement`** rather than a bespoke
shuffle — one less algorithm to test, and it inherits that function's
already-proven clamp/uniform-sampling behavior.

**Composition rounds are structurally small** — one item per unlocked
grammar entry, and the unlocked set is often a single entry for a learner
early in grammar. This is not a bug to fix here; it is the honest supply
this mode has, and task 3.3 states the resulting UI behavior (requesting
more than available) explicitly rather than leaving `count` clamping to
read as a silent shortfall.

## Test Cases

- Canonical example with `words`: tiles are a permutation, `correctOrder`
  matches.
- Canonical without `words`, later one with: falls back correctly.
- No example with `words`: entry excluded.
- Zero unlocked entries: empty, no throw.
- Seeded shuffle: exact expected permutation.
- Over-request: capped at eligible count.
- Out-of-range `correctExample` index: falls back, no throw.
- `CompositionItemContent` is not part of `GameItemContent`.
