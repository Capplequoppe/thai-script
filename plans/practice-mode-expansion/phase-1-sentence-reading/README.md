---
doc_type: index
title: "Phase 1 — Sentence reading, end to end"
description: A third combinable pool (Sentence Reading) on the existing /game setup screen, listening/reading directions, SRS isolation re-proven for sentence cards.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/domain/game/services/SentenceGameItemSource.ts
  - src/domain/game/services/SentenceGameItemSource.test.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/presentation/context/AppContext.tsx
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/SentenceListeningChallenge.tsx
  - src/presentation/components/organisms/SentenceListeningChallenge.test.tsx
  - src/presentation/components/organisms/SentenceReadingChallenge.tsx
  - src/presentation/components/organisms/SentenceReadingChallenge.test.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/test-utils/renderWithApp.tsx
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.test.ts
phase_id: "1"
depends_on: []
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Phase 1 — Sentence reading, end to end

**Capability added**: on the existing `/game` setup screen, a person can
check "Sentence Reading" (alongside or instead of Symbols/Words), play a
round of introduced sentences presented as either listening (hear it,
reveal Thai text + English) or reading (see the Thai text, say it, reveal
audio) challenges, self-rate, see a summary, and find it in history — with
`localStorage["thai-srs-state"]` byte-identical before and after, proven for
sentence cards specifically, and with the persisted round itself surviving
a real read-back (not just a fixture-level one — the phase's own review
found the storage guard would otherwise silently corrupt every learner's
game history the first time this pool was used; task 1.1 fixes it, task
1.3's AC12 proves the fix holds end to end). Every sentence in the shipped
data is currently audio-less, so "listening" is a real, tested, but
currently unreachable direction — see CONTEXT.md.

**End-to-end criterion**: task 1.3's AC5 (SRS-blob byte-identity for a
Sentence-Reading-only and a mixed Symbols+Sentence round) together with
AC12 (the same round surviving a real history read-back), both played
through `GamePage` inside the real `AppProvider`.

**Would this phase stand alone?** Yes — a complete, independently useful
addition to the existing feature.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 1.1 | Sentence domain model + item source | — |
| 1.2 | Wire sentence rounds through PlayGameUseCase | 1.1 |
| 1.3 | Sentence challenge organisms + multi-select pool picker | 1.2 |

1.1 is the seam: it extends `GameCardPool`/`GameItem` and
`GameItemSelectionService`'s `assignDirection` — both existing, shipped
files — additively, the same way the original plan's task 2.1 added the
`"word"` member without touching the `"symbol"` member's behavior.
