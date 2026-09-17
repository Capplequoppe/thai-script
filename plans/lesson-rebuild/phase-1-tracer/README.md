---
doc_type: index
title: "Phase 1 — Tracer: Lesson 1 through the new stack"
description: Declare lesson identity and a retrieval-bearing deck schema, migrate the five stores that key on lesson number, build the pipeline and the originality corpus, and produce Lesson 1 while every other lesson still serves its video.
covers:
  - e2e/lesson-intro.spec.ts
  - content/lessons/lesson-01.md
  - public/lessons/lesson-01
  - scripts/build-originality-corpus.py
  - scripts/generate-lesson-deck.py
  - scripts/lesson_deck
  - .env.example
  - src/application/use-cases/StartLessonUseCase.ts
  - src/domain/integration.test.ts
  - src/domain/script/data
  - src/domain/script/entities
  - src/domain/script/services
  - src/domain/shared/services/AchievementService.ts
  - src/domain/shared/types.ts
  - src/domain/vocabulary/services
  - src/infrastructure/persistence
  - src/presentation/components/organisms
  - src/presentation/pages
  - src/presentation/test-utils/renderWithApp.tsx
  - src/domain/shared/services/AchievementService.test.ts
  - scripts/requirements.txt
phase_id: "1"
depends_on: []
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Phase 1 — Tracer

One lesson, end to end, through every piece of the new stack. Lessons 2–25 keep
serving their `.webm` files, untouched.

This phase was re-planned after the six-expert review. The original single
identity task was split, and the corpus task the plan depended on but never
declared was added.

## What a person can do at the end

Open `/lesson/1` and learn Lesson 1 from in-house slides — illustrations,
ElevenLabs narration, the existing symbol cards, and **at least one point where
they have to try to recall something before the answer appears**. Every other
lesson behaves exactly as it does today.

## The end-to-end criterion

Task 1.4 AC4: a learner completing Lesson 1 through the deck has the same
scheduled cards and the same unlocked vocabulary as one who completed it
through the video before this phase. It fails if identity, migration, renderer,
pipeline or content is wrong.

## If the plan stopped here

One lesson is in-house, twenty-four are not, and no half-migrated state is left
behind: 1.1a is additive, and 1.1b converts all five stores in one pass.

## Tasks

| Task | Delivers | Depends on |
|---|---|---|
| 1.1a | Lesson ids, `LessonContent`, the declared sequence, the retrieval-bearing deck schema — all additive | — |
| 1.5 | Salted-hash originality corpus and the one shared overlap check | — |
| 1.1b | The five-store migration, and every lesson count derived from the sequence | 1.1a |
| 1.2 | The deck slide type, with retrieval rendered before reveal | 1.1a |
| 1.3 | The generation pipeline: script → audio + images → deck JSON | 1.1a |
| 1.4 | Lesson 1 authored, generated, and serving | 1.1b, 1.2, 1.3, 1.5 |

Critical path is 1.1a → 1.1b → 1.4. **1.2 and 1.3 run concurrently with 1.1b**
from 1.1a onward, on disjoint files, and 1.5 runs alongside from the start. The
split is what buys that: in the first draft the pipeline waited behind a
migration it has no dependency on.

The concurrency is safe *because* 1.1a is additive — 1.2's `npm run build` runs
against a tree where `completedLessons` is still `number[]`, so it cannot
inherit 1.1b's in-flight breakage.

## The exception this phase takes

Task 1.1b is an **at-once migration**: five persisted stores move together. That
is horizontal by nature and is the legitimate exception — one representation
replaces another, and a per-store rollout is the failure CONTEXT.md opens with.

## What will bite

- **Read CONTEXT.md's Rule 1 before touching identity.** Five stores, not
  three. The fifth is on every one of the 295 cards in `progress.json`.
- **Read Rule 2 before adding a module.** `priority`, the tone-contour
  vocabulary, `ClassBadge` and `migrateState` already exist.
- **The five lesson-count literals are derived, not updated.** Updating them to
  20 reopens the same defect at phase 4.
- **`e2e/` is in a `covers` for the first time.** It asserts Lesson 1 shows a
  `<video>`; nothing ran it before, so it would have broken invisibly.
- **`ScriptCardGenerator.ts:168` suppresses the class hint** on the
  class-retrieval card. Phase 2's district channel must respect it.
