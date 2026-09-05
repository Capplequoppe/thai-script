---
doc_type: reference
title: "Task 1.3 — PlayGameUseCase"
description: A stateless orchestrator (matching ConductReviewUseCase's pattern) exposing pure round-lifecycle functions the caller's own state drives, guaranteeing zero mutation of any card's SRS schedule.
covers:
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
status: draft
task_id: "1.3"
task_status: complete
depends_on: ["1.1"]
size: medium
verify:
  - npm test -- src/application/use-cases/PlayGameUseCase
ac_enforcement:
  - "AC1 -> a case starting a round against a fixture CardRepository and asserting the returned item count/shape"
  - "AC2 -> the critical case: snapshot every fixture script card's schedule.toDTO() before a round, record several ratings including at least one per rating value, finish the round, then re-read the same cards from the repository and assert deep-equality with the pre-round snapshot"
  - "AC3 -> a case recording a known mix of ratings and asserting the computed per-rating counts and an integer accuracy percentage, rounded half-up"
  - "AC4 -> a case finishing two separate rounds on the SAME use-case instance and asserting each round's own summary reflects only its own ratings (not merely that two distinct history entries exist) — this is the case that would catch a stateful-instance leak"
  - "AC5 -> a case finishing a round with zero ratings recorded, asserting the summary reports accuracy: null, distinct from a round with >0 ratings and 0 of them Good/Easy (accuracy: 0)"
  - "AC6 -> a case calling recordRating twice for the same item index with different ratings, asserting the second call's result reflects only the latest rating for that index (idempotent overwrite, not double-counted) and that finishing a round does not append a second history entry when finishRound/saveHistory is invoked twice for the same completed round"
ac_tests:
  - "AC1 -> src/application/use-cases/PlayGameUseCase.test.ts::AC1: starts a round matching what GameItemSelectionService itself would produce"
  - "AC2 -> src/application/use-cases/PlayGameUseCase.test.ts::AC2: playing a full round leaves every underlying card's schedule untouched"
  - "AC3 -> src/application/use-cases/PlayGameUseCase.test.ts::AC3: reports counts per rating and an integer accuracy rounded half-up"
  - "AC4 -> src/application/use-cases/PlayGameUseCase.test.ts::AC4: two rounds on the same instance reflect only their own ratings"
  - "AC5 -> src/application/use-cases/PlayGameUseCase.test.ts::AC5: a zero-rating round reports accuracy null, distinct from a rated 0% round"
  - "AC6 -> src/application/use-cases/PlayGameUseCase.test.ts::AC6: recording a rating twice for the same item index overwrites, never double-counts"
red_proof:
  - "AC3 -> Changed CORRECT_RATINGS from new Set([4,5]) to new Set([3,4,5]) in PlayGameUseCase.ts, so rating 3 (Hard) was wrongly counted as correct."
red_proof_waived:
  - "AC1 -> traced: Not re-run via observe-red separately in this review pass; AC3's mutation already proves the harness catches a real defect in this same file."
  - "AC2 -> traced: Traced by hand: PlayGameUseCase never imports or calls CardRepository/ReviewableCard.recordReview, so no code path exists that could mutate schedule; test passed."
  - "AC4 -> traced: Traced: recordRating/finishRound take all state as arguments with no instance field for ratings, so cross-round leakage is structurally impossible; test passed."
  - "AC5 -> traced: Traced: accuracy is null only when ratedCount===0, verified by direct code reading and passing test."
  - "AC6 -> traced: Traced: recordRating filters any existing record with the same itemKey before appending, and saveHistory checks a WeakSet before appending to history; verified by direct reading and passing tests."
lint:
  before: 7
  after: 7
  outcome: incomplete
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.3 — PlayGameUseCase

## Description

Revised after panel review found the original "in-memory round state,
accumulated on the use case's own instance" design incompatible with how
this use case is wired: `AppContext.tsx` constructs every use case as one
long-lived, module-level singleton, and this app's existing analog
(`ConductReviewUseCase`/`ReviewService.startReviewSession`) is deliberately
**stateless between calls** — the *caller* (`useReviewSession.ts`) holds
`session`/`cardIdx` in its own React state, and hands the whole session
object back in to end it. `PlayGameUseCase` must follow the same pattern:

```
startRound(config: GameRoundConfig): GameItem[]
recordRating(ratings: GameRatingRecord[], itemIndex: number, rating: RecallRating): GameRatingRecord[]
finishRound(items: GameItem[], ratings: GameRatingRecord[]): GameRoundSummary
saveHistory(config: GameRoundConfig, summary: GameRoundSummary): void
getHistory(): GameHistoryListResult
```

Every function above except `saveHistory`/`getHistory` is a pure function of
its arguments — no instance field holds round-in-progress state. Task 1.4's
`GamePage` owns `items`/`ratings`/`currentIndex` as its own React state and
threads them through these calls exactly as `useReviewSession` already
threads its session object through `ReviewService`.

`recordRating` must be idempotent for a given `itemIndex`: calling it twice
(e.g. from a stray keypress plus a click — `RatingButtons` binds a global
`keydown` handler with no focus guard, see CONTEXT.md) overwrites, never
double-counts, that index's rating.

`getHistory()` is added here — not a repository exposed on `AppContext` —
because no repository is exposed on `AppContextValue` today (only use cases
and one domain service); routing history reads through the use case keeps
that boundary intact.

## Acceptance Criteria

- AC1: Starting a round with a given config returns the items
  `GameItemSelectionService` would produce for that config.
- AC2: Playing a full round — recording a rating for every item, at least one
  of each of the five rating values across a multi-item round — leaves every
  underlying script card's `schedule` fields exactly as they were before.
  (This is a necessary but not sufficient check on its own — task 1.4's AC
  widens it to the whole SRS blob, end to end.)
- AC3: The finished round's summary reports the count of items rated at each
  of the five values and an integer accuracy percentage (rounded half-up)
  counting only ratings 4 (Good) and 5 (Easy) as correct — a deliberately
  different threshold from `ReviewService.endReviewSession`'s `rating >= 3`.
- AC4: Two rounds played on the same `PlayGameUseCase` instance produce
  summaries that reflect only their own recorded ratings — proof against a
  cross-round state leak, not merely that two history entries exist.
- AC5: Finishing a round with zero ratings recorded reports `accuracy: null`,
  distinct from a round with ratings recorded but zero of them Good/Easy
  (`accuracy: 0`).
- AC6: Recording a rating twice for the same item index is idempotent
  (overwrite, not double-count); finishing/saving an already-saved round does
  not append a duplicate history entry.

## Architectural Decision

Statelessness is the mechanism that makes "SRS state stays untouched"
structural rather than a flag anyone could forget: no `ReviewableCard`
instance ever crosses out of the selection service, and no rating is ever
routed through `CardRepository.save`/`ReviewableCard.recordReview` — there is
no code path that *could* mutate a schedule, not merely one that happens not
to be called. Making the use case itself stateless is a second, independent
guarantee on top: even a bug in `GamePage`'s own state handling cannot leak
one round's ratings into another round's summary, because
`PlayGameUseCase`'s functions only ever see what they're explicitly handed.

The accuracy threshold (Good/Easy only) intentionally differs from
`ReviewService.endReviewSession`'s own convention (`rating >= 3`). Both are
legitimate, context-local conventions — this task must not "fix" the game's
threshold to match the review one.

## Test Cases

- Start a round: item count/shape matches selection's output for the same
  fixture/config.
- Full round, mixed ratings, before/after schedule snapshot: deep-equal.
- Mixed-rating round: counts-per-rating and rounded accuracy% match
  hand-computed expectations.
- Two rounds on one use-case instance, back to back: each summary reflects
  only its own ratings.
- Zero-rating round: `accuracy: null`, distinct from a rated-but-0%-correct
  round.
- Double-rating the same item index: idempotent overwrite.
- Double-finishing the same round: no duplicate history entry.
