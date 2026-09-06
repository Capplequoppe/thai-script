---
doc_type: reference
title: "Task 3.3 — Composition organism + mode switch"
description: A tile-tap, self-graded composition organism; a Practice/Sentence-Composition mode switch on GamePage with its own eligible-count and saveHistory paths named explicitly; SRS isolation re-proven; history rendering simplified now that kind is normalized at the repository boundary.
covers:
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/SentenceCompositionChallenge.tsx
  - src/presentation/components/organisms/SentenceCompositionChallenge.test.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/test-utils/renderWithApp.tsx
status: draft
task_id: "3.3"
task_status: pending
depends_on: ["3.2"]
size: x-large
weight_votes:
  - "author -> 13"
verify:
  - npm test -- src/presentation/pages/GamePage
  - npm test -- src/presentation/components/organisms/SentenceCompositionChallenge
  - npm run build
ac_enforcement:
  - "AC1 -> a render test asserting SentenceCompositionChallenge shows the English gloss and tile buttons, lets the learner tap tiles to build a string and backspace, and reveals the correct order + gloss on submit — with RatingButtons appearing only after that reveal, never an auto-graded correct/incorrect verdict"
  - "AC2 -> a case asserting choosing \"Sentence Composition\" on GamePage's mode switch shows an item-count-only setup step, no pool checkboxes and no input-mode toggle, with the eligible-count hint computed via a new countEligibleCompositionItems-shaped path (naming the mechanism explicitly, mirroring countEligibleItems's existing pattern) rather than an ad hoc inline call"
  - "AC3 -> a case asserting GamePage dispatches kind:\"composition\" items to SentenceCompositionChallenge"
  - "AC4 -> the critical case: seed localStorage['thai-srs-state'] with grammar, vocab, and sentence cards all included (enough graduated vocab and grammar cards to unlock at least one grammar point), render GamePage inside the REAL AppProvider, play a full composition round to completion, assert the seeded string is byte-identical afterward"
  - "AC5 -> a case: zero unlocked grammar points with usable tile data, asserting Sentence Composition mode shows a distinct explanatory state and blocks starting; a SEPARATE case with exactly 2 unlocked points, asserting the item-count hint reads \"1 to 2\" and requesting more than 2 is rejected before start rather than silently producing a 2-item round"
  - "AC6 -> a case asserting GameHistoryList renders a composition-kind entry with its own label, distinct from any pool label — a pure rendering test, since StorageGameHistoryRepository (task 3.2) now normalizes kind before this component ever sees an entry"
  - "AC7 -> a case: completing a composition round through the actual page (not a unit-level saveHistory call) asserts the resulting history entry has kind:\"composition\" and no pool label — proving GamePage's handleRate/saveHistory call site actually branches on mode rather than always taking the practice-shaped path"
  - "AC8 -> a case asserting two consecutive composition items each independently reset tile/built/reveal state on the second item"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 3.3 — Composition organism + mode switch

## Description

Read `SentenceBuilder.tsx` in full for the tile-tap interaction to reuse —
**not** its auto-graded `handleSubmit`. `SentenceCompositionChallenge`'s
submit step reveals the correct order and gloss, then shows
`RatingButtons` — no correct/incorrect verdict of its own. Reset tile/
built/reveal state on item change, correctly for the *second* of two
consecutive composition items (AC8), same rule as every other organism
in this feature.

Add a mode switch to the top of `GamePage`'s setup screen: "Practice"
(unchanged) vs. "Sentence Composition." **Name the composition-mode
mechanisms explicitly — do not leave them to be invented:**

- **Eligible count**: Practice mode's `countEligibleItems` calls
  `startRound` with `Number.MAX_SAFE_INTEGER` to learn the cap. Composition
  needs its own equivalent (e.g. a `countEligibleCompositionItems`
  helper, or a direct `startCompositionRound(Number.MAX_SAFE_INTEGER)`
  call at the same call site) — state which, in code, so two executors
  don't diverge. Because composition's supply is genuinely small (task
  3.1's Architectural Decision), the hint must say the true range (e.g.
  "1 to 2") and reject a request above it before starting, rather than
  silently clamping to a shorter round (AC5's second case).
- **`saveHistory` call site**: `GamePage.handleRate` today unconditionally
  calls `game.saveHistory({ pools, itemCount }, roundSummary)` — the
  practice-shaped call. Composition rounds have no `pools`; this call site
  needs an explicit mode branch calling the composition-shaped
  `saveHistory` overload. AC7 is the proof this branch is real, exercised
  through the page, not just present in a unit test of `saveHistory`
  itself.

Extend the dispatch switch with `kind: "composition"`.

`GameHistoryList` renders `kind: "composition"` entries with their own
label. **This is now a pure rendering test** (AC6) — task 3.2 normalizes
`kind` at the repository boundary, so this component never receives an
entry with `kind` missing and needs no legacy-entry branch of its own.

**`renderWithApp.tsx` needs a fixture this task adds**: a `graduatedVocab`
seeding option (vocab cards with `learningStep: null`, since the
harness's `DEFAULT_SRS` graduates nothing today) and an exported
`UNLOCKS_FIRST_GRAMMAR_POINT` fixture built against the real
`vocabulary.json`'s `word_class` counts and `grammar.json`'s first
entry's `prerequisites.minVocabByClass` — this is real setup work, not a
one-line addition, which is why this task is weighted accordingly.

## Acceptance Criteria

- AC1: Tap-to-build, backspace, reveal, `RatingButtons` after — no
  auto-graded verdict anywhere.
- AC2: "Sentence Composition" shows an item-count-only setup step, whose
  eligible-count hint is computed via a named mechanism.
- AC3: `GamePage` dispatches `kind: "composition"` to
  `SentenceCompositionChallenge`.
- AC4: A full composition round through the real `AppProvider` (with
  enough graduated vocab/grammar cards to unlock at least one point)
  leaves the SRS blob byte-identical.
- AC5: Zero eligible: blocked, explained. A small nonzero eligible count
  (e.g. 2): the setup screen states the true range and rejects an
  over-large request before start.
- AC6: `GameHistoryList` renders composition entries with their own
  label — a pure rendering test.
- AC7: A composition round completed through the page writes a
  `kind: "composition"` entry — proving the `handleRate`/`saveHistory`
  mode branch is real.
- AC8: Two consecutive composition items independently reset.

## Architectural Decision

No input-mode toggle for composition: tile-tapping has no "on paper"
alternative; offering the toggle would control nothing.

The eligible-count and `saveHistory` mode branches are named explicitly
in this task (not left implicit) because `GamePage` now hosts two setup
flows and two history shapes — an unnamed fork point here is exactly
where two independent implementations would diverge.

## Test Cases

- Tile-tap build, backspace, reveal, self-rate — no auto-grading.
- Composition mode: item-count-only setup, named eligible-count
  mechanism.
- Dispatch of `kind: "composition"` items.
- Full composition round through the real `AppProvider`: SRS blob
  byte-identical after.
- Zero eligible: blocked, explained. Small eligible count: true range
  stated, over-request rejected before start.
- History list: composition entries labeled distinctly (pure rendering
  test).
- A composition round completed through the page writes a correctly
  typed entry.
- Two consecutive composition items: independent reset.
