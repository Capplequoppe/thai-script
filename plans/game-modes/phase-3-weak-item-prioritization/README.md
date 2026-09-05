---
doc_type: index
title: "Phase 3 — Prioritize-weak-items weighting"
description: An off-by-default setup toggle that biases round selection toward items with lower ease-factor / higher lapse count, additive over task 1.1's sampler.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/itemWeight.ts
  - src/domain/game/services/itemWeight.test.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/domain/game/test-fixtures/weakStrongFixture.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
phase_id: "3"
depends_on: ["2"]
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Phase 3 — Prioritize-weak-items weighting

**Capability added**: a "Prioritize weak items" toggle on the game setup
screen (off by default) that, when on, biases which symbols/words are chosen
for a round toward the ones with a lower ease factor / higher lapse count —
reusing the same statistics `ReviewService.getCriticalItems` reads, through
`CardRepository` directly, never by calling `ReviewService` itself.

**End-to-end criterion**: task 3.2's AC2 — with the toggle on, a round
played through the real page draws its items from the shared weak/strong
fixture in a way that matches task 3.1's own established weighted-sampling
expectation. (A prior draft of this README cited AC1, which is actually the
default/off case — corrected here after panel review.)

**Would this phase stand alone?** Yes — it is a narrow, optional enhancement
over the already-complete phase 2 feature.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 3.1 | Weighted selection | 2.3 |
| 3.2 | Prioritize-weak-items toggle | 3.1 |

3.1 is additive over task 1.1's already-parameterized
`sampleWithoutReplacement` — it supplies a `weightOf` function, it does not
change the sampler's signature. `3.1 depends_on: ["2.3"]` (not just phase 2
in general) because its own AC1 ("behaves exactly as phases 1 and 2 already
established") is only meaningful once phase 2's pool selector is actually
wired.
