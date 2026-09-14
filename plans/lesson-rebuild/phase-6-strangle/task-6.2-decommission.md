---
doc_type: reference
title: "Task 6.2 — Decommission the legacy video path"
description: Confirm every lesson serves a deck, delete the licensed files, and remove the video arm of the content seam.
covers:
  - public/videos/
  - src/domain/script/data/lessonContent.ts
  - src/domain/script/data/lessonContent.test.ts
  - src/domain/script/data/symbols.ts
  - src/presentation/components/organisms/LessonIntro.tsx
  - src/presentation/components/organisms/LessonIntro.test.tsx
  - src/presentation/pages/LessonPage.tsx
  - src/presentation/pages/CatchUpPage.tsx
  - src/domain/script/services/ScriptLessonService.ts
  - src/presentation/pages/LearnedItemsPage.tsx
  - src/domain/script/data/decommission.test.ts
status: stable
task_id: "6.2"
task_status: complete
depends_on: ["6.1"]
size: medium
verify:
  - npm run build
  - npm test -- src/domain/script
  - npm test -- src/presentation
  - npx biome check src/domain/script/data src/domain/script/services src/presentation/components/organisms src/presentation/pages
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/decommission.test.ts asserting every lesson resolves to a deck"
  - "AC2 -> a compile-time check: LessonContent has no video arm, asserted by tsc in verify"
  - "AC3 -> a case in src/domain/script/data/decommission.test.ts asserting no videoUrl reference remains in source"
  - "AC4 -> a case in src/domain/script/data/decommission.test.ts asserting no licensed file remains under public/videos"
  - "AC5 -> a case in src/domain/script/data/decommission.test.ts comparing scheduled cards and unlocked words across removal"
  - "AC6 -> a case in src/presentation/components/organisms/LessonIntro.test.tsx asserting both lesson routes render decks"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 2"
  - "calibration-estimator -> 5"
weight_voted: "sha256:b3e1814832c930ab7f98a409c78df0c6d024dfffcb01bd5142086079571b540b"
ac_tests:
  - "AC1 -> src/domain/script/data/decommission.test.ts::resolves every declared lesson to the deck arm"
  - "AC2 -> none"
  - "AC3 -> src/domain/script/data/decommission.test.ts::finds no occurrence of the token in any source file"
  - "AC4 -> src/domain/script/data/decommission.test.ts::the directory is gone, or if present, holds nothing"
  - "AC5 -> src/domain/script/data/decommission.test.ts::matches the recorded baseline for scheduled cards, next lesson, and unlocked words"
  - "AC6 -> src/presentation/components/organisms/LessonIntro.test.tsx::renders a deck the way LessonPage calls it, with no suppression prop"
red_proof:
  - "AC1 -> Removed \"lesson-05\" from DECK_LESSON_IDS in lessonContent.ts."
  - "AC3 -> Re-added `videoUrl?: string;` to LessonSummary in ScriptLessonService.ts."
  - "AC4 -> Recreated public/videos/ with a renamed leftover file (RENAMED_leftover.webm) -- re-verified after switching the check from existsSync to a direct readdirSync/ENOENT distinction."
  - "AC5 -> Changed SCHEDULE_BASELINE.dueCardsCount from 212 to 999 in decommission.test.ts."
  - "AC6 -> Forced `deckPhase` to always be false in LessonIntro.tsx (`const deckPhase = false && content.kind === \"deck\" && !deckDone;`), skipping the deck render entirely."
lint:
  before: 25
  after: 25
  outcome: incomplete
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 6.2 — Decommission

The last task. It removes the licensed material and the code path that served
it, in that order, with the confirmation first.

## Acceptance Criteria

- AC1: Every lesson in the sequence resolves to a deck. This is asserted
  **before** anything is deleted; a lesson still on the video arm blocks the
  removal rather than losing its content.
- AC2: `LessonContent` has no video arm. Code that dispatched on it still
  dispatches exhaustively, keeping the `never` default, so a future third arm is
  a compile error rather than a fallthrough.
- AC3: No `videoUrl` reference remains anywhere. `ScriptLessonService.ts`
  carries it at three sites including `LessonSummary`, and
  `LearnedItemsPage.tsx:77` has its own player reading `lesson.videoUrl!` — a
  non-null assertion that is already unsound and breaks outright here.
- AC4: `public/videos/` contains no ThaiPod101 file. The assertion is over
  the directory's contents, not over a list of names, so a file renamed rather
  than removed still fails.
- AC5: A learner's scheduled script cards and unlocked vocabulary are
  unchanged across the removal. The same end-to-end property phase 1 established,
  asserted once more at the point the old path disappears.
- AC6: Both lesson routes — `/lesson/:id` and `/catch-up/:id` — render decks
  after the removal. `CatchUpPage` has been the second consumer since phase 1 and
  is the one most likely to be missed here.

## Test cases

- Every lesson resolves to a deck; a fixture lesson forced onto the video arm
  makes the pre-deletion assertion fail.
- `LessonContent` has one arm, and the exhaustive dispatch still compiles with
  its `never` default.
- `public/videos/` holds no licensed file; a renamed file still fails.
- Scheduled cards and unlocked words are identical across removal for a learner
  part-way through the course — not only for an empty learner.
- Both routes render decks.

## Architectural Decision

**Confirm, then delete — enforced by criterion order.** AC1 is a precondition
rather than a summary: deleting first and discovering an unmigrated lesson
afterwards means a lesson with no content in the working tree. The files are
recoverable from git history, and the failure would still reach a learner
before anyone noticed.

**The `never` default stays after the union narrows to one arm.** It will read
as dead code, and it is the thing that will make the next content source a
compile error instead of a silent fallthrough. Task 1.1 established the pattern
for exactly this reason; removing it here would spend the guarantee at the
moment it stops costing anything.

*Rejected:* keeping the video arm "in case". An arm no lesson uses is a branch
nothing tests, and the plan's whole purpose is that it no longer exists.
