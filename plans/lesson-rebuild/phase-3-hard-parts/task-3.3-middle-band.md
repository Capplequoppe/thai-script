---
doc_type: reference
title: "Task 3.3 — Produce the middle band"
description: Author and generate the mid-sequence lessons as in-house decks, covering the high-class consonants and the remaining vowel pairs.
covers:
  - content/lessons/lesson-06.md
  - content/lessons/lesson-07.md
  - content/lessons/lesson-08.md
  - content/lessons/lesson-09.md
  - content/lessons/lesson-10.md
  - content/lessons/lesson-11.md
  - public/lessons/lesson-06/
  - public/lessons/lesson-07/
  - public/lessons/lesson-08/
  - public/lessons/lesson-09/
  - public/lessons/lesson-10/
  - public/lessons/lesson-11/
  - src/domain/script/data/middleBand.test.ts
  - src/domain/script/data/lessonContent.ts
status: stable
task_id: "3.3"
task_status: complete
depends_on: ["3.1", "3.2"]
size: large
verify:
  - npm test -- src/domain/script
  - npm run build
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/middleBand.test.ts asserting each band lesson resolves to the deck arm"
  - "AC2 -> a case in src/domain/script/data/middleBand.test.ts cross-checking taught symbols against declared sets"
  - "AC3 -> a case in src/domain/script/data/middleBand.test.ts asserting no symbol is used before the lesson that teaches it"
  - "AC4 -> a case in src/domain/script/data/middleBand.test.ts resolving each example word against vocabulary.json"
  - "AC5 -> a case in src/domain/script/data/middleBand.test.ts asserting no 8-gram overlap with the transcript corpus"
  - "AC6 -> a case in src/domain/script/data/middleBand.test.ts asserting every referenced asset exists"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 8"
weight_voted: "sha256:2fc6972f1791d7bd9659902ad5bbe7dc912f77ecc823811f35a56c37a635d1fe"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 3.3 — The middle band

The mid-sequence lessons: the high-class consonants and their low-class
cousins, and the remaining vowel pairs. The band where the class rule from
phase 2 starts paying off, because the high/low pairs (ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ,
ฝ↔ฟ, ส↔ซ, ห↔ฮ) are **seven** decisions rather than fourteen letters.

The seventh pair is the one a hand-compiled list drops: ฮ is 0.01% of running
text, so curating by salience loses it — and with it ห, the 4th commonest
syllable initial in the language at 6.09%. Derive the pairs from the sound
groups rather than listing them.

Teach the pairs **as pairs**, and lean on the district encoding: the two
members of a pair differ in district, which is the thing the learner has to
retain about them.

## Acceptance Criteria

- AC1: Every lesson in the middle band resolves to the deck arm.
- AC2: Each lesson introduces exactly the symbols it declares, asserted in
  both directions.
- AC3: Across the whole sequence to this point, no lesson uses a symbol
  taught by a later lesson. This is a sequence-wide check, not a per-lesson one.
- AC4: Every Thai example word resolves to a `vocabulary.json` entry inside
  the declared rank window, or is declared in `teachingWords` with a reason.
- AC5: No eight-word sequence of band narration occurs in the extracted
  transcript corpus; the check asserts it detects a planted overlap.
- AC6: Every asset referenced by a band deck exists at its declared path.

## Test cases

- Each band lesson resolves to the deck arm.
- Symbol sets match declarations in both directions.
- Sequence-wide: no forward reference to an untaught symbol.
- All **seven** cousin pairs are introduced, each in one lesson, with the two
  members carrying different districts — ห↔ฮ included.
- The pair list is derived from the sound groups, not a literal; removing a pair
  from the source data makes the test fail.
- Every example word resolves or is declared with a reason.
- Example words fall inside the declared rank window; a word outside it fails
  unless declared.
- No 8-gram overlap; a planted overlap is caught.
- Every asset exists.

## Architectural Decision

**The forward-reference check (AC3) is sequence-wide rather than per lesson.**
A per-lesson assertion passes for every lesson individually while the sequence
as a whole still has a lesson using a symbol introduced later — the failure is a
property of the ordering, not of any one document. Checking it once across the
declared sequence is also what makes phase 4's resequencing safe: moving a
lesson that breaks the ordering fails here rather than reaching a learner.
