---
doc_type: index
title: "Phase 3 — Sentence composition"
description: A separate practice mode, gated on which grammar points are currently unlocked, that builds one of the grammar point's own example sentences by tile-tapping and self-rating.
covers:
  - src/domain/game/types.ts
  - src/domain/game/ports/GameHistoryRepository.ts
  - src/domain/game/services/compositionSelection.ts
  - src/domain/game/services/compositionSelection.test.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/presentation/context/AppContext.tsx
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.test.ts
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/SentenceCompositionChallenge.tsx
  - src/presentation/components/organisms/SentenceCompositionChallenge.test.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/test-utils/renderWithApp.tsx
phase_id: "3"
depends_on: ["2"]
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Phase 3 — Sentence composition

**Capability added**: a "Sentence Composition" mode switch on the `/game`
page, separate from the Practice pool-mixing flow, offering a round built
from currently-**unlocked** grammar points (prerequisites met **and** a
learned prefix — `GrammarLessonService.getUnlockedGrammarPoints()` does
read grammar cards; see CONTEXT.md for the precise, corrected rule). Each
item presents an English gloss and a shuffled set of Thai word tiles from
that grammar point's own example sentence; the learner taps tiles to
build it, then sees the correct arrangement and self-rates with
`RatingButtons` — no automatic correctness check. Because the unlocked
set is often small, a composition round is genuinely tiny for most
learners (as few as one item) — this is stated behavior, not a defect
(task 3.1's Architectural Decision, task 3.3's AC5).

**End-to-end criterion**: task 3.3's AC4 (SRS-blob byte-identity for a
full composition round through the real page) together with AC7 (the
same round's history entry actually carries `kind: "composition"`,
proving `GamePage`'s save-history call site branches on mode rather than
always taking the practice-shaped path).

**Would this phase stand alone?** Its capability is independent of
phases 1-2 except for reusing phase 1's multi-select setup-screen
refactor. It is *sequenced* after phase 2 anyway — `depends_on: ["2"]`
is a phase-level dependency, not a design one: tasks in this phase and
phase 2 both edit `src/domain/game/types.ts`, `PlayGameUseCase.ts`, and
`GamePage.tsx`. Without it the two phases would be concurrent-eligible
with overlapping `covers` — two blank executors editing the same shared
files with no way to agree on the result.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 3.1 | Composition selection over unlocked grammar points | 2.1 |
| 3.2 | Wire composition rounds through PlayGameUseCase + history schema | 3.1 |
| 3.3 | Composition organism + mode switch | 3.2 |

3.1's `depends_on: ["2.1"]` (not `["1.1"]`, an earlier draft's mistake)
is deliberate: both 2.1 and 3.1 edit `src/domain/game/types.ts`, so 3.1
must wait for 2.1 specifically, not just phase 1 — otherwise the two
would be concurrent-eligible on the same file despite the phase-level
gate naming a different reason. 3.1 is this phase's seam: it defines the
composition item shape (kept out of `GameItemContent`, added only to the
wider `GameItem` union — see CONTEXT.md) and a plain selection function
deliberately **not** implementing `GameItemSource` (that interface's
contract, "eligible because a card exists for *this* item," does not
describe a set-level, prerequisite-and-learned-prefix computation).
