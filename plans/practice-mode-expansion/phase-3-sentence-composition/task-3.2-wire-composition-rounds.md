---
doc_type: reference
title: "Task 3.2 — Wire composition rounds through PlayGameUseCase + history schema"
description: Add a REQUIRED unlocked-grammar-points provider and startCompositionRound (reusing recordRating/finishRound generically), and normalize GameHistoryEntry's kind at the repository boundary so no consumer needs its own back-compat rule.
covers:
  - src/domain/game/types.ts
  - src/domain/game/ports/GameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.test.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/presentation/context/AppContext.tsx
  - src/presentation/test-utils/renderWithApp.tsx
status: draft
task_id: "3.2"
task_status: pending
depends_on: ["3.1"]
size: large
weight_votes:
  - "author -> 8"
verify:
  - npm test -- src/domain/game
  - npm test -- src/infrastructure/persistence/StorageGameHistoryRepository
  - npm test -- src/application/use-cases/PlayGameUseCase
  - npm run build
ac_enforcement:
  - "AC1 -> a case recording a rating for a composition item, asserting the itemKey is composition:{grammarId}"
  - "AC2 -> a case calling PlayGameUseCase.startCompositionRound with a fixture unlocked-grammar-points provider and a seeded rng, asserting it returns an EXACT, literal list of items for that fixture/seed — not merely that it matches whatever selectCompositionRound happens to return (a delegation-mirroring assertion passes for a broken wrapper as long as both sides share the bug)"
  - "AC3 -> a case: constructing PlayGameUseCase WITHOUT the unlockedGrammarPoints argument is a TypeScript compile error (the parameter is required, not optional) — verified by the type signature itself, ac_tests: none needed beyond npm run build"
  - "AC4 -> the critical case, in StorageGameHistoryRepository.test.ts: a store seeded with (a) one legacy entry with no kind field at all, (b) one entry with kind:\"practice\", and (c) one entry with kind:\"composition\" and no pools field, all through the REAL LocalStorageJsonStore, asserts list() returns {status:\"ok\"} with all three entries present, the legacy entry's kind normalized to \"practice\", most-recent-first"
  - "AC5 -> a case: playing two rounds — one practice, one composition — back to back on the same PlayGameUseCase instance, asserting each produces its own correctly-typed history entry, neither overwriting the other"
  - "AC6 -> none"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 3.2 — Wire composition rounds through PlayGameUseCase + history schema

## Description

**Revised twice after panel review**: the grammar-unlock provider was
optional (creating an untested "never asked" state); and `kind` was an
optional discriminant on the domain type (pushing the legacy-entry rule
onto every consumer instead of the repository). Both are fixed below.

Read `PlayGameUseCase.ts` in full — `recordRating`/`finishRound` are
already generic over any `GameItem` and need **no change**; only
`itemKeyOf` (add a `"composition"` branch using `item.grammarId`, as an
exhaustive switch per task 1.1's conversion) and `saveHistory`/
`GameHistoryEntry` need new logic.

Add `startCompositionRound(count: number, rng?: RandomSource): GameItem[]`
to `PlayGameUseCase`, delegating to task 3.1's `selectCompositionRound`.
Give the constructor a **required** new parameter —
`unlockedGrammarPoints: () => readonly GrammarEntry[]` — read fresh on
each call (unlock status can change between rounds). **Required, not
optional**: an earlier draft made it optional "so every construction site
keeps compiling," which review found creates exactly the failure it was
trying to avoid — every `renderWithApp` factory silently ran with the
provider absent, and a real `AppContext.tsx` wiring regression would
present to a learner as "nothing unlocked yet," permanently, with a green
test suite. There is exactly one real construction site
(`AppContext.tsx`) and a handful of `renderWithApp` factories — update
them together in this task; existing tests that don't care about
composition can pass `() => []`.

Update `PlayGameUseCase`'s class doc comment: the "no `CardRepository` is
ever received here" claim is now narrower — this class receives no
`CardRepository` and no object capable of writing one; the grammar
provider is a read-only capability (a function returning data), not the
service itself. State this explicitly rather than leaving the broader,
now-inaccurate claim in place.

**`GameHistoryEntry` schema change — normalized at the repository
boundary, not left optional:**

```
interface PracticeHistoryEntry {
  kind: "practice";           // required
  id: string; playedAt: string;
  pools: readonly GameCardPool[]; itemCount: number;
  summary: GameRoundSummary;
}
interface CompositionHistoryEntry {
  kind: "composition";        // required
  id: string; playedAt: string; itemCount: number;
  summary: GameRoundSummary;
}
```

`StorageGameHistoryRepository`'s shape guard accepts a persisted entry
with `kind` absent, `"practice"`, or `"composition"` — anything else is
rejected — and its **read path** (`list()`) fills in `kind: "practice"`
for any entry it accepts with `kind` absent, before returning it. No
other code, anywhere, ever sees an entry with `kind` missing. This is the
fix for the same defect class task 1.1 already fixed for the `pools`
allowlist: back-compat handled once, at the boundary, not by every
consumer independently.

`saveHistory` gains a composition-shaped overload (or one signature
covering both, the caller states which kind it is). Wire the new
dependency in `AppContext.tsx`: `() =>
grammarService.getUnlockedGrammarPoints()`.

## Acceptance Criteria

- AC1: A composition item's `itemKey` is `composition:{grammarId}`.
- AC2: `startCompositionRound` returns an exact, literal list for a fixed
  fixture/seed.
- AC3: Constructing `PlayGameUseCase` without the grammar provider is a
  compile error.
- AC4: A mixed store — legacy no-`kind`, explicit practice, composition —
  read through the real guard returns all three, legacy normalized to
  practice, most-recent-first.
- AC5: A practice round and a composition round on one instance each
  produce their own correctly-typed entry.
- AC6: `AppContext.tsx`'s wiring change (constructing `PlayGameUseCase`
  with the grammar-unlock provider) is additive only — no existing wiring
  line changes.

## Architectural Decision

The grammar provider is a lazy, **required** function — read fresh at
call time (unlock status changes), and required so its absence is a
compile error rather than a silently-degraded "nothing unlocked" state
(see Description; this reverses an earlier draft's optional-parameter
choice after review).

`kind` is required on both history-entry variants, with normalization
living in `StorageGameHistoryRepository.list()` alone. This is the
narrower, correct version of the original game-modes plan's own
back-compat lesson: an *optional* discriminant (`kind?: "practice"`) is a
weak one — `entry.kind === "practice"` is `false` for every legacy entry,
which is exactly the shape a consumer gets wrong by writing the natural
code. Making it required and normalizing once removes the possibility.

## Test Cases

- Composition item rating: correctly keyed.
- `startCompositionRound`: exact literal output for a fixture/seed.
- Missing grammar provider: `tsc` error.
- Mixed store (legacy + practice + composition) through the real guard:
  all three returned, legacy normalized, correct order.
- Practice then composition round, same instance: two distinct,
  correctly-typed entries.
