---
doc_type: reference
title: "Task 1.1 — Sentence domain model + item source"
description: Extend GameCardPool/GameItemContent with a sentence member (content separate from direction), convert three ternaries to exhaustive switches, and fix the persisted-history pool allowlist before it can corrupt real data.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/SentenceGameItemSource.ts
  - src/domain/game/services/SentenceGameItemSource.test.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.test.ts
status: draft
task_id: "1.1"
task_status: complete
depends_on: []
size: large
verify:
  - npm test -- src/domain/game
  - npm test -- src/infrastructure/persistence/StorageGameHistoryRepository
  - npx tsc --noEmit -p tsconfig.domain-check.json
ac_enforcement:
  - "AC1 -> a case in GameItemSelectionService.test.ts requesting pools including \"sentence\", asserting the returned items' kind/fields match SentenceGameItem's shape"
  - "AC2 -> a case in SentenceGameItemSource.test.ts: a fixture with two sentence cards for one sentenceId under differing SentenceProperty values, asserting the produced content's thaiText/englishMeaning/audioUrl come from the injected SentenceEntry, never from either card's own question/correctAnswer"
  - "AC3 -> a case asserting an audio-less sentence's assigned direction is \"reading\" while a counting RandomSource records ZERO calls for it (no randomness is spent, matching the existing audio-less-symbol rule exactly) — plus a case running SentenceGameItemSource against the REAL sentences.json, asserting every produced item is assigned \"reading\" (today's data has no audio at all; this is a regression guard, not a statistical sample)"
  - "AC4 -> a case with a seeded RandomSource asserting the exact sequence of assigned directions for a fixture of sentence items WITH audio, not a statistical sample"
  - "AC5 -> all of the existing GameItemSelectionService.test.ts cases (script/vocab/mix, from the original game-modes plan) pass unmodified, enforced by npm test (npx tsc --noEmit -p tsconfig.domain-check.json covers the domain-layer type-check; the plan's whole-app npm run build gate is deferred to task 1.3, the task that actually closes the union over presentation) rather than a rewritten expectation"
  - "AC6 -> a case: a sentence card whose sentenceId has no matching SentenceEntry in the injected data is excluded from eligibility, never turned into an item with empty/undefined content"
  - "AC7 -> a case in PlayGameUseCase.test.ts: with prioritizeWeakItems true and a seeded rng, a low-ease sentence card is drawn ahead of a high-ease one — proving itemKeyOfCard's new sentence branch actually contributes real weight, not the neutral fallback"
  - "AC8 -> the critical case, in StorageGameHistoryRepository.test.ts: an entry with pools: [\"sentence\"] saved through the REAL LocalStorageJsonStore (not InMemoryJsonStore) is read back as {status:\"ok\"} on a fresh repository instance, and a SEPARATE prior entry with pools: [\"script\"] already in the store is still present and unchanged afterward"
  - "AC9 -> none — exhaustiveness is a compile-time property (a `never`-typed default branch), not something a runtime test observes; verified by reading the four function bodies, the same way the original plan's AC6 (domain purity) was verified by src/domain/game/architecture.test.ts rather than a behavioral test"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.1 — Sentence domain model + item source

## Description

This is the seam for this phase, and — after panel review of an earlier
draft — the task that fixes a critical pre-existing risk this plan's own
`"sentence"` pool addition would otherwise trigger. Read `CONTEXT.md` in
full before touching anything; it names every file below and the exact
mistake an earlier draft made in each.

**1. Domain model.** Read `src/domain/game/types.ts` in full. Add:

- `SentenceItemContent` to `GameItemContent`'s union: `{ kind: "sentence";
  sentenceId: string; thaiText: string; englishMeaning: string; audioUrl?:
  string }` — **no `challengeDirection` field on the content type itself**
  (see CONTEXT.md's content-vs-item split). `SentenceChallengeDirection =
  "listening" | "reading"`. `SentenceGameItem = SentenceItemContent & {
  challengeDirection: SentenceChallengeDirection }`, added to `GameItem`'s
  `SourcedGameItem` member.
- `"sentence"` to `GameCardPool` (`Extract<CardPool, "script" | "vocab" |
  "sentence">`).

**2. `SentenceGameItemSource`** (mirrors `SymbolGameItemSource.ts`):
eligibility from `CardRepository.findAll("sentence")`, deduped by
`sentenceId`; content from a constructor-injected `SentenceEntry[]`
(matching how `AppContext.tsx` already loads `sentenceData` for
`SentenceService`).

**3. Exhaustive switches.** Convert `GameItemSelectionService.ts`'s
`assignDirection`, `itemKeyOfContent`, and `itemKeyOfCard` — and
`PlayGameUseCase.ts`'s `itemKeyOf` — from two-armed ternaries to exhaustive
`switch (kind)` statements (or `instanceof` chains for the card-based
ones) ending in a `default: { const _never: never = x; throw ... }`
branch. Do this **now**, even though only a `"sentence"` branch is needed
this task, so phases 2 and 3 get a compile error at the exact line they
must edit instead of a silent fallthrough. Extend `assignDirection` with
the sentence rule: no audio → always `"reading"`, no randomness spent;
otherwise 50/50 via the existing `RandomSource`. Extend `itemKeyOfCard`
with a `SentenceReviewCard` branch (`sentence:${card.sentenceId}`) so
weak-item weighting actually scores sentence cards instead of falling back
to the neutral weight.

**4. The storage fix — read this even if you think it's out of scope.**
`src/infrastructure/persistence/StorageGameHistoryRepository.ts` hard-codes
`GAME_CARD_POOLS: readonly GameCardPool[] = ["script", "vocab"]` for its
persisted-entry shape guard, and that guard fails the **entire stored
array** if one entry fails it. Widening `GameCardPool` above does **not**
make `tsc` catch this. Fix it in the same task that widens the type:
derive the allowlist so a future pool is a compile error (e.g. build it
from a `Record<GameCardPool, true>` literal and read its keys, rather than
a hand-maintained array), so this exact mistake cannot recur when a fourth
pool arrives. AC8 is the proof this actually works, through the real
`LocalStorageJsonStore` — not the guard-less `InMemoryJsonStore` every
`renderWithApp`-based test uses, which cannot see this class of bug at
all.

## Acceptance Criteria

- AC1: Requesting a pool set including `"sentence"` returns items with
  `kind: "sentence"` and the fields above, when sentences are eligible.
- AC2: A sentence's content comes from its `SentenceEntry`, never from any
  individual `SentenceCard`'s own fields.
- AC3: An audio-less sentence is always `"reading"`, with zero randomness
  spent; against the real, shipped `sentences.json` (which has no audio at
  all today), every produced item is `"reading"` — a named regression
  guard, not a coincidence to rediscover later.
- AC4: Direction assignment for audio-bearing sentence items matches a
  seeded source's exact expected sequence.
- AC5: Every existing case in this same test file passes unmodified.
- AC6: A sentence card whose `sentenceId` has no matching data entry is
  excluded from eligibility.
- AC7: Weak-item weighting draws a low-ease sentence card ahead of a
  high-ease one — proof the new `itemKeyOfCard` branch contributes real
  weight, not the `?? 1` fallback.
- AC8: An entry with `pools: ["sentence"]` survives a round trip through
  the real `LocalStorageJsonStore`, and does not disturb a separate,
  already-stored entry.
- AC9: The four functions named above are exhaustive, not two-armed
  ternaries with an implicit default.

## Architectural Decision

**Content/direction split, not folded together**: matches the shipped
`SymbolItemContent`/`SymbolGameItem` pattern exactly — `GameItemContent`
is pre-direction content, `GameItem` intersects the direction in. Folding
`challengeDirection` into the content interface (an earlier draft's
mistake) would make `eligibleContent()` responsible for assigning
directions, which contradicts `assignDirection`'s own existence.

**Exhaustive switches over two-armed ternaries, converted now rather than
left for phase 2/3 to "discover"**: a ternary's `else` branch is an
implicit default that accepts any future kind silently; a `never`-guarded
switch turns the same situation into a compile error at the point of
addition. This is why task 1.1 — which only strictly needs a
`"sentence"` branch — converts all four functions rather than adding one
more branch to the existing shape.

**The storage-guard fix belongs here, in the task that grows
`GameCardPool`**, not deferred to whichever later task happens to touch
`StorageGameHistoryRepository.ts` next. The type and its one hand-
maintained duplicate must change together or the duplicate silently goes
stale — exactly what happened in this plan's own first draft.

## Test Cases

- Pool set including `"sentence"`: correct item shape, eligible only.
- A sentence with two differently-propertied cards: content from
  `SentenceEntry`, not either card.
- An audio-less sentence: always `"reading"`, zero rng calls; the real
  `sentences.json` produces `"reading"` for every item.
- Seeded direction assignment (audio-bearing fixture): exact sequence.
- All existing symbol/word/mix cases: unmodified, still passing.
- A sentence card with no matching data entry: excluded, not crashed on.
- Weak-item weighting: a low-ease sentence card outranks a high-ease one.
- `pools: ["sentence"]` entry round-trips through the real
  `LocalStorageJsonStore`; a separate pre-existing entry is untouched.
- The four functions are exhaustive switches, not implicit-default
  ternaries.
