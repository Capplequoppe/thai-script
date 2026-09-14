---
doc_type: reference
title: "Task 1.1b — Migrate all five lesson-identity stores, and derive every lesson count"
description: Convert the five persisted stores that key on lesson number in one pass at the existing migrateState boundary, and replace every hardcoded lesson count and integer walk with the declared sequence.
covers:
  - src/infrastructure/persistence/Storage.ts
  - src/infrastructure/persistence/Storage.test.ts
  - src/infrastructure/persistence/StorageLearnerStateRepository.ts
  - src/infrastructure/persistence/StorageLearnerStateRepository.test.ts
  - src/infrastructure/persistence/Validation.ts
  - src/infrastructure/persistence/Validation.test.ts
  - src/infrastructure/persistence/MergeService.ts
  - src/infrastructure/persistence/MergeService.test.ts
  - src/domain/shared/types.ts
  - src/domain/shared/services/AchievementService.ts
  - src/domain/shared/services/AchievementService.test.ts
  - src/domain/script/entities/ScriptPropertyCard.ts
  - src/domain/script/entities/ScriptPropertyCard.test.ts
  - src/domain/script/services/ScriptCardGenerator.ts
  - src/domain/script/services/ScriptLessonService.ts
  - src/domain/script/services/ScriptLessonService.test.ts
  - src/domain/vocabulary/services/VocabularyLessonService.ts
  - src/domain/vocabulary/services/VocabularyLessonService.test.ts
  - src/application/use-cases/StartLessonUseCase.ts
  - src/domain/integration.test.ts
  - src/presentation/pages/ProgressPage.tsx
  - src/presentation/pages/StageItemsPage.tsx
  - src/presentation/pages/LearnedItemsPage.tsx
  - src/presentation/components/organisms/LessonPath.tsx
  - src/presentation/components/organisms/AchievementBadge.tsx
  - e2e/lesson-intro.spec.ts
status: stable
task_id: "1.1b"
task_status: pending
depends_on: ["1.1a"]
size: x-large
verify:
  - npm run build
  - npm test -- src/domain
  - npm test -- src/infrastructure
  - npm test -- src/presentation
  - npx biome check src/application/use-cases src/domain/integration.test.ts src/domain/script/entities src/domain/script/services src/domain/shared src/domain/shared/services src/domain/vocabulary/services src/infrastructure/persistence src/presentation/components/organisms src/presentation/pages
ac_enforcement:
  - "AC1 -> a case in src/infrastructure/persistence/Storage.test.ts loading a five-store pre-migration fixture"
  - "AC2 -> a case in src/infrastructure/persistence/Storage.test.ts asserting the conversion runs inside migrateState"
  - "AC3 -> a case in src/domain/vocabulary/services/VocabularyLessonService.test.ts comparing getUnlockedWords either side of migration"
  - "AC4 -> a case in src/infrastructure/persistence/MergeService.test.ts with one migrated and one unmigrated input"
  - "AC5 -> three cases in src/infrastructure/persistence/Validation.test.ts, one per state"
  - "AC6 -> a case in src/domain/script/services/ScriptLessonService.test.ts asserting no lesson-count literal remains in the five named files"
  - "AC7 -> a case in src/presentation/components/organisms/LessonPath.test.tsx asserting the path renders from the declared sequence"
  - "AC8 -> the Playwright suite in e2e/lesson-intro.spec.ts, run in verify"
  - "AC9 -> a case in src/domain/script/services/ScriptLessonService.test.ts asserting refusal names the missing prerequisite"
weight_votes:
  - "author -> 21"
  - "structure-estimator -> 21"
  - "implementation-estimator -> 21"
  - "unknowns-estimator -> 8"
  - "calibration-estimator -> 21"
weight_voted: "sha256:563b1f95dc036e59c14a84142dd0e055d9a3a9aad034ab9390ab734470bb25b9"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 1.1b — The five-store migration

The hazardous half. CONTEXT.md's Rule 1 is the whole brief: five persisted
stores key on lesson number, `tsc` catches none of it because every side is
`number`, and 295 of 295 cards in the repo's own `progress.json` carry store 5.

Migrate all five **in one pass**, at the boundary the repo already has.

## Acceptance Criteria

- AC1: All five stores convert together: `completedLessons`, `currentLesson`,
  `sym.lesson`, the lessons table's `number`, and `ScriptPropertyCard.lessonNumber`
  on every persisted card. A fixture carrying all five converts in one load, and
  a fixture carrying only some is reported rather than half-converted.
- AC2: The conversion runs inside `Storage.ts`'s existing `migrateState`, the
  repo's established migrate-once-at-load boundary. No second migration site is
  introduced, and no consumer carries its own back-compatibility branch.
- AC3: For the same learner, `getUnlockedWords()` returns the same words before
  and after migration. This is the join-key proof, asserted through the
  **public** method — `getMasteredCharacters` is `private` on a class exported
  as `VocabularyService`, and `getMasteredToneRules` gates the same result, so
  asserting the public output covers both.
- AC4: `MergeService` unions two devices' state when one input is migrated and
  the other is not, losing nothing from either side, across all five stores.
- AC5: Three persisted states are distinguishable: never written, written and
  empty, and written but unreadable (reported with its reason). Unreadable never
  reads as empty.
- AC6: No lesson-count literal remains in `ScriptLessonService.ts`,
  `AchievementService.ts`, `ProgressPage.tsx` (both sites) or
  `AchievementBadge.tsx`. Each derives from the declared sequence, including the
  badge's user-facing copy.
- AC7: All three integer walks read the declared sequence rather than
  `1..n`: `startLesson`, `getNextLesson`, and `LessonPath`'s node enumeration.
  `LessonPath` renders one node per declared lesson, whatever the count.
- AC8: The Playwright suite passes. Its assertions are updated where this plan
  legitimately changes behaviour, and the suite is in this task's `verify` so
  the change is visible to a gate.
- AC9: `startLesson` enforces prerequisites from the declared order. A lesson
  with an incomplete predecessor is refused, naming that predecessor.

## Test cases

- A five-store fixture converts in one load; re-saving and re-loading is stable.
- A fixture with `completedLessons` migrated but `lessonNumber` not is reported,
  not silently accepted — the half-migrated state is the hazard.
- `getUnlockedWords()` is identical across migration for a learner part-way
  through, not only for empty and complete learners.
- Two states, one migrated and one not, merge to the union across all five.
- Never-written, empty and unreadable are three distinct reports.
- Grepping the five named files finds no lesson-count integer literal.
- `LessonPath` with a 20-lesson sequence renders 20 nodes; with 25, 25.
- The achievement badge's label and its unlock condition agree, at any count.
- `startLesson` names the first incomplete predecessor.

## Architectural Decision

**One pass at `migrateState`, never per consumer.** The repo already implements
this pattern at `Storage.ts:40`; a second boundary would leave two migration
sites disagreeing about which shape is current. CONTEXT.md records per-consumer
back-compatibility as the bug shape rather than the fix.

**The count literals are converted here, not "later."** Five literals across
four files and three layers decide achievement eligibility, the progress
display, the badge's copy, and which lesson the app offers next. They exist
because the count has nowhere else to live; 1.1a gives it a home, so this task
moves them all at once. Updating them to `20` instead would relocate the
problem to phase 4's resequencing.

**`e2e/` enters a `covers` for the first time.** The Playwright suite asserts
Lesson 1 shows a `<video>` and checks a romanization this plan changes. It is
excluded from vitest and no `verify` ran it, so the plan would have broken it
invisibly. Owning it here makes the breakage a gate failure rather than a
discovery.

*Rejected:* migrating stores 1–4 and leaving `lessonNumber` to a later task.
That is precisely the half-migration this plan opens by warning about, and it
would silently change every learner's mastered-character set.
