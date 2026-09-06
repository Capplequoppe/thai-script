# Plan Structure Expert Review: practice-mode-expansion

## Executive Summary

This plan is cut vertically. Each of its three phases carries one user-facing capability (sentence reading, tone identification, sentence composition) from the setup screen through domain → application → presentation to a real-`AppProvider`, SRS-byte-identical proof, and every phase pair shares `covers` files rather than partitioning the codebase by tier — the overlap signature of tracer bullets, not tiers. The one gap found is a documentation gap, not a re-slice: phase 2's whole-phase `depends_on: ["1"]` is the same shared-`covers` serialization phase 3 explicitly explains for itself, but phase 2's README never says so.

## Measured Shape

- Phase pairs sharing a `covers` path: 3/3 (1∩2: `types.ts`, `GameItemSelectionService.ts`/`.test.ts`, `PlayGameUseCase.ts`/`.test.ts`, `AppContext.tsx`, `GamePage.tsx`/`.test.tsx`; 1∩3: `types.ts`, `PlayGameUseCase.ts`/`.test.ts`, `AppContext.tsx`, `GamePage.tsx`/`.test.tsx`, `GameHistoryList.tsx`; 2∩3: `types.ts`, `PlayGameUseCase.ts`/`.test.ts`, `AppContext.tsx`, `GamePage.tsx`/`.test.tsx`)
- `plan check` §8.15 findings: none fired — neither `plan_layering` nor `phase_isolated` appears in the output (`counts.info: 6`, all six are `covers_new_paths`, expected for tasks that create new files; the other nine findings are `weight_stamp_unreadable`, a vote-provenance concern out of this review's scope)
- What the arithmetic could not see: silence here is the *expected* case for a correctly vertical plan, but silence alone cannot distinguish "these phases share one incidental file" from "these phases each thread the same domain→application→presentation seam." Reading the phase READMEs and task dependency chains confirms it's the latter — each phase's three tasks (`X.1` domain model/seam → `X.2` application wiring → `X.3` organism + UI + real-`AppProvider` proof) is a single tracer bullet, and the overlap across phases is exactly `types.ts`/`PlayGameUseCase.ts`/`GamePage.tsx` being extended again by each successive capability, matching the `vertical-slicing.md` worked example almost exactly.

## Plan-Level Findings

None.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| 1 | phase-dependency-rationale | Phase 2 | — | minor | Task 2.1's own `depends_on` names only `["1.1"]` — the actual functional dependency, the seam it extends. But phase 2's README sets `depends_on: ["1"]` at the phase level, serializing it after *all* of phase 1, for the same reason phase 3's README states explicitly for its own `depends_on: ["2"]`: phases 1 and 2 share `covers` (`types.ts`, `GameItemSelectionService.ts`, `PlayGameUseCase.ts`, `AppContext.tsx`, `GamePage.tsx`) and concurrent-eligibility would put two blank executors on the same files. Phase 2's README never says this — it only explains why task 2.1 depends on task 1.1, leaving the wider phase-level gate looking arbitrary next to a task graph that names one task. | Add one sentence to phase 2's README mirroring phase 3's: `depends_on: ["1"]` exists because of `covers` overlap with phase 1, not a design dependency beyond task 1.1. Costs nothing to move; it is a missing sentence, not a missing edge. |

## Slice Map

| Phase | What a person can do after it | End-to-end criterion | Stands alone? | Verdict |
|-------|-------------------------------|----------------------|---------------|---------|
| 1 — Sentence reading | Check "Sentence Reading" on the `/game` setup screen (alone or mixed with Symbols/Words), play a listening or reading round, self-rate, see a summary, find it in history | Task 1.3 AC5 — a full Sentence-Reading-only round and a mixed Symbols+Sentence round, played through `GamePage` inside the real `AppProvider`, leave the seeded SRS blob byte-identical | Yes (README states it explicitly) | Vertical |
| 2 — Tone identification | Check the "Prioritize tone identification" toggle alongside any pool selection, get tone items mixed into the round regardless of which pools are checked, self-rate, see each syllable's tone revealed | Task 2.3 AC5 — a full round with the toggle checked, played through the real `AppProvider`, leaves the seeded SRS blob byte-identical | Yes | Vertical |
| 3 — Sentence composition | Switch to "Sentence Composition" mode (separate from Practice), build one of a currently-unlocked grammar point's own example sentences by tapping tiles, reveal + self-rate, see a distinctly-labeled history entry | Task 3.3 AC4 — a full composition round, played through the real `AppProvider` with grammar/vocab/sentence cards all seeded, leaves the SRS blob byte-identical | Yes | Vertical |

## Collaboration Risks

None. The plan's task graph is a single serial chain — `1.1→1.2→1.3→2.1→2.2→2.3→3.1→3.2→3.3` — with each phase gated on the *entire* prior phase completing (phase-level `depends_on`), and every task within a phase depending on the one before it. No two tasks are ever concurrency-eligible, so there is no pair to check for an un-negotiable shared interface. (Phase 3's README documents this as a deliberate choice — the alternative was left concurrent-eligible with overlapping `covers` in an earlier version of the plan, caught by `plan check`'s `covers_overlap` finding and fixed by adding the phase-level dependency; see finding #1 above for the one place this same reasoning went unstated.)

## Re-slice Proposal

None. The cut is vertical: all three phase pairs share `covers` paths (the overlap-not-partition signature vertical-slicing.md's worked example describes), each phase's own tasks form a domain→application→presentation chain culminating in one real-`AppProvider`, byte-identical-SRS-blob criterion, and task 1.1 is a genuine platform task with three already-known cross-phase consumers (1.2, 2.1, 3.1) — the `GameCardPool`/`GameItem` union extension every later kind builds on. No tasks need to move.

## Exceptions Taken

None. Every phase passes all three verticality questions on its own terms; no horizontal phase requiring one of the four exceptions exists in this plan.

## Phase-by-Phase Review

### phase-1-sentence-reading
#### task-1.1-sentence-domain-model-and-source.md
- **Status**: pass — the phase's seam, and (per phase 2 and 3's `depends_on: ["1.1"]`) a genuine plan-wide platform task with three known consumers.

#### task-1.2-wire-sentence-rounds.md
- **Status**: pass — mechanical wiring, correctly scoped, serial dependency on 1.1.

#### task-1.3-sentence-challenge-organisms-and-multiselect.md
- **Status**: pass — carries the phase's end-to-end criterion (AC5) and the necessary multi-select refactor bundled with it rather than split into a separate "route vs. view" task, which is the correct call since the two cannot be demonstrated independently.

### phase-2-tone-identification
#### task-2.1-tone-domain-model-and-source.md
- **Status**: pass.

#### task-2.2-wire-tone-items.md
- **Status**: pass.

#### task-2.3-tone-organism-and-toggle.md
- **Status**: pass — carries the phase's end-to-end criterion (AC5).

- **Phase README finding**: see Plan Quality Finding #1 (missing rationale for the phase-level `depends_on: ["1"]`).

### phase-3-sentence-composition
#### task-3.1-composition-selection.md
- **Status**: pass — explicitly declines `GameItemSource` for a sound reason (documented in its Architectural Decision and CONTEXT.md's rejected alternatives).

#### task-3.2-wire-composition-rounds.md
- **Status**: pass — the `GameHistoryEntry` back-compat criteria (AC4, AC5) are handled as tested criteria, not comments, consistent with CONTEXT.md's instruction.

#### task-3.3-composition-organism-and-mode-switch.md
- **Status**: pass — carries the phase's end-to-end criterion (AC4).

## Summary Statistics

- Phases reviewed: 3
- Findings by severity: minor: 1, others: 0
- Phases with no end-to-end criterion: 0
- Collaboration risks: 0
