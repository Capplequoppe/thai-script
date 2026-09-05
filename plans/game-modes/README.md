---
doc_type: index
title: Game modes — self-graded practice rounds
description: Add configurable, self-graded practice rounds (symbols and vocab words, both directions) that never touch SRS scheduling state.
covers:
  - src/domain/game
  - src/application/use-cases/PlayGameUseCase.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/presentation/pages/GamePage.tsx
  - src/presentation/components/organisms/SymbolDictationChallenge.tsx
  - src/presentation/components/organisms/SymbolReadingChallenge.tsx
  - src/presentation/components/organisms/WordDictationChallenge.tsx
  - src/presentation/components/organisms/WordProductionChallenge.tsx
  - src/presentation/components/organisms/GameRoundSummary.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
status: draft
planner_model: claude-sonnet-5
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Game modes — self-graded practice rounds

A person can already run SRS reviews of introduced Thai script symbols and
vocab words. This plan adds a separate **practice game**: randomized,
self-graded drilling rounds over the same already-introduced items, whose
outcome is shown as a score and logged to its own history — and **never**
feeds back into the SRS schedule.

Four challenge directions exist across two item pools:

- Symbols (consonants, vowels, tone marks): **dictation** (hear it, write it)
  and **reading** (see it, say it, hear the reveal).
- Vocab words: **dictation+translate** (hear it, write the Thai spelling and
  the English meaning) and **production** (see the English, write the Thai
  spelling and say it, hear/see the reveal).

Within a round, which direction applies to a given item is randomized 50/50 —
not a setup choice. Setup configures: pool (symbols / words / mix), item
count, an off-by-default "prioritize weak items" toggle, and an input-mode
toggle (draw on the existing canvas vs. write on paper and just tap through to
the reveal). Only items that already have an SRS card are eligible.

## Trust Boundary Inventory — omitted, with reason

This feature introduces no network fetch, file read, CLI argument, or
inter-process input, so no formal inventory table is required (see
execution-plans format spec §5). Panel review (see `reviews/SUMMARY.md`)
found two boundaries worth naming explicitly even though neither rises to a
table row:

- **The item-count field** reaches `GameItemSelectionService`'s sampling
  directly. It is covered by an explicit domain-level clamp/floor rule
  (task 1.1 AC9) and a UI-level constraint (task 1.4 AC8), not left as an
  implicit assumption.
- **The new `thai-srs-game-history` localStorage key** is a persisted,
  externally-editable blob, exactly the kind of input this app already
  treats as untrusted elsewhere (`Validation.ts`'s `validateLearnerState`
  for the SRS blob). It is read through a validating `JsonStore` (task 1.2)
  that distinguishes a corrupt read from an empty one — never a bare
  `JSON.parse` — and rendered through a distinct "history unavailable" UI
  state (task 1.4 AC5) rather than silently collapsing into "no games played
  yet".

## Phases

| Phase | Name | Depends on |
|---|---|---|
| 1 | Symbol practice round, end to end | — |
| 2 | Word practice + pool selection (symbols / words / mix) | 1 |
| 3 | Prioritize-weak-items weighting | 2 |

Each phase is a complete, playable capability: phase 1 alone is a usable
symbols-only practice game; phase 2 adds words and the pool choice on top of
the same setup/play/summary/history seam phase 1 builds; phase 3 adds one
optional weighting refinement to selection. No phase's criteria are internal
build steps — each has an end-to-end criterion a person can act out from
`/game` to the summary screen to the persisted history entry.

## test-templates

```test-templates
vitest | src/** | npx vitest run {file} --reporter=verbose --hideSkippedTests -t {name}
```
