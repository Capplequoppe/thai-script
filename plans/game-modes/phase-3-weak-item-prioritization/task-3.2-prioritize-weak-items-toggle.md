---
doc_type: reference
title: "Task 3.2 — Prioritize-weak-items toggle"
description: An off-by-default setup checkbox that adds prioritizeWeakItems to GameRoundConfig and threads it through PlayGameUseCase into task 3.1's weighted sampling, for any pool.
covers:
  - src/domain/game/types.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
status: draft
task_id: "3.2"
task_status: pending
depends_on: ["3.1"]
size: small
verify:
  - npm test -- src/presentation/pages/GamePage
  - npm run build
ac_enforcement:
  - "AC1 -> a render test with a seeded source and the shared fixture from task 3.1: unchecked (default), asserting the round contains the exact item set the unweighted algorithm produces for that seed"
  - "AC2 -> the same render test, checked: asserting the round contains the exact weak-biased item set task 3.1's own AC4 established for that fixture/seed — proven through the actual page, not re-derived at a different layer"
  - "AC3 -> a case: the toggle, the pool selector, and zero eligible items in the selected pool interact correctly — start remains blocked with the same message task 1.4 AC6/task 2.3 AC3 establish, regardless of the toggle's state"
  - "AC4 -> a case asserting the checkbox has an accessible label and is keyboard-operable (matching the labeling precedent DrawingCanvas already sets with aria-label/role)"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 3.2 — Prioritize-weak-items toggle

## Description

Add `prioritizeWeakItems?: boolean` to `GameRoundConfig`
(`src/domain/game/types.ts`) — an additive optional field, not a change to
any existing caller — and thread it through `PlayGameUseCase.startRound`
into `GameItemSelectionService`, which task 3.1 already made accept a
`weightOf` callback conditionally. Add the checkbox to `GamePage`'s setup
form, unchecked by default, applying to whichever pool is also selected.

## Acceptance Criteria

- AC1: Unchecked by default; a round started without checking it draws the
  exact item set task 1.1/2.1's unweighted algorithm produces for a given
  seed and fixture (an observable-output comparison, not an assertion on
  which internal code path ran).
- AC2: Checked, using the same seeded fixture task 3.1's own AC4 established,
  the round drawn through the actual page matches that same weak-biased set
  — proving the toggle end to end without re-deriving the weighting logic.
- AC3: The toggle, pool selector, and a zero-eligible-items pool interact
  correctly — start stays blocked regardless of the toggle's state.
- AC4: The checkbox is accessibly labeled and keyboard-operable.

## Architectural Decision

The toggle is plain `GamePage` component state, exactly like the input-mode
toggle from task 1.4 — not a persisted setting, for the same reason.

`GameRoundConfig.prioritizeWeakItems` is added here as an optional field
rather than in task 1.1, deliberately: it has no meaning until this task
wires it to something, and an optional field is additive by construction —
nothing upstream needed to anticipate it.

## Test Cases

- Unchecked (default): unweighted round, matching the seeded expectation.
- Checked: round matches task 3.1's own weak-biased expectation for the same
  fixture/seed, now proven through the page.
- Toggle + zero-eligible-pool interaction: start blocked either way.
- Checkbox accessibility: labeled, keyboard-operable.
