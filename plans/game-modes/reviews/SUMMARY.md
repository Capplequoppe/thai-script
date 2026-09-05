# Execution Plan Review Summary: game-modes

## Review Mode

Subagent Mode (no `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` flag set), 4 experts.

## Review Panel

| Expert | Report |
|--------|--------|
| QA Lead (`qa` agent) | [qa-lead-review.md](./qa-lead-review.md) |
| Frontend Engineer (`frontend-engineer` agent) | [frontend-engineer-review.md](./frontend-engineer-review.md) |
| Systems Architect (`systems-architect` agent) | [systems-architect-review.md](./systems-architect-review.md) |
| Plan Structure Expert (always deployed) | [plan-structure-expert-review.md](./plan-structure-expert-review.md) |

## Statistics

- Total findings (plan-level + quality-table rows, all four reports): 105
- Critical: 2 | Major: ~55 (many duplicated across reviewers, see Disposition) | Minor/suggestion: ~48
- Accepted: 101 | Rejected (pass, no defect): 4 | Deferred: 3
- Every accepted finding was applied directly to the plan documents in this
  review pass (no separate implementation exists yet to patch).

## Key cross-reviewer findings

Two clusters were independently found by multiple reviewers using different
methods, which is why they're rated critical:

1. **A `GameItem`'s content had no defined source** (Systems Architect P-1/
   P-2, QA P-9, Plan Structure P-3) — `VocabCard` has no `thai`/`english`
   field and `promptWord` swaps meaning by property; a symbol's cards
   disagree with each other by `PropertyType`. Fixed by a repo-wide rule
   (CONTEXT.md: "cards decide eligibility, data files decide content"),
   applied in tasks 1.1 (symbols source from `symbols.ts`) and 2.1 (words
   source from injected `VocabEntry[]`). The **Frontend Engineer review
   missed this entirely** and rated task 2.1 "pass" — worth noting as a
   real panel disagreement, resolved in the architect's and QA's favor
   since both verified the claim against the actual `VocabCard`/
   `VocabCardGenerator` source.
2. **The SRS-isolation guarantee (the plan's own stated #1 property) was
   never checked against real wiring** (QA P-1, Plan Structure P-1) — every
   AC only checked card `schedule` fields via a fixture double, while
   `AppProvider.checkAchievements` writes to the same blob and task 1.4
   pointed the executor at `ReviewPage`, which calls it. Fixed by rewriting
   task 1.4's AC4 (and adding task 2.3's AC4) to assert
   `localStorage["thai-srs-state"]` is byte-identical after a full round
   played through the **real** `AppProvider`.

Four judgment calls were put to the user directly (not resolved by
reviewer consensus, since these are legitimate design tradeoffs rather than
defects with one correct fix) — all four were accepted as recommended:

- `PlayGameUseCase` redesigned stateless (Frontend Engineer P-1).
- Game-history repository gets a `JsonStore` adapter seam (Systems
  Architect P-5).
- Mobile entry point via a Dashboard quick-action card (Frontend Engineer
  P-2).
- `GameItemSelectionService` decomposed into sources + sampling now, in
  task 1.1, rather than accreting across phases (Systems Architect P-7).

These four decisions turned out to resolve most of the remaining findings
as a side effect (e.g. the source/sampling decomposition is what makes
task 2.1 and 3.1 additive instead of breaking changes), which is why the
acceptance rate below is so high — fixing the load-bearing findings first
made most of the smaller ones fall out for free.

## Disposition

Every finding id from every review appears here, exactly once.

### Plan Structure Expert

| Finding | Disposition | Note |
|---|---|---|
| P-1 | accepted | Phase 2 README citation fixed; task 2.3 AC4 added (whole-blob isolation for vocab/mix) |
| P-2 | accepted | Phase 3 README citation fixed to AC2 |
| P-3 | accepted | `GameItem` tagged as one-member union in 1.1; 2.1 `covers`/`depends_on` fixed; AD corrected (page narrows, not organisms) |
| Quality row 1 | accepted | Same as P-1 |
| Quality row 2 | accepted | Same as P-2 |
| Quality row 3 | accepted | Same as P-3 |

### Systems Architect

| Finding | Disposition | Note |
|---|---|---|
| P-1 (critical) | accepted | `GameItem` tagged one-member union (1.1); `depends_on: ["1.4"]` on 2.1; AD corrected |
| P-2 (critical) | accepted | "Cards decide eligibility, data decides content" rule (CONTEXT.md); 1.1 AC7 (symbols.ts), 2.1 AC6 (`VocabEntry`), `AppContext.tsx` added to 2.1 `covers` |
| P-3 (major) | accepted | `GameHistoryRepository` not exposed on `AppContextValue`; `PlayGameUseCase.getHistory()` added instead (1.3, 1.4 AD) |
| P-4 (major) | accepted | AC6 broadened to `application`/`infrastructure` too; real enforcement via `src/domain/game/architecture.test.ts` (1.1) |
| P-5 (major) | accepted | `JsonStore` seam (1.2); malformed-payload AC6, quota AC7, SRS-reset-independence AC8; pool back-compat AC (2.3 AC6) |
| P-6 (major) | accepted | Render-test harness (`renderWithApp`) made an explicit 1.4 deliverable; CONTEXT.md's false claim corrected |
| P-7 (major) | accepted | `GameItemSource`/`sampleWithoutReplacement`/`itemWeight` decomposition in 1.1; 2.1/3.1 made additive |
| P-8 (major) | accepted | Never-reviewed baseline-weight rule (3.1 AC5); sibling-not-chain statement re `ReviewService` (3.1 AD, CONTEXT.md) |
| P-9 (minor) | accepted | `GameCardPool = Extract<CardPool, "script"\|"vocab">` replaces a separately-named pool enum (CONTEXT.md, 1.1) |
| P-10 (minor) | accepted | Port-location rationale stated in 1.1 AD |
| P-11 (minor) | accepted | `types.ts`/`PlayGameUseCase.ts` added to 3.2 `covers` |
| P-12 (minor) | accepted | `depends_on` fixed: 2.1→1.4, 3.1→2.3 |
| P-13 (minor) | accepted | Regression guard promoted to a real AC5 in 2.1 |
| P-14 (minor) | accepted | `RandomSource` moved into 1.1; AC4 now an exact seeded sequence, not a statistical trial |
| P-15 (minor) | accepted | Audio-less-symbol-never-`dictation` AC (1.1 AC8) |
| P-16 (suggestion) | accepted | CONTEXT.md states the reset/export independence explicitly; 1.2 AC8 tests it |
| P-17 (minor) | accepted | Write-input constrained to canvas/paper, stated in 2.2 (and CONTEXT.md) |
| P-18 (suggestion) | accepted (superseded) | 1.3 AC2 kept as a fast unit-level guard, explicitly stated as "necessary but not sufficient"; the stronger whole-blob proof (task 1.4 AC4) is what actually closes this, not the narrower fixture-snapshot refinement SA proposed |
| Quality rows 1-36 | accepted (35), no_change_needed (3: rows 12, 25, 31 — reviewer's own "pass" verdicts) | Rows are cross-references to the P-findings above plus a few standalone items (row 10: history-entry schema fixed early in 1.1; row 16: 1.4 re-weighted to `x-large`/13 to reflect harness cost; row 19: `AppContext.tsx` added to 2.1 `covers`; row 27: dispatch decision promoted to 2.1/2.3's AD) — each folded into the corresponding task edit above |

### QA Lead

| Finding | Disposition | Note |
|---|---|---|
| P-1 (critical) | accepted | Task 1.4 AC4 rewritten to whole-blob check via real `AppProvider`; explicit "must not call `checkAchievements`/`refresh`" instruction added to 1.4's Description |
| P-2 (major) | accepted | Item-count validation: 1.1 AC9 (domain clamp/floor), 1.4 AC8 (UI constraint) |
| P-3 (major) | accepted | Three-state history read via `JsonStore` (1.2 AC6/AC7); 1.4 AC5 (three distinct renders) |
| P-4 (major) | accepted | `RandomSource` moved to 1.1; 2.1 AC8 makes "mix contains both kinds" deterministic |
| P-5 (major) | accepted | 3.1 AC4 (actual weighted-sampling-bias AC); 3.2 AC1/AC2 now reference 3.1's actually-exported shared fixture |
| P-6 (major) | accepted | `npm run build` added to 2.1's and 3.1's `verify`; 2.1 AC5 covers full-suite regression |
| P-7 (major) | accepted | History-entry schema fixed early (1.1); pool back-compat AC (2.3 AC6) |
| P-8 (major) | accepted | `renderWithApp` harness built in 1.4, reused by 2.2/2.3/3.2 |
| P-9 (major) | accepted | Symbol content sourced from `symbols.ts` (1.1 AC7); audio-less exclusion (1.1 AC8) |
| P-10 (medium) | accepted | Plan README's Trust Boundary omission now names both rows explicitly |
| Q-1 (major) | accepted | Same as SA-P4 |
| Q-2 (major) | accepted | 3.2 AC1 restated observably (exact item-set comparison) |
| Q-3 (medium) | accepted | 1.3 AC4 restated as content-isolation (state-based), not "repository received N calls" |
| Q-4 (medium) | accepted | 1.4 AC2's `ac_enforcement` asserts the constructed `Audio`'s URL and before/after-reveal ordering, not a bare call count |
| Q-5 (medium) | accepted | 1.2 AC5 fixes ordering explicitly (most-recent-first by `playedAt`) |
| Q-6 (minor) | accepted | 1.2 AD states the uncapped-history consequence and cross-references AC7 |
| Q-7 (minor) | accepted | Confirmed not a YAGNI violation; back-compat criterion (2.3 AC6) is the actual fix |
| Q-8 (major) | accepted | Same as SA-P14/QA-P4 |
| Q-9 (major) | accepted | Same as QA-P6 |
| Q-10 (medium) | accepted | 2.2 AC4 restated at the organism's own layer (item-level `audioUrl`) |
| Q-11 (major) | accepted | 2.1 AC6 requires word content consistency regardless of source card |
| Q-12 (medium) | accepted | 2.1 AC7 (malformed vocab id excluded, not silently undefined) |
| Q-13 (major) | accepted | 1.3 AC6 (idempotent rating, no duplicate history entry on double-finish) |
| Q-14 (medium) | accepted | 1.4 AC10 (abandon-round behavior) |
| Q-15 (minor) | accepted | 1.3 AC3 states integer accuracy, rounded half-up |
| Q-16 (minor) | accepted | 1.2 AD states the cross-tab last-write-wins acceptance explicitly |
| Q-17 (medium) | accepted | Same as SA-P8 |
| Q-18 (medium) | accepted | 3.1 AC6 (degenerate/zero total weight) |
| Q-19 (minor) | accepted | 2.2 AC5 (reveal-then-rate ordering) |
| Q-20 (minor) | accepted | 2.3 AC7 (default-pool assertion) |
| "E2E gap" (testing-phase note) | deferred | If task 1.4 AC4's real-`AppProvider` integration test is implemented as specified, QA's own report says no Playwright e2e spec is additionally needed — deferred pending that being true in practice, not added speculatively now |
| Autoplay-blocked-by-browser / rejected `play()` promise (P-3's third sub-point) | deferred | `DrawingQuiz`'s existing `.catch(() => {})` precedent already swallows this; no AC added for a rejected (vs. resolved) stubbed `play()` promise specifically — low value for this app's scale, revisit if it's ever observed in practice |

### Frontend Engineer

| Finding | Disposition | Note |
|---|---|---|
| P-1 (major) | accepted | `PlayGameUseCase` redesigned stateless (task 1.3 full rewrite) — user-confirmed judgment call |
| P-2 (major) | accepted | Dashboard quick-action card added (1.4 AC9) — user-confirmed judgment call |
| Quality #1 | accepted | Same as P-1 |
| Quality #2 | accepted | 1.4 AC7 (per-item remount/reset requirement stated explicitly) |
| Quality #2b | accepted | 2.2 AC6 (same requirement for word organisms) |
| Quality #3 | accepted | Same as QA-Q3 |
| Quality #4 | accepted | Same as QA-P2 |
| Quality #5 | accepted | Accessibility ACs added: 1.4 AC11, 2.3 AC9, 3.2 AC4 |
| Quality #6 (suggestion) | accepted | CONTEXT.md now states the audio-effect keying rule (item id, not `audioUrl`) |
| Quality #7 | accepted | Same as P-2 |
| Quality #8 | no_change_needed | Reviewer's own "pass" verdict on the Trust Boundary omission |

## Accepted Changes — files modified

| File | What changed |
|---|---|
| `CONTEXT.md` | Corrected false test-coverage claim; added render-test-harness section; fixed self-contradictory `getCriticalItems` guidance + never-reviewed baseline rule; added "cards decide eligibility, data decides content" rule; stated reset/export independence; audio-effect keying note; `GameCardPool` naming |
| `README.md` (plan) | Trust Boundary omission now names the two boundaries explicitly |
| `phase-1-symbol-practice/README.md` | Reflects tagged `GameItem` and the source/sampling seam |
| `task-1.1-domain-model-and-selection.md` | Full rewrite: `RandomSource`, `GameItemSource`/`sampleWithoutReplacement` decomposition, `SymbolGameItemSource` sourcing from `symbols.ts`, tagged `GameItem`, history-entry schema, item-count validation, architecture test, audio-less exclusion |
| `task-1.2-game-history-repository.md` | Full rewrite: `JsonStore` seam, three-state reads, quota-failure handling, SRS-independence AC |
| `task-1.3-play-game-use-case.md` | Full rewrite: stateless design, idempotent rating, rounding rule, content-isolation AC |
| `task-1.4-symbol-game-presentation.md` | Full rewrite: `renderWithApp` harness, whole-blob SRS-isolation AC, Dashboard mobile entry, remount/reset AC, item-count UI validation, accessibility, abandon-round AC; re-weighted to `x-large`/13 |
| `phase-2-word-practice-and-mix/README.md` | Citation fixed; reflects additive design |
| `task-2.1-word-pool-and-mix-selection.md` | Full rewrite: `WordGameItemSource` sourcing from injected `VocabEntry[]`, `AppContext.tsx` wiring, `depends_on` fixed, `npm run build` added |
| `task-2.2-word-challenge-organisms.md` | AC4 fixed to item-level fields; remount/reset, write-input constraint, reveal-order ACs added |
| `task-2.3-pool-selector-and-dispatch.md` | Whole-blob isolation AC for vocab/mix; legacy pool-field back-compat; default-pool, partial-pool-exhaustion, accessibility ACs |
| `phase-3-weak-item-prioritization/README.md` | Citation fixed to AC2; reflects additive design |
| `task-3.1-weighted-selection.md` | Full rewrite: additive over 1.1's sampler, never-reviewed baseline rule, actual sampling-bias AC, degenerate-weight AC, shared exported fixture |
| `task-3.2-prioritize-weak-items-toggle.md` | Observable AC1 restatement, `covers` fixed, accessibility AC |

## Key Debates

Run in Subagent Mode (no live agent-to-agent debate), so disagreements were
resolved by the synthesizing session rather than by the panel itself:

- **Frontend Engineer rated task 2.1 "pass"**, missing the critical
  content-source defect Systems Architect and QA both found and verified
  against the actual `VocabCard`/`VocabCardGenerator` source. Resolved in
  favor of Systems Architect/QA — their claim is independently verifiable
  and Frontend Engineer's is a straightforward miss, not a considered
  disagreement.
- **Systems Architect called task 1.3 "the strongest task in the plan"**
  (praising the stateful, in-memory-round-state design as structurally
  preventing SRS mutation) while **Frontend Engineer flagged the same
  design as a major cross-round-leak risk** given the singleton DI
  convention. Both are correct on independent axes: the "ratings never
  touch `CardRepository.save`" property (SA's point) survives the
  stateless redesign entirely — it was never about where round state lives,
  only about what code path a rating can reach. Resolved by adopting
  Frontend Engineer's stateless redesign (user-confirmed) while keeping and
  restating Systems Architect's structural point in 1.3's Architectural
  Decision.

## Next step

`weight-execution-plan`, to cast the panel's votes on this now-hardened
plan. Author votes are already recorded per task; run the four-estimator
panel next.
