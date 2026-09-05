# Frontend Engineer Review: game-modes

## Executive Summary

The component decomposition (one `GamePage` state machine + four thin challenge organisms + a summary + a history-list molecule) is sound and matches this codebase's existing conventions well, and every specific claim the plan makes about `ReviewPage`/`useReviewSession`/`DrawingQuiz`/`RatingButtons`/`DrawingCanvas`/`AppContext`/`BottomTabBar`/domain shapes checks out against the actual source. The two things I'd stop this plan for before implementation: (1) `PlayGameUseCase`'s described "in-memory round state" model (task 1.3) is incompatible with the singleton, module-level-`const` DI pattern the plan itself says to reuse for wiring it into `AppContext` (task 1.4) — this is a real, unresolved ambiguity two implementers would build differently, with a plausible cross-round state-leak bug; and (2) the new `/game` route is only ever linked from the desktop nav, leaving mobile — the form factor this feature's canvas-drawing input mode is clearly built for — with no in-app path to the feature at all.

## Plan-Level Findings

### Finding P-1: `PlayGameUseCase`'s per-round in-memory state model conflicts with the app's singleton DI convention
- **Severity**: major
- **Description**: Task 1.3's Architectural Decision states ratings are accumulated "only in this use case's own in-memory round state" via calls like starting a round, then recording a rating per item as the person plays, then finishing — i.e. `PlayGameUseCase` is expected to hold mutable per-round state (item list, in-progress ratings) as instance fields across calls. But CONTEXT.md and task 1.4 both direct wiring `PlayGameUseCase` into `AppContext.tsx` "the same way" every other use case is wired — a single `const playGameUseCase = new PlayGameUseCase(...)` instantiated once at module load and shared for the app's entire lifetime (confirmed in `AppContext.tsx`: `reviewUseCase`, `dashboardUseCase`, etc. are all one long-lived instance each). The existing analog this task is supposed to imitate, `ConductReviewUseCase`/`ReviewService`, deliberately does **not** hold round state in the use case: `startReviewSession` returns a plain `ActiveReviewSession` object, the caller (`useReviewSession.ts`) holds `session`/`cardIdx` in its own React state via `useState`/`useRef`, and `endSession(session)` takes the whole session back in as an explicit argument — the use case itself is stateless between calls. `PlayGameUseCase` as specified inverts this: a shared singleton silently accumulating mutable round state is a real correctness risk (an abandoned round's leftover ratings could bleed into the next round unless every "start" call is guaranteed to reset internal state, which no AC currently requires), and it also means the object can't safely be used from more than one place/mount at a time.
- **Recommendation**: Either (a) make `PlayGameUseCase` stateless like `ConductReviewUseCase` — return a `GameRound`/handle object from `start()` that the caller (GamePage, via its own React state) threads through subsequent `recordRating`/`finish` calls explicitly, or (b) if an internal-state design is kept, add an explicit AC that starting a new round always resets any previous round's accumulated ratings, and a test that plays two rounds back-to-back on the *same* use-case instance and asserts round 2's per-rating counts reflect only round 2's own ratings (task 1.3's current AC4 only checks that two *distinct* history entries exist, not that their contents are isolated from each other — it would pass even with a state-leak bug).

### Finding P-2: The new `/game` route has no discoverable entry point on mobile
- **Severity**: major
- **Description**: Task 1.4 explicitly adds the "Game" link only to `BottomTabBar`'s desktop `<nav>` list, "not the 5-icon mobile tab row, which has no room." Confirmed against the actual component: `Layout.tsx` renders `BottomTabBar` twice — once inside a `hidden md:flex` header (desktop) and once as a `fixed ... md:hidden` bottom bar with `mobileOnly` (mobile) — and `Dashboard.tsx` has no quick-action or link referencing a game/practice feature either. The result: a person using this app on a phone (the form factor `main`'s `pb-24 md:pb-4` padding and the whole fixed-bottom-tab-bar pattern are clearly built to prioritize) has **no way to reach `/game`** short of manually editing the URL. This is also the form factor the feature's own "draw on canvas" input mode is obviously designed for (a touchscreen), making the gap more pointed than a generic missed nav link.
- **Recommendation**: Before treating "desktop nav only" as final, add either a Dashboard quick-action card (mirroring the existing Script/Vocab/Grammar/Sentences pattern already on `Dashboard.tsx`) or a mobile-safe alternative (e.g. swap one existing icon for a conditional "Game" icon the way "Vocab" is already conditionally added, or a "More" overflow entry) so mobile users have at least one discoverable path in. If desktop-only really is the intended v1 scope, say so explicitly as a stated, deliberate limitation (like the plan does elsewhere for other tradeoffs) rather than leaving it implicit.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| 1 | Ambiguous state ownership | 1 | 1.3, 1.4 | major | See P-1 — round state lives "in the use case" per 1.3 but the use case is wired as an app-lifetime singleton per 1.4/CONTEXT.md | Pick one model explicitly; see P-1 recommendation |
| 2 | React footgun: per-item remount strategy unspecified | 1 | 1.4 | major | Neither `key={item.id}`-forced remount nor an explicit "each organism must reset `revealed`/clear the canvas on item change" requirement is stated for the play loop. `DrawingQuiz` gets this right today via `useEffect(() => { setRevealed(false); canvasRef.current?.clear(); }, [card.id])`, but nothing tells the new organisms' authors this is required, and two consecutive same-direction items (e.g. two "dictation" symbols in a row) will *not* unmount by React's default reconciliation, so a forgotten reset means stale canvas strokes or an already-`revealed` state bleeding into the next item | Add an explicit note (or AC) requiring either `key={item.id}` on the rendered challenge organism in `GamePage`, or that each organism replicate `DrawingQuiz`'s id-keyed reset effect — don't leave it to be inferred only from "read DrawingQuiz.tsx" |
| 2b | Same footgun carries to word organisms | 2 | 2.2 | major | `WordDictationChallenge`/`WordProductionChallenge` have the identical remount/reset requirement, not called out there either | Same fix, referenced from 2.2 too, not just 1.4 |
| 3 | Test case strength | 1 | 1.3 | minor | AC4 ("two separate rounds produce two separate history entries") would still pass under the state-leak bug described in P-1, since it only checks entry count/distinctness, not that each entry's content is isolated | Strengthen AC4 to assert round 2's per-rating counts/accuracy match only round 2's recorded ratings |
| 4 | AC/edge-case coverage gap | 1 | 1.4 | minor | AC6 covers "zero *eligible*" items blocking start, but no AC covers a person entering `0` (or clearing/invalidating) the item-count field while eligible items exist — behavior on submit is unspecified | Add an AC: item-count input has a minimum of 1 (or Start is disabled/blocked) when the eligible count is nonzero but the requested count is 0 |
| 5 | Accessibility | 1, 2, 3 | 1.4, 2.3, 3.2 | minor | No AC anywhere specifies labeling/keyboard semantics for the new item-count input, draw/paper toggle, Symbols/Words/Mix pool selector, or "Prioritize weak items" checkbox — notable since the codebase does have an existing accessibility baseline to match (`DrawingCanvas` already carries `aria-label`/`role="img"`) | Add a labeling/keyboard-operability AC for each new interactive control, consistent with the existing `DrawingCanvas` precedent |
| 6 | React footgun: audio effect dependency | 1 (pattern), 2 | 1.4, 2.2 | suggestion | The pattern being copied verbatim from `DrawingQuiz` auto-plays audio via `useEffect(() => { playAudio(); ...}, [playAudio])` where `playAudio` is memoized on `[card.audioUrl]` alone — **not** on the item's id. Two consecutive items that happen to share an identical `audioUrl` would silently fail to replay audio, since `playAudio`'s reference wouldn't change. Round-level dedup by `symbolCharacter`/`thai` (task 1.1 AC5, 2.1 AC2) makes this unlikely in practice today, but it's a fragile dependency to propagate into four new components with no note of the subtlety | Key the audio-replay effect on the item's own id/index instead of (or in addition to) `audioUrl` identity when building the four new organisms |
| 7 | Product/UX gap | 1 | 1.4 | major | See P-2 | See P-2 |
| 8 | Trust boundary inventory omission | — | — | pass | Root README's justification (no network/file/CLI input; only local UI state validated against already-trusted `CardRepository` data, with degenerate-input ACs in place of a security control) is sound for this feature | none |

## Phase-by-Phase Review

### Phase 1 — Symbol practice round, end to end

#### task-1.1-domain-model-and-selection.md: Domain model + symbol selection service
- **Status**: pass
- **Findings**: Types-only, no framework import (enforced via `tsc` per AC6, a reasonable non-runtime AC). Dedup-by-`symbolCharacter` and direction-assigned-at-selection-time are both well-justified in the Architectural Decision, and the YAGNI call to not pre-build a `WordGameItem` union yet (deferring the discriminated-union reshape to task 2.1) is the right call — task 2.1 explicitly owns that reshape and the regression protection (task 1.1's own tests must keep passing unmodified) is stated. `RecallRating` reuse (not inventing a second rating scale) is correct and matches `src/domain/shared/types.ts`.

#### task-1.2-game-history-repository.md: Game history repository
- **Status**: pass
- **Findings**: Correctly modeled as a separate localStorage key rather than a new `LearnerState` field (confirmed `LocalStorageAdapter` in `Storage.ts` owns exactly one `thai-srs-state` key with a `typeof localStorage === "undefined"` guard this task's AC4 mirrors accurately). AC3 (saving history doesn't touch the SRS blob) is exactly the right behavioral test for the isolation guarantee this phase depends on.

#### task-1.3-play-game-use-case.md: PlayGameUseCase
- **Status**: findings
- **Findings**: See P-1 and Plan Quality Finding #1/#3. Otherwise the accuracy-threshold divergence from `ReviewService.endReviewSession` (Good/Easy-only vs. rating≥3) is confirmed against the real `ReviewService.ts` (`rating >= 3` at line 122) and is clearly and correctly flagged as deliberate, not a bug to reconcile — good documentation of an architectural decision (criterion #10 satisfied here). AC5 (zero-rating round reports a distinct "nothing rated" shape) is a good, specific behavioral AC.

#### task-1.4-symbol-game-presentation.md: Symbol game presentation
- **Status**: findings
- **Findings**: See P-1, P-2, and Plan Quality Findings #2, #4, #5. The one-page/internal-state-machine decision is well justified and matches `ReviewPage`/`LessonPage` precedent exactly (confirmed). Reuse of `RatingButtons` "exactly as-is" and `DrawingCanvas`'s `clear()`/`isEmpty()` ref API are both accurately described versus the real source. AC1–AC6 are all genuinely behavioral (rendered-output assertions, not implementation-detail assertions) and appropriately cover empty-history and zero-eligible-items states — good baseline test-case quality aside from the gaps noted above.

### Phase 2 — Word practice + pool selection

#### task-2.1-word-pool-and-mix-selection.md: Word pool + mix in the selection service
- **Status**: pass
- **Findings**: The discriminated-union reshape of `GameItem` (`kind: "symbol" | "word"`) is the right call for type-safe consumption by the challenge organisms, and matches the codebase's existing preference for narrowable, discriminated shapes. The dedup-by-`thai`-word technique is verified accurate against `VocabularyLessonService.ts`'s private `getLearnedThaiWords()`/`thaiWordFromId()` (lines 25-36, exactly as cited), and the explicit instruction not to import `VocabularyService` itself (to avoid coupling to lesson-unlock/mastery concerns) is a sound boundary call. AC3's "mix capped at whichever pool actually has items" is a good, specific edge-case AC.

#### task-2.2-word-challenge-organisms.md: Word challenge organisms
- **Status**: findings
- **Findings**: See Plan Quality Findings #2b and #6. Otherwise the one-organism-per-direction convention (matching `DrawingQuiz`/`SentenceBuilder`) is correctly followed, and AC4 (null audio file doesn't crash or attempt `Audio` construction) is a good defensive-behavior AC that's easy to assert on and easy to regress without it.

#### task-2.3-pool-selector-and-dispatch.md: Pool selector + play-page dispatch
- **Status**: findings
- **Findings**: See Plan Quality Finding #5 (accessibility of the new Symbols/Words/Mix selector). The default-to-"Symbols" Architectural Decision (least-surprising choice for existing phase-1-only users) is a good, explicitly reasoned UX call. AC2's dispatch-by-`kind`-then-`challengeDirection` test and AC3's "blocked start, mirrors 1.4 AC6" are both concrete and correctly cross-referenced against phase 1's precedent rather than re-litigating it.

### Phase 3 — Prioritize-weak-items weighting (folder: `phase-3-weak-item-prioritization`)

#### task-3.1-weighted-selection.md: Weighted selection
- **Status**: pass
- **Findings**: Correctly reuses `ReviewService.getCriticalItems`'s ease-factor/lapse-count data source read-only (verified against the real `ReviewService.ts`, lines 214-234, matching exactly) rather than introducing a new stats system — this is the single most important reuse claim in the phase and it holds up. Splitting the weight function from the sampling function, and injecting the random source (defaulting to `Math.random`) specifically to make AC2/AC3 deterministic, is good test-design judgment — it avoids a statistical/flaky test entirely, which is the right call versus AC4 in task 1.1 which (necessarily, for a distribution check) does rely on a large trial count. The worst-card-not-average representative-stat decision is clearly reasoned.

#### task-3.2-prioritize-weak-items-toggle.md: Prioritize-weak-items toggle
- **Status**: pass
- **Findings**: Small, focused task; toggle state modeled as plain `GamePage` component state (unpersisted), consistent with task 1.4's identical decision for the input-mode toggle — good internal consistency across the plan. AC2's reuse of task 3.1's own deterministic fixture/random-source, now exercised through the real page, is exactly the right way to prove the toggle end-to-end without re-deriving the weighting logic at a different layer.

## Summary Statistics

- Tasks reviewed: 9 (1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2)
- Findings by severity:
  - Major: 4 (P-1, P-2, Plan Quality #2, #2b — #2/#2b counted once conceptually but tracked against two tasks)
  - Minor: 3 (Plan Quality #3, #4, #5)
  - Suggestion: 1 (Plan Quality #6)
  - Pass (no findings): 5 of 9 tasks (1.1, 1.2, 2.1, 3.1, 3.2)
