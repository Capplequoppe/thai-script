---
doc_type: index
title: "Phase 2 — Tone identification"
description: An off-by-default toggle, combinable with any pool selection, that draws introduced vocab words and asks the learner to self-rate their whole-word tone identification.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/ToneGameItemSource.ts
  - src/domain/game/services/ToneGameItemSource.test.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/domain/vocabulary/services/toneSyllables.ts
  - src/domain/vocabulary/services/toneSyllables.test.ts
  - src/domain/vocabulary/services/VocabCardGenerator.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/presentation/context/AppContext.tsx
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/ToneIdentificationChallenge.tsx
  - src/presentation/components/organisms/ToneIdentificationChallenge.test.tsx
  - src/presentation/test-utils/renderWithApp.tsx
phase_id: "2"
depends_on: ["1"]
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Phase 2 — Tone identification

**Capability added**: a "Tone Identification" checkbox on the setup screen
(off by default, alongside the pool checkboxes but not one of them — see
CONTEXT.md for why) that, when checked, mixes tone-identification items
into the round: a word shown and played, the learner self-rates whether
they correctly identified its whole tone pattern, and the reveal shows each
syllable's tone.

**End-to-end criterion**: task 2.3's AC5 — a full round with the toggle
checked, played through the real page, reaching a summary and history
entry, with the SRS blob byte-identical afterward.

**Would this phase stand alone?** Its capability is independent of phase 1
(tone identification needs nothing sentence-specific). It is *sequenced*
after phase 1 anyway, and `depends_on: ["1"]` is a phase-level dependency,
not a design one: task 2.1 edits `src/domain/game/types.ts`,
`GameItemSelectionService.ts`, and (through 2.2/2.3)
`PlayGameUseCase.ts`/`GamePage.tsx` — the same files phase 1's tasks edit.
Without the phase-level gate, 2.1 and phase 1's tasks would be
concurrent-eligible with overlapping `covers`, which `plan check` flags as
`covers_overlap`. Serializing after phase 1 removes that risk the same way
phase 3's `depends_on: ["2"]` does for the same reason.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 2.1 | Tone domain model + item source | 1.1 |
| 2.2 | Wire tone items through PlayGameUseCase | 2.1 |
| 2.3 | Tone identification organism + setup toggle | 2.2 |

2.1 is additive over the same `GameItemSelectionService`/`sampling.ts`
seam phase 1 (and the original plan) already established — no existing
selection logic changes shape, only gains one more conditionally-included
source, consulted through its own constructor parameter rather than the
pool-keyed `sources` array (see CONTEXT.md).
