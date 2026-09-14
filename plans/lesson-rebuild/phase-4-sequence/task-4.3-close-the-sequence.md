---
doc_type: reference
title: "Task 4.3 — Close the sequence: final band, demotions, optional numerals"
description: Produce the remaining lessons, demote rare letters to a low-priority SRS tail, make Thai numerals an optional track, and prove the whole sequence resolves the taught corpus.
covers:
  - content/lessons/lesson-12.md
  - content/lessons/lesson-13.md
  - content/lessons/lesson-14.md
  - content/lessons/lesson-numerals.md
  - public/lessons/lesson-12/
  - public/lessons/lesson-13/
  - public/lessons/lesson-14/
  - public/lessons/lesson-numerals/
  - src/domain/script/data/lessonSequence.ts
  - src/domain/script/data/lessonContent.ts
  - src/domain/script/data/symbols.ts
  - src/domain/script/data/sequenceClosure.test.ts
status: stable
task_id: "4.3"
task_status: complete
depends_on: ["4.1", "4.2"]
size: x-large
verify:
  - npm test -- src/domain/script
  - npm run build
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/sequenceClosure.test.ts asserting no lesson resolves to the video arm"
  - "AC2 -> a case in src/domain/script/data/sequenceClosure.test.ts asserting every symbol is taught by some lesson"
  - "AC3 -> a case in src/domain/script/data/sequenceClosure.test.ts asserting demoted letters remain in the SRS set"
  - "AC4 -> three cases in src/domain/script/data/sequenceClosure.test.ts covering the numerals track's three states"
  - "AC5 -> a case in src/domain/script/data/sequenceClosure.test.ts resolving tones for corpus words inside the taught rank window"
  - "AC6 -> a case in src/domain/script/data/sequenceClosure.test.ts asserting no forward reference across the final sequence"
weight_votes:
  - "author -> 21"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 21"
  - "unknowns-estimator -> 8"
  - "calibration-estimator -> 13"
weight_voted: "sha256:4f7e4425ef5853bcd5b5acc3f83775ba55c81790c4594d28b2907c83c63ef4b5"
ac_tests:
  - "AC1 -> src/domain/script/data/sequenceClosure.test.ts::resolves every declared lesson to a deck"
  - "AC2 -> src/domain/script/data/sequenceClosure.test.ts::files every consonant in exactly one lessons-table row, and that row is in the sequence"
  - "AC3 -> src/domain/script/data/sequenceClosure.test.ts::keeps the symbol set at 44 consonants, every one reachable through some lesson's cards"
  - "AC4 -> src/domain/script/data/sequenceClosure.test.ts::resolves a learner to exactly one of three distinct states"
  - "AC5 -> src/domain/script/data/sequenceClosure.test.ts::matches the recorded baseline across the taught rank window, reporting each disagreement"
  - "AC6 -> src/domain/script/data/sequenceClosure.test.ts::sweeps every deck in the final sequence against what is taught by that point"
red_proof:
  - "AC1 -> Before implementation: ran the test against the pre-resequence tree (lessons 12-25 still on video). After implementation: removed \"lesson-14\" from DECK_LESSON_IDS in lessonContent.t… [see red-proofs/]"
  - "AC2 -> Changed ฌ's `lesson: 14` to `lesson: 99` (an undeclared number) in symbols.ts, reverted after. Self-review verdict: a real assertion failure (row-membership/lesson-field coherence expect)."
  - "AC3 -> Same mutation as AC2 (ฌ filed under undeclared lesson 99): no lesson's generated cards then cover ฌ. Self-review verdict: a real assertion failure with the criterion's own message."
  - "AC4 -> Two mutations. (1) numeralsTrackState's skipped branch replaced with `return \"not-started\"` in lessonSequence.ts. (2) numerals entry flipped to required: true. Both reverted. Self-r… [see red-proofs/]"
  - "AC5 -> Corrupted the mid-class mai-ek cell in toneMarkRules (resultingTone \"low\" → \"high\") in symbols.ts, reverted after. Self-review verdict: a real assertion failure (the toEqual on TONE… [see red-proofs/]"
  - "AC6 -> Removed ห from row 12's consonants in symbols.ts without re-homing it, so no lesson teaches it; reverted after. Self-review verdict: a real assertion failure on the offences toEqual([])."
lint:
  before: 41
  after: 41
  outcome: unsupported
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 4.3 — Close the sequence

The last of the content, and the point at which the script track stops serving
any licensed video. Three changes land together because they are one
resequencing: the remaining lessons are produced, the rare letters move to a
low-priority tail, and numerals become an optional track rather than three
lessons' front halves.

## Acceptance Criteria

- AC1: No lesson in the sequence resolves to the video arm. Every lesson
  serves a deck.
- AC2: Every symbol in the course is taught by exactly one lesson —
  including ฬ, ฆ, ฑ, ฒ, ฐ, ฎ, ฏ, ฃ, ฅ and ฌ. Demotion changes when a letter is
  scheduled, never whether it is taught.
- AC3: Demoted letters remain in the SRS symbol set. The count of symbols a
  learner will eventually meet is unchanged by demotion; only their priority
  differs.
- AC4: The numerals track is in exactly one of three states for a learner,
  and the three are distinct: not started, completed, and deliberately skipped.
  Course completion does not silently depend on which — a learner who skips
  numerals is not reported as having an incomplete course.
- AC5: For every corpus word inside the taught rank window, the complete
  sequence's rules resolve its tone: the nine spelling rules, the eight
  tone-mark cells, the leading-consonant rule and the implicit vowels together.
  Disagreements are reported with the word and both readings, and counted against
  a recorded baseline rather than assumed zero.
- AC6: Across the final sequence, no lesson uses a symbol a later lesson
  teaches. The resequencing has not broken the ordering.

## Test cases

- No lesson resolves to the video arm.
- Every one of the 44 consonants and every vowel is taught by exactly one
  lesson; assert exactly one, so a symbol taught twice fails too.
- The SRS symbol-set size is identical before and after demotion.
- A demoted letter is reachable through review and does not gate progression.
- The numerals track's three learner states are three distinct values, and
  course completion is reported identically for a skipping and a completing
  learner.
- Tone resolution across the taught rank window matches the recorded baseline.
- No forward reference anywhere in the final sequence.

## Architectural Decision

**Demotion and resequencing land in one task.** They are the same edit to
`lessonSequence.ts` and to the `lesson` assignment on each symbol; splitting
them would put two tasks in the same file with a shared ordering neither owns —
the collaboration trap. The join-key hazard makes that worse than usual here,
because a half-applied resequencing is exactly the silent failure CONTEXT.md
opens with.

**Sized x-large.** It authors the remaining lessons, moves every rare letter's
priority, restructures the sequence, and carries the plan's widest end-to-end
criterion.

*Rejected:* deleting the obsolete letters ฃ and ฅ. They are still counted as
letters of the alphabet and a learner will meet them in a chart; teaching them
once, at the lowest priority, costs almost nothing and prevents the question.

*Rejected:* dropping numerals entirely. They are genuinely rare in running text
and genuinely present on signage and documents. Optional is the honest
placement, which is why AC4 makes "skipped" a first-class state rather than an
absence.
