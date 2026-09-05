---
doc_type: index
title: "Phase 1 — Symbol practice round, end to end"
description: A person can configure and play a full self-graded symbols-only practice round from /game to a persisted history entry, with the whole SRS blob byte-identical before and after, proven against the real AppProvider.
covers:
  - src/domain/game
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/infrastructure/persistence/JsonStore.ts
  - src/infrastructure/persistence/JsonStore.test.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.test.ts
  - src/presentation/App.tsx
  - src/presentation/context/AppContext.tsx
  - src/presentation/pages/Dashboard.tsx
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/SymbolDictationChallenge.tsx
  - src/presentation/components/organisms/SymbolReadingChallenge.tsx
  - src/presentation/components/organisms/GameRoundSummary.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/test-utils/renderWithApp.tsx
phase_id: "1"
depends_on: []
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Phase 1 — Symbol practice round, end to end

**Capability added**: opening `/game` (from the desktop nav or a Dashboard
quick-action card, reachable on mobile), a person can set an item count, pick
draw-on-canvas or write-on-paper, start a round drawn from their introduced
script symbols, get each item as either a dictation or reading challenge
picked randomly, self-rate each with the existing Again/Wrong/Hard/Good/Easy
buttons, see an end-of-round score, and find that round in a small persisted
history list — with `localStorage["thai-srs-state"]` byte-identical to
before the round, proven against the real `AppProvider`.

**End-to-end criterion**: task 1.4's AC1 (full item traversal) and AC4 (the
whole-SRS-blob isolation proof, through real wiring — not a fixture double).

**Would this phase stand alone?** Yes — it is a complete, playable
symbols-only practice game; words and the pool selector are additive in
phase 2, and `GameItem`, `GameItemSource`, and `sampleWithoutReplacement`
are all designed in task 1.1 specifically so that addition doesn't require
reopening this phase's code.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 1.1 | Domain model + symbol selection service | — |
| 1.2 | Game history repository | 1.1 |
| 1.3 | PlayGameUseCase | 1.1 |
| 1.4 | Symbol game presentation | 1.2, 1.3 |

1.1 is the seam: it fixes `GameItem` (tagged, one member), the
`GameItemSource`/`sampleWithoutReplacement` decomposition, and the
`GameHistoryRepository` port that 1.2 and 1.3 each build against
independently and in parallel — neither needs to invent anything the other
doesn't already have fixed for it. 1.4 additionally builds this repo's first
page-level render-test harness (`renderWithApp`), since no such
infrastructure exists yet — see `CONTEXT.md`.
