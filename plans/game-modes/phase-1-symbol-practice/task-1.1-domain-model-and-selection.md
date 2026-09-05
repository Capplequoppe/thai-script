---
doc_type: reference
title: "Task 1.1 — Domain model + symbol selection service"
description: Define the game-round domain types, a source/sampling decomposition, and a symbol content source that reads canonical content from symbols.ts rather than from property-specific cards.
covers:
  - src/domain/game/types.ts
  - src/domain/game/ports/GameHistoryRepository.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/domain/game/services/sampling.ts
  - src/domain/game/services/sampling.test.ts
  - src/domain/game/services/SymbolGameItemSource.ts
  - src/domain/game/services/SymbolGameItemSource.test.ts
  - src/domain/game/architecture.test.ts
status: draft
task_id: "1.1"
task_status: complete
depends_on: []
size: large
verify:
  - npm test -- src/domain/game
  - npm run build
ac_enforcement:
  - "AC1 -> a case in GameItemSelectionService.test.ts asserting the returned list's length and distinct symbolCharacters when the requested count is <= the eligible count, using a seeded RandomSource"
  - "AC2 -> a case asserting the returned length equals the eligible count when the requested count exceeds it, with no throw"
  - "AC3 -> a case asserting an empty array (not a throw) when zero script cards exist"
  - "AC4 -> a case with a seeded RandomSource asserting the exact sequence of assigned directions (not a statistical sample)"
  - "AC5 -> a case with two script cards sharing one symbolCharacter under two different PropertyType values, asserting that character is selected at most once per round"
  - "AC6 -> src/domain/game/architecture.test.ts: reads every .ts file under src/domain/game/ and asserts no import specifier matches /(presentation|application|infrastructure)/ — replaces the prior draft's reliance on `tsc`, which does not check import direction"
  - "AC7 -> a case in SymbolGameItemSource.test.ts: a fixture with three script cards for one symbol under differing properties (each with a different question/correctAnswer), asserting the produced content's promptText/correctAnswer/audioUrl come from symbols.ts, never from any card's own fields"
  - "AC8 -> a case asserting a symbol with no audioUrl on its symbols.ts entry is never assigned challengeDirection \"dictation\", across a seeded run long enough to be conclusive"
  - "AC9 -> cases in GameItemSelectionService.test.ts requesting counts of 0, -1, 2.5, NaN and 1e9 against a 5-eligible-item fixture, asserting the stated clamp/floor behavior (or throw — whichever this task settles on) for each"
  - "AC10 -> a case in sampling.test.ts asserting sampleWithoutReplacement with no weightOf behaves identically to uniform sampling (every permutation reachable, none favored) against a seeded RandomSource"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.1 — Domain model + symbol selection service

## Description

This is the seam for the whole plan, revised after panel review found the
original draft under-specified where item *content* comes from and left the
selection service positioned to accrete responsibility across all three
phases. This version fixes both by deciding the decomposition now.

Read `src/domain/session/services/ReviewService.ts` for the port-based
service style to imitate. Read `CONTEXT.md`'s "Cards decide eligibility; the
data files decide content" section before writing anything — it is the rule
this task exists to implement.

### Decomposition (this is the point of this task)

- **`RandomSource`**: `() => number` returning `[0, 1)`, defaulting to
  `Math.random` wherever accepted. Introduced here — not in a later phase —
  because this task's own tests need it to be deterministic (see AC4).
- **`GameItemSource`** (interface): `{ pool: GameCardPool; eligibleContent():
  GameItemContent[] }`. This task implements exactly one:
  `SymbolGameItemSource`, over `CardRepository` (for eligibility — dedupe by
  `symbolCharacter`) and the `consonants`/`vowels`/`toneMarks` arrays from
  `src/domain/script/data/symbols.ts` (for content — imported directly, a
  domain→domain import of a small static export, not a large data file
  needing injection). A symbol's content (`promptText`, `correctAnswer`,
  `audioUrl`) is its `ThaiSymbol.name`/`.audioUrl` — **never** a card's own
  `question`/`correctAnswer`, which differ per `PropertyType` and would make
  the reveal content nondeterministic and sometimes wrong (e.g. a "class"
  card's answer, "low class", standing in for the symbol's name).
- **`sampleWithoutReplacement(items, count, opts?: { weightOf?: (item) =>
  number; rng?: RandomSource })`** (free function, `src/domain/game/services
  /sampling.ts`): this task implements and tests it fully with no `weightOf`
  (uniform sampling — every eligible item equally likely). Phase 3 (task 3.1)
  supplies a `weightOf` function; it does not change this function's
  signature, because the signature already accepts one. This is the whole
  point of deciding the decomposition now rather than in phase 3: task 3.1
  becomes one new function plus one call-site argument, not a rewrite of
  this file.
- **`GameItemSelectionService`**: composes an array of `GameItemSource`s
  (constructor-injected — this task registers just `[symbolGameItemSource]`)
  plus a direction-assignment step plus `sampleWithoutReplacement`. Phase 2
  (task 2.1) adds a second source to the array; it does not modify this
  class's logic.
- **Direction assignment**: a symbol's content is assigned `"dictation"`
  (hear it, write it) only if it has an `audioUrl`; otherwise it is always
  `"reading"` (an audio-less symbol can never be asked "hear it, write it" —
  there would be nothing to hear). When a symbol has audio, the direction is
  chosen 50/50 via the `RandomSource`.
- **`GameItem`**: a **one-member discriminated union** —
  `{ kind: "symbol"; ...SymbolItemContent; challengeDirection:
  "dictation" | "reading" }` — not a flat shape. A prior draft of this task
  rejected tagging the union on the grounds that phase 1's consumers are all
  in-phase; that reasoning silently assumed phase 1 is never shipped
  standalone, which contradicts the plan's own phasing claim. Tagging it now
  costs one field and makes phase 2's extension of it (task 2.1, adding a
  `"word"` member) purely additive: phase 1's own presentation code (task
  1.4) can and should type against `GameItem` directly, narrowed on
  `kind === "symbol"`, and nothing about it needs to change when phase 2
  lands.
- **History entry shape**: this task also fixes `GameRatingRecord`,
  `GameRoundSummary` (rating counts + `accuracy: number | null`, integer
  0-100 rounded half-up, `null` iff nothing was rated), and
  `GameHistoryEntry` (`id`, `playedAt` ISO timestamp, `pools:
  readonly GameCardPool[]`, `itemCount`, `summary`) — later tasks (1.2's
  ordering, 1.4's rendering, 2.3's `pool` display) all depend on this shape
  existing, so it is fixed here rather than left to whichever task happens
  to need a field next.
- **`GameHistoryRepository`** port: `list(): GameHistoryListResult` (a
  three-state result — `{status:"ok", entries}` or `{status:"unavailable"}`,
  never a bare array, so a failed read can never be silently indistinguishable
  from "no games played yet") and `save(entry): void`. Task 1.2 implements it.

## Acceptance Criteria

- AC1: Given N distinct eligible script symbols and a requested count ≤ N,
  selection returns exactly that many items, one per distinct symbol.
- AC2: Given a requested count > N, selection returns all N eligible items
  rather than throwing or repeating one.
- AC3: Given zero eligible script cards, selection returns an empty list
  rather than throwing.
- AC4: With a seeded `RandomSource`, the assigned challenge direction for
  each item in the round matches an exact, pre-computed expected sequence —
  not merely "both directions occur across many trials".
- AC5: A symbol with cards under more than one `PropertyType` is treated as
  one eligible symbol, never selected twice in the same round.
- AC6: `GameItem`, `GameRoundConfig`, `GameRatingRecord`, `GameRoundSummary`,
  `GameHistoryEntry`, and `GameHistoryRepository` are exported from
  `src/domain/game/` with no import from `presentation/`, `application/`, or
  `infrastructure/` (broadened from the prior draft's presentation-only
  scope, since an infrastructure import — e.g. reaching for
  `LocalStorageAdapter` directly from a domain service — is the likelier and
  more damaging violation).
- AC7: An item's `promptText`/`correctAnswer`/`audioUrl` come from the
  symbol's `symbols.ts` entry, never from any individual card's own fields,
  even when several differently-propertied cards exist for that symbol.
- AC8: A symbol with no `audioUrl` is never assigned the `"dictation"`
  direction.
- AC9: A non-positive, non-integer, or non-finite requested count is handled
  by a stated, tested rule (clamp to `[0, eligible]` and floor is
  recommended; a documented throw is acceptable too — pick one, the point is
  that no rule currently exists and one must).
- AC10: With no `weightOf` supplied, `sampleWithoutReplacement` samples
  uniformly (verified against a seeded `RandomSource`, not a statistical
  trial count).

## Architectural Decision

**Tagging `GameItem` now, as a one-member union.** See Description — this
converts phase 2's extension into an additive change instead of a breaking
one. This is not the "extend the union speculatively" mistake the original
draft's AD rightly warned against: no `WordGameItem` shape, no word-pool
logic, and no word-content-sourcing decision is made here. Only the tag
field is added, and it is added because a consumer of the *untagged* type
(task 1.4's presentation code) already has to exist by the time task 2.1
runs, whether or not phase 1 ships standalone.

**Deciding the source/sampling decomposition here, not letting it accrete.**
See Description. The alternative — one `GameItemSelectionService` class that
each phase adds a responsibility to — was rejected because by phase 3 it
would own symbol eligibility, symbol content, word eligibility, word content,
mix composition, direction randomization, weight computation, and weighted
sampling in one file with one test file spanning three phases' worth of
cases. Splitting it now costs one interface and one free function; splitting
it retroactively in phase 3 would cost a rewrite.

**Content from `symbols.ts`, not from cards.** See Description and
CONTEXT.md. This is not a design choice so much as the only way to make "an
item's content" a well-defined thing at all, given that a symbol's cards
disagree with each other by design (they cover different reviewable
properties on purpose).

**Port location**: `GameHistoryRepository` lives in `src/domain/game/ports/`
rather than the repo's usual flat `src/domain/ports/`, because it is
meaningful only inside the game context — unlike `CardRepository`, which is
shared across script/vocab/grammar/sentence.

## Test Cases

- Selecting fewer/more/zero eligible items: as AC1-AC3.
- Seeded direction assignment: exact expected sequence, not a trial count.
- A symbol with two differently-propertied cards: selected once, content
  from `symbols.ts` (AC7), never from either card's `question`/`correctAnswer`.
- An audio-less symbol: never assigned `"dictation"`, across a long seeded
  run.
- Degenerate requested counts (0, -1, 2.5, NaN, 1e9): the stated rule holds
  for each, and no call takes longer than a few milliseconds (rules out an
  unbounded loop/allocation on `1e9`).
- `sampleWithoutReplacement` with no `weightOf`: uniform, seeded-deterministic.
