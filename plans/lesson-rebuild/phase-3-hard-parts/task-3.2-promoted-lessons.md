---
doc_type: reference
title: "Task 3.2 — The three promoted lessons"
description: Author and produce lessons for unwritten vowels, consonant clusters and leading consonants, each sufficient on its own stated content.
covers:
  - content/lessons/lesson-unwritten-vowels.md
  - content/lessons/lesson-clusters.md
  - content/lessons/lesson-leading-consonants.md
  - public/lessons/lesson-unwritten-vowels/
  - public/lessons/lesson-clusters/
  - public/lessons/lesson-leading-consonants/
  - src/domain/script/data/promotedLessons.test.ts
status: stable
task_id: "3.2"
task_status: pending
depends_on: ["3.1"]
size: large
verify:
  - npm test -- src/domain/script
  - npm run build
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/promotedLessons.test.ts asserting each lesson resolves to the deck arm"
  - "AC2 -> a case in src/domain/script/data/promotedLessons.test.ts asserting the leading-consonant lesson presents one rule covering both spellings"
  - "AC3 -> a case in src/domain/script/data/promotedLessons.test.ts asserting the cluster lesson states the inventory as closed"
  - "AC4 -> a case in src/domain/script/data/promotedLessons.test.ts resolving corpus words using only these lessons' stated rules"
  - "AC5 -> a case in src/domain/script/data/promotedLessons.test.ts asserting no 8-gram overlap with the transcript corpus"
  - "AC6 -> a case in src/domain/script/data/promotedLessons.test.ts asserting every referenced asset exists"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 8"
weight_voted: "sha256:333e9fc41e16e692c6365bbe3fb1f223c6c317935c3177d249f1d4c692fc7b02"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 3.2 — The promoted lessons

Three lessons for the three things that actually block reading. Each is written
from the rules task 3.1 encoded, and each must be **sufficient on its own
stated content** — that is what AC4 tests, and it is the criterion that catches
a lesson which is correct but incomplete.

## Acceptance Criteria

- AC1: Each of the three lessons resolves to the deck arm and appears in the
  declared sequence at its stated position.
- AC2: The leading-consonant lesson presents **one** rule covering all three
  branches: silent ห, the closed four-word อ set, and — the branch the first
  draft omitted — a **mid- or high-class leader followed by a sonorant**, which
  is productive and contains สวัสดี at rank 9, plus ขนาด 176, ตลอด 264,
  สงบ 383, สนใจ 384, สมัย 415, ผลิต 483, ถนน 589. A lesson covering only ห and
  อ fails, and so does one presenting the branches as unrelated mechanisms.
- AC3: The cluster lesson states the inventory as closed: which pairs
  cluster, which are false clusters, and which drop a consonant. A learner
  applying it to a pair outside the inventory is told it is not a cluster.
- AC4: Given words from the frequency corpus whose reading depends on these
  three rules, the rules **as these lessons state them** resolve each word's
  pronunciation and tone. A word requiring knowledge the lessons do not present
  fails this criterion — which is how an incomplete lesson is caught.
- AC5: No eight-word sequence of any lesson's narration occurs in the
  extracted transcript corpus; the check asserts it detects a planted overlap.
- AC6: Every asset referenced by these decks exists at its declared path.

## Test cases

- Each lesson resolves to the deck arm at its declared sequence position.
- The leading-consonant lesson's rule, applied to a ห-leading and an อ-leading
  word, yields the correct class inheritance for both from one statement.
- The อ-leading set has four members and the lesson says so.
- สวัสดี, ขนาด, ตลอด and สนใจ each resolve correctly from the stated rule — a
  lesson omitting the mid/high-leader branch fails on all four.
- A consonant pair outside the inventory is reported as not a cluster.
- A sample of corpus words resolves from the lessons' stated rules alone.
- Removing one rule from a lesson's stated content makes AC4's test fail —
  proving the test depends on the lesson text, not on `syllableRules.ts`.
- No 8-gram overlap; a planted overlap is caught.
- Every asset exists.

## Architectural Decision

**AC4 resolves words from the lesson text rather than from the rule module.**
The rules being correct is task 3.1's criterion. What can still go wrong here
is that a lesson states them incompletely and the learner is left deriving from
material that does not reach. Testing against `syllableRules.ts` would pass in
exactly that case, which is why the test reads the lesson's own content and why
one test asserts it fails when the content is thinned.
