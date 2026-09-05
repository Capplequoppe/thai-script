---
doc_type: deep-dive
title: Execution context for the game-modes feature
description: Repo orientation, conventions, quality gates, and rejected alternatives for adding self-graded practice game modes.
covers:
  - src/domain/game
  - src/application/use-cases/PlayGameUseCase.ts
  - src/infrastructure/persistence/StorageGameHistoryRepository.ts
  - src/presentation/pages/GamePage.tsx
status: draft
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Execution context — game modes

Client-only Vite + React 19 + TypeScript app, no backend. Clean/Hexagonal
layout under `src/{domain,application,infrastructure,presentation}`. Package
manager is **npm** (`package-lock.json` present).

**Revised after panel review** (`reviews/SUMMARY.md`) found the original
draft overstated the repo's test coverage and gave self-contradictory
guidance on stats reuse — both corrected below.

## Quality gates (run from repo root)

- Types + build: `npm run build` (`tsc -b && vite build`)
- Unit tests: `npm test` (`vitest run`), or scoped: `npm test -- <path>`
- Lint: `npx biome check .` (no wrapping script; `recommended` rules only —
  **does not enforce import-direction/layering**; a domain file importing
  `presentation/` compiles and lints clean)
- e2e (Playwright, `npm run test:e2e`) — not required by this plan.

## No render-test infrastructure exists — build it, don't assume it

The repo has **zero `.test.tsx` files**. The only jsdom test
(`src/presentation/hooks/useReviewSession.test.ts`) uses `renderHook`, not
`render`. Before any `.test.tsx` in this plan can run:

- No global jsdom environment — every new render-test file needs a
  `// @vitest-environment jsdom` docblock (`vite.config.ts` sets only
  `test.exclude`).
- No `setupFiles`/`globals: true` — Testing-Library's auto-`cleanup` never
  registers; call `cleanup()` explicitly.
- `@testing-library/jest-dom`/`user-event` are **not** installed.
- jsdom does not implement `HTMLMediaElement.play` — `new Audio(url).play()`
  throws synchronously (`DrawingQuiz.tsx`'s `.catch()` does not save it, the
  throw is before the promise chain). Stub `HTMLMediaElement.prototype.play`
  first, in any test rendering an audio-autoplaying component.
- `AppContext.tsx` builds every dependency as a module-level `const` bound
  to the real `LocalStorageAdapter` — no injection seam. A render test needs
  a hand-built `<AppContext.Provider value={...}>`.

Task 1.4 builds this harness once (`src/presentation/test-utils
/renderWithApp.tsx`), the first task that needs it; tasks 2.2/2.3/3.2 reuse
it rather than reinventing their own.

## Files to imitate

- **Domain service pattern**: `src/domain/session/services/ReviewService.ts`
  — a plain class over `CardRepository`/`LearnerStateRepository` ports.
- **Stateless use-case pattern — imitate this, not the opposite**:
  `ConductReviewUseCase`/`ReviewService.startReviewSession` return a plain
  session object; the *caller* (`useReviewSession.ts`) holds session state
  in its own `useState`/`useRef`. `PlayGameUseCase` must follow this exactly
  — pure functions (`startRound`/`recordRating`/`finishRound`), never
  instance-held round state — because it is wired into `AppContext.tsx` as
  one more long-lived singleton, and a singleton holding mutable per-round
  state would leak between rounds/mounts.
- **Self-graded card**: `DrawingQuiz.tsx` is the closest analog to every
  challenge card here — audio-on-mount via plain `new Audio(url).play()`, a
  `DrawingCanvas` (`clear()`/`isEmpty()` via ref), a reveal step, then
  `RatingButtons` (reuse as-is: 5 buttons, Again(1)/Wrong(2)/Hard(3)/Good(4)/
  Easy(5), `RecallRating = 1|2|3|4|5`). Two footguns to carry forward
  correctly: (1) `RatingButtons` binds a `window` `keydown` handler for keys
  1-5 with no focus check — write-input must be canvas-or-paper, never a
  focusable text field. (2) `DrawingQuiz` resets `revealed`/clears the
  canvas in a `useEffect` keyed on `card.id`, and plays audio via a callback
  memoized on `card.audioUrl` — every new organism must key **both** effects
  on the item's own id (not `audioUrl` alone, which two same-audio items
  could share) and reset on item change, since React won't remount a
  same-shaped component between two consecutive same-direction items.
- **Card domain shapes**: `ReviewableCard` (base: `id`, `question`,
  `correctAnswer`, `audioUrl?`, `schedule`); `ScriptPropertyCard` (adds
  `symbolCharacter`, `property`); `VocabCard` (adds `promptWord`,
  `property`). **These decide eligibility only, never content.**
- **Cards decide eligibility; the data files decide content.** The single
  most important rule here, made explicit after review found it implicit
  and inconsistently applied. A symbol/word is *eligible* once
  `CardRepository.findAll(pool)` has any card for it. But a card's own
  `question`/`correctAnswer`/`promptWord` are property-specific, not
  representative: `ScriptPropertyCard`s for one symbol differ by
  `PropertyType`, and `VocabCard.promptWord` holds the Thai word for five
  `VocabProperty` values but the *English* word for `englishToThai`
  (`VocabCardGenerator.ts`). So: symbol content comes from
  `src/domain/script/data/symbols.ts` (`ThaiSymbol.character`/`name`/
  `audioUrl`), imported directly (small static export, domain→domain, no
  injection). Word content comes from `VocabEntry`
  (`src/domain/vocabulary/types.ts`), **constructor-injected** — matching
  `AppContext.tsx`'s existing pattern for `VocabularyService`/
  `GrammarService`/`SentenceService` (`new VocabularyService(cardRepo,
  stateRepo, vocabularyData as VocabEntry[])`), since `vocabulary.json` is
  large enough that the codebase's convention is injection, not ad hoc
  re-import.
- **DI wiring**: `AppContext.tsx` — module-level `const`s, no
  container/factory, **no repository ever exposed on `AppContextValue`
  today** (only use cases + one domain service). Keep
  `GameHistoryRepository` as a module-level `const`; expose history reads
  via `PlayGameUseCase.getHistory()`, not the repository itself.
- **Routing/nav**: `App.tsx` is one flat `<Routes>` list. `BottomTabBar`'s
  mobile row is a fixed 5-icon bar with no room for a 6th; its desktop
  `<nav>` has room. `Dashboard.tsx` carries quick-action cards
  (Script/Vocab/Grammar/Sentences) — **this** is the mobile-reachable entry
  point for `/game` (the drawing-canvas input mode is a touchscreen feature
  first).
- `CardPool` is `"script"|"vocab"|"grammar"|"sentence"`
  (`src/domain/shared/CardPool.ts`). This feature defines
  `GameCardPool = Extract<CardPool, "script"|"vocab">` rather than a
  separately-named pool vocabulary, so the two concepts stay one vocabulary.

## Reusing SRS stats for weak-item weighting (phase 3) — read before writing 3.1

`ReviewService.getCriticalItems` is **not** callable here — card-level DTOs,
`limit = 10`, no `symbolCharacter`/Thai word, unmappable back to a game
item. Reuse is narrower: read `card.schedule.easeFactor.value`/
`.lapseCount`/`.repetitions` through `CardRepository` directly, the same
fields `getCriticalItems` reads — **do not call `ReviewService` itself**;
`GameItemSelectionService` and `ReviewService` are siblings over the same
port, not a chain.

**A card with `repetitions === 0` needs a stated rule.** `getCriticalItems`
filters these out for a reason: `DEFAULT_SRS_DATA.easeFactor` is **2.0**
while `EaseFactor.DEFAULT` is **2.5** — a never-reviewed card's ease factor
is *lower* than a well-known card's, so naive "lower ease = weaker" ranks
brand-new items as weakest. Task 3.1 must state and test an explicit rule
(e.g. treat `repetitions === 0` as neutral, not maximum, weight).

## Conventions

- Tabs, double quotes (Biome-enforced). Tests co-located as `*.test.ts(x)`.
- `CardPool` values stay `"script"`/`"vocab"`/`"grammar"`/`"sentence"`
  app-wide — never `"symbols"`/`"words"` at the data layer (UI labels only;
  the setup screen's three choices map to `["script"]`/`["vocab"]`/
  `["script","vocab"]`).

## Rejected alternatives

- **Game history as a `LearnerState` field**: rejected (see task 1.2).
  **Accepted consequence, stated explicitly**: an SRS reset via
  `SettingsPage` does **not** clear game history and vice versa;
  `ManageDataUseCase.exportData()` excludes it too. Intentional.
- **One `GameChallenge` component branching on all 4 directions**: rejected
  for four small organisms, matching `DrawingQuiz`/`MultipleChoice`/
  `SentenceBuilder`'s existing split.
- **Automatic per-item correctness**: out of scope — every rating is the
  human's own self-assessment.
- **One `GameItemSelectionService` accreting pool-specific logic ad hoc**:
  rejected. It composes `GameItemSource`s (one per pool) plus a free
  `sampleWithoutReplacement` function — decided in task 1.1 so phases 2/3
  are additive, not rewrites.

## Test-authoring note for the SRS-isolation guarantee

The plan's #1 property: playing a round must not change anything in the
`thai-srs-state` blob — not just a card's `schedule`, the **whole** blob
(achievements/streak/history included, since `AppProvider.checkAchievements`
can write it). The end-to-end proof (task 1.4's AC) renders `GamePage`
inside the **real** `AppProvider`, seeds `localStorage["thai-srs-state"]`
with a known string, plays a full round, and asserts byte-identity after.
`StorageCardRepository` re-reads `storage.load()` on every call, so this
needs no special test hooks. Task 1.3's own schedule-only snapshot stays as
a fast, narrower guard — necessary but, alone, not sufficient.

Never prove this by asserting a method was *not called* — assert on the
persisted state itself.
