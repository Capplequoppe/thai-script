---
doc_type: reference
title: "Task 1.4 — Symbol game presentation"
description: A /game route with setup, play, and summary states, a render-test harness this repo does not yet have, a mobile-reachable entry point, and an SRS-isolation proof against the real AppProvider.
covers:
  - src/presentation/App.tsx
  - src/presentation/context/AppContext.tsx
  - src/presentation/pages/Dashboard.tsx
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/SymbolDictationChallenge.tsx
  - src/presentation/components/organisms/SymbolReadingChallenge.tsx
  - src/presentation/components/organisms/GameRoundSummary.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/test-utils/renderWithApp.tsx
status: draft
task_id: "1.4"
task_status: complete
depends_on: ["1.2", "1.3"]
size: x-large
verify:
  - npm test -- src/presentation/pages/GamePage
  - npm run build
ac_enforcement:
  - "AC1 -> a Testing-Library render test in GamePage.test.tsx: set a count, start a round, assert exactly that many item screens are traversed"
  - "AC2 -> a case per direction, asserting the dictation shape (a stubbed Audio constructed with the item's audioUrl before reveal; canvas or paper-mode reveal button per the input-mode toggle) and the reading shape (no Audio constructed before reveal, one constructed after) render for items pre-assigned that direction"
  - "AC3 -> a case asserting RatingButtons appears only after reveal and that choosing a rating advances the item index"
  - "AC4 -> the critical end-to-end case: seed localStorage['thai-srs-state'] with a known JSON string (script cards + achievements + sessionHistory + streak fields), render GamePage inside the REAL AppProvider (not a hand-built context double) at /game, configure and complete a full round with mixed ratings, reach the summary screen, then assert localStorage.getItem('thai-srs-state') is byte-identical to the seeded string"
  - "AC5 -> three cases: never played (no history) renders a distinct message from populated history, and a corrupt/unavailable history read (GameHistoryListResult status \"unavailable\") renders a third, distinct message — never played and unavailable must not render alike"
  - "AC6 -> a case rendering GamePage with zero eligible script cards, asserting the start action is unavailable/disabled and an explanatory message is shown"
  - "AC7 -> a case asserting each challenge organism resets its revealed state and clears its canvas when the current item changes, verified across two consecutive items of the same challenge direction (not relying on a remount)"
  - "AC8 -> a case asserting the item-count input rejects/clamps 0, negative, and non-integer entries before Start becomes actionable"
  - "AC9 -> a Dashboard render test asserting a Game quick-action card is present and navigates to /game, verified without requiring the md: desktop viewport"
  - "AC10 -> a case: navigating away mid-round persists nothing to history, and returning to /game shows the setup screen with an empty tally on next start"
  - "AC11 -> a case asserting the item-count input and the draw/paper toggle each have an accessible name and can be operated via keyboard"
ac_tests:
  - "AC1 -> src/presentation/pages/GamePage.test.tsx::presents exactly the configured number of item screens before the summary"
  - "AC2 -> src/presentation/pages/GamePage.test.tsx::renders dictation with audio before reveal and reading with audio only after reveal"
  - "AC3 -> src/presentation/pages/GamePage.test.tsx::shows rating buttons only after reveal and advances on rating"
  - "AC4 -> src/presentation/pages/GamePage.test.tsx::leaves the whole thai-srs-state blob byte-identical after a full round through the real AppProvider"
  - "AC5 -> src/presentation/pages/GamePage.test.tsx::renders a corrupt history read as unavailable, never as never-played"
  - "AC6 -> src/presentation/pages/GamePage.test.tsx::keeps start unavailable and explains when no symbols are eligible"
  - "AC7 -> src/presentation/pages/GamePage.test.tsx::resets reveal and canvas across two consecutive dictation items"
  - "AC8 -> src/presentation/pages/GamePage.test.tsx::keeps start unavailable for zero, negative, and non-integer item counts"
  - "AC9 -> src/presentation/pages/GamePage.test.tsx::dashboard shows a game quick-action card that navigates to /game"
  - "AC10 -> src/presentation/pages/GamePage.test.tsx::abandoning a round persists nothing and the next round starts clean"
  - "AC11 -> src/presentation/pages/GamePage.test.tsx::labels the count input and input-mode toggle and keeps them keyboard-operable"
red_proof:
  - "AC1 -> GamePage.handleRate advance condition changed from `currentIndex + 1 < items.length` to `currentIndex + 2 < items.length`, ending a 3-item round after 2 screens. Reverted after red.… [see red-proofs/]"
  - "AC2 -> SymbolReadingChallenge's reset effect gained a `playAudio()` call, constructing the item's audio on mount — before the reveal. Reverted after red. (Second mutation for the input-mod… [see red-proofs/]"
  - "AC3 -> SymbolDictationChallenge rendered `<RatingButtons onRate={onRate} />` unconditionally above the reveal branch, so rating buttons appeared before reveal. Reverted after red. Classifi… [see red-proofs/]"
  - "AC4 -> GamePage's finish branch appended a single space to localStorage[\"thai-srs-state\"] before computing the summary — a byte-level change that is semantically near-invisible. Reverted a… [see red-proofs/]"
  - "AC5 -> GameHistoryList collapsed the unavailable state into the empty state: `if (result.status === \"unavailable\" || result.entries.length === 0)` returning \"No games played yet.\" for both… [see red-proofs/]"
  - "AC6 -> GamePage's zero-eligible branch condition changed from `eligibleCount === 0` to `eligibleCount < 0`, so the setup form (with Start) rendered even with no eligible symbols and the ex… [see red-proofs/]"
  - "AC7 -> SymbolDictationChallenge's identity-keyed reset effect dependency changed from `[item.symbolCharacter]` to `[]`, so it never re-ran when the current item changed — exactly the no-re… [see red-proofs/]"
  - "AC8 -> GamePage's countValid replaced with `!Number.isNaN(parsedCount)`, accepting 0, negatives and non-integers. Reverted after red (and the validation later simplified — `Number(\"\") ===… [see red-proofs/]"
  - "AC9 -> Removed the Game QuickActionCard block from Dashboard.tsx's quick-action grid. Reverted after red. Classified on re-read: TestingLibraryElementError captured verbatim at the card-pr… [see red-proofs/]"
  - "AC10 -> The ✕ End-round button's handler called `game.saveHistory({pools, itemCount}, game.finishRound(ratings))` before navigating away — persisting the abandoned round. Reverted after red… [see red-proofs/]"
  - "AC11 -> The count input's label association broken: `htmlFor=\"game-item-count\"` changed to `htmlFor=\"game-item-count-detached\"`, leaving the input with no accessible name. Reverted after re… [see red-proofs/]"
lint:
  before: 0
  after: 0
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.4 — Symbol game presentation

## Description

Revised after panel review found: the plan's headline SRS-isolation
guarantee was never checked end to end against the real app wiring; the
repo has no render-test infrastructure at all (contrary to what the original
CONTEXT.md claimed); the feature had no mobile entry point; and per-item
remount/reset was assumed rather than specified. All four are fixed in this
version. This is now the largest task in the plan and is weighted
accordingly — it is the first task in the repository to build page-level
render tests, which is real, necessary scope, not padding.

### The render-test harness — build this first, it blocks everything else here

`src/presentation/test-utils/renderWithApp.tsx`: a `renderWithApp(ui,
overrides?: Partial<AppContextValue>)` helper that builds a complete
in-memory `AppContextValue` (in-memory `CardRepository`/`GameHistoryRepository`
fakes, real `PlayGameUseCase` over them) and renders `ui` inside
`<AppContext.Provider value={...}>`, merging in `overrides`. Also stub
`HTMLMediaElement.prototype.play` (jsdom does not implement it — an
unstubbed `new Audio(url).play()` throws synchronously) to return a resolved
promise, and add the `// @vitest-environment jsdom` docblock plus an explicit
`afterEach(cleanup)` — see CONTEXT.md for exactly why each of these is
needed and is currently absent from this repo.

AC4 is the one case in this task that deliberately does **not** use
`renderWithApp` — it needs the real, unmodified `AppProvider` (module-level
singletons and all), because the failure mode it proves against is a wiring
mistake (e.g. `GamePage` accidentally calling `checkAchievements`/`refresh`,
as `ReviewPage` does at end of session) that a hand-built context double
would bypass entirely.

**`GamePage` must not call `checkAchievements`, `refresh()`, or anything on
`review`/`items`/`data` from `useApp()`.** This is stated explicitly, not
left to be inferred from "read `ReviewPage.tsx` for the session-driving
pattern" — that instruction is about the state-machine shape (setup/playing/
summary), not an invitation to copy `ReviewPage`'s end-of-session side
effects, which are exactly what would break AC4.

### Scope

- `GamePage.tsx` at `/game` (added to `App.tsx`): setup form (item-count
  input with a stated valid range, draw-canvas vs write-on-paper toggle), a
  start action, the play loop, and the summary screen — one page, internal
  `setup | playing | summary` state, matching `ReviewPage`/`LessonPage`
  precedent. `GamePage` itself owns `items: GameItem[]`, `ratings:
  GameRatingRecord[]`, and `currentIndex` as its own React state (mirroring
  `useReviewSession`'s `session`/`cardIdx`), threading them through
  `PlayGameUseCase`'s pure functions — it never assumes the use case
  remembers anything between calls.
- `SymbolDictationChallenge.tsx` / `SymbolReadingChallenge.tsx`: reuse
  `DrawingCanvas`, the audio-on-mount pattern, and `RatingButtons`. Each
  **must** replicate `DrawingQuiz`'s id-keyed reset effect (reset `revealed`,
  clear the canvas, keyed on the item's identity) — do not rely on React
  happening to remount between two same-shaped items.
- `GameRoundSummary.tsx`: renders the finished round's summary.
- `GameHistoryList.tsx`: renders `PlayGameUseCase.getHistory()`'s
  three-state result distinctly — `{status:"ok", entries: []}` ("no games
  played yet"), `{status:"ok", entries: [...]}` (the list), and
  `{status:"unavailable"}` (a third, distinct "history unavailable" message)
  — never collapsing the third into the first.
- `AppContext.tsx`: instantiate `StorageGameHistoryRepository` and
  `PlayGameUseCase` as module-level `const`s, exactly like every existing
  service/use case. Add `game: PlayGameUseCase` to `AppContextValue`. Do
  **not** add the repository itself to the context — no repository is
  exposed there today, and `getHistory()` on the use case is the seam.
- `Dashboard.tsx`: add a "Game" quick-action card alongside the existing
  Script/Vocab/Grammar/Sentences cards — this is the feature's mobile-
  reachable entry point (the desktop-nav-only link, still added in
  `BottomTabBar.tsx`, has no equivalent on the 5-icon mobile tab row).

## Acceptance Criteria

- AC1: Opening `/game`, setting an item count ≤ eligible, and starting a
  round presents exactly that many challenge screens in sequence before the
  summary.
- AC2: Each item renders as the dictation or reading shape per its
  `challengeDirection`, with audio constructed at the correct point (before
  reveal for dictation, only after for reading) — not decided in this
  component.
- AC3: `RatingButtons` appears only after reveal; choosing a rating advances
  to the next item or the summary.
- AC4: A full round played through `GamePage` inside the real `AppProvider`
  leaves `localStorage["thai-srs-state"]` byte-identical to its pre-round
  value — the plan's end-to-end SRS-isolation proof, for real wiring, not a
  fixture double.
- AC5: Three history states render distinctly: never played, populated, and
  unavailable (a corrupt read) — no two collapse into the same message.
- AC6: Zero eligible script symbols: start is unavailable, with an
  explanatory message.
- AC7: Each challenge organism resets its own revealed/canvas state when the
  current item changes, proven across two consecutive same-direction items
  (a case React's default reconciliation would not remount).
- AC8: The item-count input rejects or clamps 0, negative, and non-integer
  values before Start is actionable (pairs with task 1.1's domain-level rule
  for the same degenerate values — this is the UI-layer half).
- AC9: A "Game" quick-action card on `Dashboard.tsx` navigates to `/game`,
  reachable without the desktop (`md:`) viewport — the feature's mobile
  entry point.
- AC10: Abandoning a round mid-play persists nothing to history; returning
  to `/game` shows setup, and a subsequently started round begins with an
  empty tally.
- AC11: The item-count input and the draw/paper toggle each carry an
  accessible label and are keyboard-operable, matching the labeling
  precedent `DrawingCanvas` already sets (`aria-label`/`role`).

## Architectural Decision

One page, internal state machine (`setup | playing | summary`), state owned
by `GamePage` itself and threaded through `PlayGameUseCase`'s pure functions
— not held by the use case. This is the presentation-layer half of task
1.3's stateless redesign; see that task's Architectural Decision for why.

History reads go through `PlayGameUseCase.getHistory()`, never a repository
exposed on `AppContextValue` — no repository is exposed there today, and
adding one would put a persistence-layer abstraction in front of every
component that touches history.

The input-mode toggle (draw vs paper) is plain `GamePage` component state,
not persisted — a per-round preference, not a stored setting.

Mobile reachability is a `Dashboard.tsx` quick-action card, not a change to
the crowded 5-icon `BottomTabBar` mobile row — the desktop nav link (still
added, in `BottomTabBar.tsx`) and the Dashboard card together give both form
factors a path in without competing for the same fixed space.

## Test Cases

- Configure count → play every item → reach summary; item count matches.
- One dictation item and one reading item (forced via a fixture/mocked
  selection result): each renders its distinct shape, audio at the correct
  point.
- Reveal-then-rate flow advances correctly, including on the final item.
- Full round through the real `AppProvider`: seeded SRS blob byte-identical
  after.
- Never-played vs populated vs unavailable history: three distinct renders.
- Zero eligible symbols: start blocked, explained.
- Two consecutive same-direction items: no stale canvas/reveal state carries
  over.
- Degenerate item-count entries: rejected/clamped before Start is actionable.
- Dashboard quick-action card: present, navigates to `/game`.
- Abandoned round: no history entry; next round starts clean.
