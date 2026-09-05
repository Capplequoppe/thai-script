# Plan Structure Expert Review: game-modes

## Executive Summary

This plan is sliced vertically — each of its three phases carries a complete,
playable capability from `/game` to a persisted history entry, not a layer
(domain / infra / app / UI) deferred to a later phase. The cost it does pay is
narrower: two of its three phases misname the acceptance criterion they point
to as their own proof of end-to-end-ness, and phase 2's seam task reshapes a
type that phase 1's already-built components depend on without any task
owning the resulting fix.

## Measured Shape

- Phase pairs sharing a `covers` path: 3/3
- `plan check` §8.15 findings: none (`plan_layering` and `phase_isolated` did
  not fire; the 9 `info` findings present are all `covers_new_paths`, expected
  for tasks that create files)
- What the arithmetic could not see: silence on `plan_layering` here is a
  genuine positive signal, not just an absence — all three phases *share*
  `covers` because every phase re-touches the same two seam files
  (`src/domain/game/services/GameItemSelectionService.ts` and
  `src/presentation/pages/GamePage.tsx`), which is the tracer-bullet
  signature (each phase adds a capability through the existing route rather
  than owning one tier of it). What it could not see: that phase 2 and phase
  3's stated end-to-end criteria cite the wrong AC number in each case, that
  phase 2 never actually re-verifies its single most important invariant
  (SRS-schedule immutability) for the pool type it introduces, and that phase
  2's seam task changes a type two already-completed phase-1 files depend on
  without either file appearing in any phase-2 task's `covers`. All three are
  only visible by reading task bodies against each other, not by measuring
  `covers` overlap.

## Plan-Level Findings

### Finding P-1: Phase 2's end-to-end criterion is mis-cited and its most important invariant goes unchecked for the pool it adds
- **Severity**: major
- **Description**: Phase 2's README names its end-to-end criterion as "task
  2.3's AC1 — choosing 'Mix' ... reaches a summary and a persisted history
  entry drawing from both introduced symbols and introduced words, with no
  SRS card of either kind changed." Task 2.3's actual AC1 is "Selecting
  'Words' and starting a round renders every item through one of the two word
  organisms" — a dispatch-only check with no mention of Mix, summary, or SRS
  state. The closest actual content is split across AC2 (dispatch correctness
  for a *stubbed* mixed selection, not necessarily a completed round) and AC4
  (persisted history records which pool was used). Neither, nor any other AC
  in phase 2, asserts that playing a full Mix (or Words) round through the
  real page leaves vocab cards' `schedule` fields unchanged. Task 1.4's AC4
  proved this for script cards only; `CONTEXT.md` calls this property "the
  single most important behavioral property in this plan," and phase 2 is the
  first place a vocab card's schedule is ever touched by this feature at all.
  `PlayGameUseCase`'s mechanism is pool-agnostic, so this is very likely to
  hold in practice — but nothing in the plan enforces or checks it.
- **Recommendation**: Add an AC (with `ac_enforcement`) to task 2.3 asserting
  that a completed Mix or Words round leaves every involved script *and*
  vocab card's schedule fields unchanged, proven through `GamePage` end to
  end (mirroring task 1.4 AC4's mechanism, extended to a vocab fixture).
  Correct the phase 2 README's citation once the right AC id exists.

### Finding P-2: Phase 3's end-to-end criterion cites the wrong AC number
- **Severity**: minor
- **Description**: Phase 3's README names its end-to-end criterion as "task
  3.2's AC1 — with the toggle on, a round played through the real page draws
  its items ... in a way that is demonstrably biased toward the weaker
  items." Task 3.2's actual AC1 is the *default/off* case ("unchecked by
  default; starting a round without checking it behaves ... unweighted").
  The described behavior — toggle on, demonstrable bias, proven through the
  real page — is AC2's content, not AC1's. Unlike P-1, the underlying test
  coverage is sound; only the citation is wrong, but it is wrong in exactly
  the same direction as P-1 (both cite "AC1" for content that is actually
  AC2), suggesting the citations were written before the ACs were finalized
  and never checked against the final numbering.
- **Recommendation**: Change "task 3.2's AC1" to "task 3.2's AC2" in the
  phase 3 README.

### Finding P-3: Phase 2's seam task reshapes a type two phase-1 files depend on, and no task's `covers` includes them
- **Severity**: major
- **Description**: Task 2.1 turns `GameItem` (a flat type, task 1.1) into a
  discriminated union (`{kind: "symbol", ...} | {kind: "word", ...}`). Its own
  Architectural Decision states the reason: "callers (task 2.2's organisms,
  **task 1.4's already-built dictation/reading organisms**) narrow on `kind`
  to get type-safe access to symbol-only or word-only fields." That is an
  explicit statement that `SymbolDictationChallenge.tsx` and
  `SymbolReadingChallenge.tsx` — built in phase 1, against the pre-reshape
  flat `GameItem` — need a source change (narrowing logic, or a tightened
  prop type) to keep type-checking once `GameItem` splits. Neither file
  appears in task 2.1's `covers` (`types.ts`,
  `GameItemSelectionService[.test].ts` only), task 2.2's `covers` (the two
  *new* word organisms only), or task 2.3's `covers` (`types.ts`,
  `PlayGameUseCase.ts`, `GamePage[.test].tsx`, `GameHistoryList.tsx`). If this
  plan runs as sliced, task 2.3's own `verify` gate (`npm run build`) is the
  first place this surfaces — as a `tsc` failure in files no task in phase 2
  declared ownership of, forcing an executor to either write outside its
  `covers` (the thing the format's one-writer-per-file rule exists to
  prevent) or leave the build red with no task accountable for it.
- **Recommendation**: Add `src/presentation/components/organisms/
  SymbolDictationChallenge.tsx` and `SymbolReadingChallenge.tsx` to task 2.1's
  (or 2.3's) `covers`, and add a test case/AC confirming both organisms still
  render symbol items correctly against the post-reshape `GameItem` type.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|----------------|
| 1 | end-to-end criterion citation | 2 | 2.3 (phase README) | major | Phase README cites AC1 for content that is not in any single AC, and the SRS-invariance claim it makes is never checked for vocab cards | Add the missing AC to task 2.3; fix the citation |
| 2 | end-to-end criterion citation | 3 | 3.2 (phase README) | minor | Phase README cites AC1; the described behavior is AC2 | Change citation to AC2 |
| 3 | seam consumer coverage | 2 | 2.1 | major | Stated consumer (task 1.4's symbol organisms) of the reshaped type is not in any phase-2 task's `covers` | Add the two organism files to task 2.1's or 2.3's `covers` |

## Slice Map

| Phase | What a person can do after it | End-to-end criterion | Stands alone? | Verdict |
|-------|-------------------------------|----------------------|---------------|---------|
| 1 — Symbol practice round | Open `/game`, configure a round, play a full symbols-only self-graded round with either challenge direction, rate each item, see a summary, find it in history — SRS untouched | Task 1.4 AC1 (full item traversal) + AC4 (computed summary matches, SRS schedule unchanged) — correctly cited | Yes, explicitly stated | Vertical — passes all three questions |
| 2 — Word practice + pool selection | Choose Symbols / Words / Mix on setup; play word items in either direction, or a mixed round, through the same setup/play/summary/history seam | Cited as task 2.3 AC1, but AC1 is the Words-only dispatch case; the claimed SRS-invariance-for-Mix guarantee is not actually asserted by any AC (see P-1) | Yes, explicitly stated | Vertical in shape; citation wrong and one invariant under-tested |
| 3 — Weak-item weighting | Toggle "prioritize weak items" to bias round composition, for any pool | Cited as task 3.2 AC1, but AC1 is the off/default case; the actual bias-when-on proof is AC2 (see P-2) | Yes, explicitly stated | Vertical — citation mislabeled, coverage itself is sound |

## Collaboration Risks

The only concurrent-eligible task pair in the plan is {1.2, 1.3} (phase 1;
both `depends_on: ["1.1"]` only, and phase-level `depends_on` gates phase 2
and 3 from starting until all of phase 1 completes, so no cross-phase pair is
ever concurrent). Checked: task 1.1 fixes `GameItem`, `GameRoundConfig`,
`GameRatingRecord`, `GameRoundResult`, and the `GameHistoryRepository` port
before either task starts; 1.2 implements that port, 1.3 consumes it (via a
fixture/fake conforming to the same fixed interface), and neither needs to
invent any shape the other doesn't already have fixed for it.

No collaboration risk found — table intentionally empty.

## Re-slice Proposal

No re-slice recommended. The plan is genuinely vertical: no two phases split a
tier (domain/infra/app/UI) across a phase boundary — the layering that does
exist (1.1 domain → 1.2/1.3 → 1.4 presentation) is entirely *within* phase 1
as task-level sequencing behind a seam, which is the recommended shape, not the
anti-pattern. Table intentionally empty.

## Exceptions Taken

| Phase | Exception | Stated in the README? |
|-------|-----------|------------------------|

No phase in this plan takes a horizontal exception — table intentionally
empty. All three phases deliver a played-through capability, not a tier.

## Phase-by-Phase Review

### phase-1-symbol-practice
#### task-1.1-domain-model-and-selection.md: Domain model + symbol selection service
- **Status**: pass
- **Findings**: None. Correctly scoped as the phase's platform/seam task —
  fixes `GameItem`/`GameRoundConfig`/`GameRatingRecord`/`GameRoundResult`/
  `GameHistoryRepository` for two known, concurrent, in-phase consumers
  (1.2, 1.3). YAGNI is applied correctly (word support explicitly deferred to
  phase 2's own seam, task 2.1) — see P-3 for the one place this deferral's
  consumer-coverage was not carried through.

#### task-1.2-game-history-repository.md: Game history repository
- **Status**: pass
- **Findings**: None. Builds only against the port task 1.1 fixed; no
  invention required to run concurrently with 1.3.

#### task-1.3-play-game-use-case.md: PlayGameUseCase
- **Status**: pass
- **Findings**: None. Same seam-consumption pattern as 1.2; its own AC2 is
  the domain-agnostic SRS-invariance test the phase later relies on visually
  through the page (task 1.4 AC4).

#### task-1.4-symbol-game-presentation.md: Symbol game presentation
- **Status**: pass
- **Findings**: None. Correctly assembles 1.1-1.3 into the phase's actual
  vertical capability; AC1 and AC4 are accurately named as the phase's
  end-to-end criterion in the phase README.

### phase-2-word-practice-and-mix
#### task-2.1-word-pool-and-mix-selection.md: Word pool + mix in the selection service
- **Status**: findings
- **Findings**: P-3 — the Architectural Decision names task 1.4's symbol
  organisms as consumers that must "narrow on kind" against this task's
  reshaped type, but neither organism file is in this task's `covers` (or any
  other phase-2 task's).

#### task-2.2-word-challenge-organisms.md: Word challenge organisms
- **Status**: pass
- **Findings**: None. Builds against the `WordGameItem` shape 2.1 fixed; no
  concurrency (sequential, depends on 2.1 alone).

#### task-2.3-pool-selector-and-dispatch.md: Pool selector + play-page dispatch
- **Status**: findings
- **Findings**: P-1 — the phase's declared end-to-end criterion mis-cites
  this task's AC1, and no AC here (or elsewhere in phase 2) verifies
  SRS-schedule invariance for a completed Mix/Words round through the real
  page.

### phase-3-weak-item-prioritization
#### task-3.1-weighted-selection.md: Weighted selection
- **Status**: pass
- **Findings**: None. Correctly scoped, single-owner seam for
  `GameItemSelectionService.ts` this phase; README explicitly and correctly
  notes 3.2 depends on it sequentially rather than concurrently, so there is
  nothing to seam-coordinate.

#### task-3.2-prioritize-weak-items-toggle.md: Prioritize-weak-items toggle
- **Status**: findings
- **Findings**: P-2 — the phase's declared end-to-end criterion mis-cites
  this task's AC1; the described bias-when-on behavior is AC2.

## Summary Statistics
- Phases reviewed: 3
- Findings by severity: critical: 0, major: 2 (P-1, P-3), minor: 1 (P-2), suggestion: 0
- Phases with no end-to-end criterion: 0 (all three name one; phase 2's named
  criterion does not fully hold — see P-1)
- Collaboration risks: 0
