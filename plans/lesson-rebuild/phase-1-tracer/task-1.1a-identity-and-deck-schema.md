---
doc_type: reference
title: "Task 1.1a — Lesson identity vocabulary, the content union, and the deck schema"
description: Declare stable lesson ids, the LessonContent union, the declared lesson sequence, and a deck schema that requires a retrieval attempt — all additive, moving nothing that is persisted.
covers:
  - src/domain/script/data/lessonContent.ts
  - src/domain/script/data/lessonContent.test.ts
  - src/domain/script/data/lessonSequence.ts
  - src/domain/script/data/lessonSequence.test.ts
  - src/domain/script/data/symbols.ts
status: stable
task_id: "1.1a"
task_status: complete
depends_on: []
size: large
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/script
  - npx biome check .
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/lessonContent.test.ts asserting refusal for each malformed id shape"
  - "AC2 -> a compile-time check: the exhaustive switch's never-default, asserted by tsc in verify"
  - "AC3 -> a case in src/domain/script/data/lessonContent.test.ts rejecting a deck whose slides contain no retrieval step"
  - "AC4 -> a case in src/domain/script/data/lessonSequence.test.ts asserting order and ids are declared for every lesson"
  - "AC5 -> a case in src/domain/script/data/lessonSequence.test.ts asserting the lesson count is derived, with no integer literal"
  - "AC6 -> a case in src/domain/script/data/lessonContent.test.ts loading an unmodified pre-change fixture"
  - "AC7 -> three cases in src/domain/script/data/lessonContent.test.ts, one per state"
  - "AC8 -> a case in src/domain/script/data/lessonSequence.test.ts asserting no second declaration of an existing repo concept"
  - "AC9 -> a case in src/domain/script/data/lessonContent.test.ts asserting a rule slide renders from its declared rules block"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 3"
  - "calibration-estimator -> 8"
weight_voted: "sha256:fe7dabdc68ca5d82224c0c07f3e3c57eccdea2f703a49ec1c821de342c6da3e0"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 1.1a — Identity, content union, deck schema

The additive half of the old task 1.1. It declares the vocabulary everything
downstream encodes against and **moves nothing that is persisted** — so it
needs no build gate, and tasks 1.2, 1.3 and 1.5 depend on this rather than on
the migration.

Read CONTEXT.md's Rule 1 and Rule 2 first. Rule 2 in particular: lesson
ordering is currently implied twice (array position, and the `lesson` field),
and `TONE_CONTOUR_POINTS`, `priority` and `ClassBadge` already exist. This task
names what exists; it does not create parallel versions.

## Acceptance Criteria

- AC1: A lesson id matches `^[a-z0-9-]{1,64}$`. A value outside that charset is
  refused where a path or lookup derives from it, and the refusal names the
  offending key without echoing the value.
- AC2: `LessonContent` is a discriminated union — `{kind:"video", url}` and
  `{kind:"deck", deckPath}`. Dispatch is exhaustive via a `const _never: never`
  default; a third arm without a handler is a compile error.
- AC3: A deck schema instance is valid only if its slides contain **at least
  one retrieval step before its corresponding reveal** — a prompt the learner
  answers or attempts, whose answer is not visible at the same time. A deck of
  pure exposition is refused by the schema, naming the missing step.
- AC4: `lessonSequence.ts` declares, for every lesson, its stable id and its
  position. Ordering is read from this declaration and from nowhere else.
- AC5: The lesson count is derived from the declared sequence. No integer
  literal for the lesson count is introduced by this task, and the derivation is
  exported for the consumers task 1.1b will convert.
- AC6: Every persisted shape still loads unchanged. `completedLessons` is still
  `number[]` after this task; a `thai-srs-state` fixture written before it loads
  byte-identically. This task is additive and a test proves it.
- AC7: A lesson's content resolution is in exactly one of three states:
  resolved to an arm; declared but unresolvable, reported with the reason; and
  not yet declared. Unresolvable never reads as undeclared.
- AC8: No concept this task declares duplicates one the repository already
  ships. A test asserts that the tone-contour vocabulary, symbol priority, and
  the class badge each have exactly one declaration site in the codebase.
- AC9: A lesson that teaches a rule declares it in a machine-readable `rules`
  block, and its rule slides are **rendered from** that block. Prose and block
  cannot disagree, which is what makes "apply the rule as the lesson states it"
  checkable at all — the criteria in 2.5, 3.2 and 4.2 depend on it.

## Test cases

- Ids outside the charset are refused at each derivation site.
- A deck with a reveal but no preceding retrieval step fails validation, naming
  the missing step; a deck with one passes.
- A deck whose retrieval step and reveal are on the same slide fails — the
  point is the attempt, not the ordering of two fields.
- Every lesson has an id and a position; positions are unique and total.
- Grepping the built source finds exactly one declaration of the tone-contour
  vocabulary, one of symbol priority, one of the class badge.
- A pre-change `thai-srs-state` fixture loads unchanged and re-serialises
  byte-identically.
- The three content-resolution states are three distinct values.

## Architectural Decision

**Split from the migration (old task 1.1), and this half first.** The panel
found the original task doing two jobs sharing only two files, with the
hazardous half blocking work that does not need it. Tasks 1.2, 1.3 and 1.5 need
the schema and the charset and nothing from the migration, so splitting turns
two serial size-13 tasks into concurrent ones and confines the build gate to
the half that actually breaks things.

**Ids declared beside the numbers, not replacing them.** Additive means a
half-finished plan leaves nothing broken, and it lets 1.1b's migration be a
single reviewable change rather than a change tangled with a vocabulary
introduction.

**Retrieval is a schema requirement, not a content guideline.** The review found
zero retrieval attempts across 114 criteria in the first draft. A guideline in a
task body would be honoured by the first lesson and forgotten by the twelfth; a
schema rule is checked on every deck for free. It lands here because every
later content task encodes against this schema.

*Rejected:* ordering declared in phase 2 alongside the first resequencing. That
has phase 1 declare an order one way and phase 2 replace it — a representation
swap with a per-consumer window, which CONTEXT.md rejects on its own terms.
