---
doc_type: index
title: "Phase 2 — Word practice + pool selection"
description: Add vocab-word challenges and a symbols/words/mix pool selector, additively over task 1.1's source/sampling decomposition, with SRS isolation re-verified for vocab cards.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/WordGameItemSource.ts
  - src/domain/game/services/WordGameItemSource.test.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/presentation/context/AppContext.tsx
  - src/presentation/test-utils/renderWithApp.tsx
  - src/presentation/components/organisms/WordDictationChallenge.tsx
  - src/presentation/components/organisms/WordDictationChallenge.test.tsx
  - src/presentation/components/organisms/WordProductionChallenge.tsx
  - src/presentation/components/organisms/WordProductionChallenge.test.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
phase_id: "2"
depends_on: ["1"]
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Phase 2 — Word practice + pool selection

**Capability added**: a person can choose Symbols / Words / Mix on the game
setup screen; a Words or Mix round draws from introduced vocab words too,
presented as dictation+translate or production challenges, randomized per
item exactly as phase 1 randomizes the two symbol directions.

**End-to-end criterion**: task 2.3's AC4 — a full Words round and a full Mix
round, played through the real page, each leave the whole SRS localStorage
blob byte-identical, extending phase 1's proof (script cards only) to the
pool this phase introduces (vocab cards). This replaces the original
draft's citation of AC1 (a dispatch-only check), which review found did not
actually establish the phase's most important property.

**Would this phase stand alone?** Yes — if phase 3 were never built, this is
the full feature as originally described; weak-item prioritization is an
optional refinement on top.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 2.1 | Word pool + mix in the selection service | 1.4 |
| 2.2 | Word challenge organisms | 2.1 |
| 2.3 | Pool selector + play-page dispatch | 2.2 |

Task 1.1 (phase 1) already decided the `GameItemSource`/
`sampleWithoutReplacement` decomposition and tagged `GameItem` as a
one-member union specifically so this phase could be additive. 2.1 adds a
second `GameItemSource` and a second union member; it does not modify
phase 1's selection logic or presentation components. `depends_on: ["1.4"]`
(not just task 1.1) because 2.1 relies on the whole phase-1 seam — including
the `AppContext.tsx` wiring 1.4 established — being in place.
