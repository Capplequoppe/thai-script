---
doc_type: index
title: "Phase 4 — Tone marks consolidated and the sequence closed"
description: Teach the eight-cell tone-mark table as one pattern, demote rare letters to a low-priority SRS tail, make numerals optional, and complete the ~20-lesson sequence.
covers:
  - content/lessons
  - public/lessons/lesson-12
  - public/lessons/lesson-13
  - public/lessons/lesson-14
  - public/lessons/lesson-numerals
  - public/lessons/lesson-tone-marks
  - src/domain/script/data
phase_id: "4"
depends_on: ["3"]
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Phase 4 — Sequence

The source course spreads the tone-mark rules across six lessons with unrelated
material between them, so the learner never sees the pattern. The whole table
is eight cells:

- **Mid class** takes all four marks, mapping one-to-one onto low, falling,
  high and rising.
- **High and low class** take only mái-èek and mái-thoo — mái-dtrii and
  mái-jàt-dtà-waa never appear with them.
- **Low class is the odd one out**: its two marks give falling and high, where
  high class gives low and falling.

Stated together that is one lesson. This phase also removes the two largest
misallocations: four lessons on letters under 1% of running text, and three
lessons whose front halves teach Thai numerals.

## What a person can do at the end

Read any tone mark on any consonant class from one table, and work through a
complete ~20-lesson sequence with no lesson serving a licensed video.

## The end-to-end criterion

Task 4.3 AC5: for every word in the frequency corpus inside the taught rank
window, the complete sequence's rules resolve its tone — the nine spelling
rules, the eight tone-mark cells, the leading-consonant rule and the implicit
vowels together, with no appeal to untaught material.

## If the plan stopped here

The script track is complete and in-house. Phase 5's vocabulary palace and
phase 6's video export are additive; neither is needed for the alphabet course
to stand on its own.

## Tasks

| Task | Delivers | Depends on |
|---|---|---|
| 4.1 | The eight-cell tone-mark table and the rare-letter priority model | — |
| 4.2 | The consolidated tone-mark lesson | 4.1 |
| 4.3 | The final band, numerals demoted, and the sequence closed | 4.1, 4.2 |

## What will bite

- **Rare letters are demoted, not deleted.** All 44 consonants stay in the SRS
  — ฌ included, which the source course never teaches at all. What changes is
  their scheduling priority, not their existence. A learner who has "completed"
  the course must still eventually meet ฬ.
- **Numerals become optional, and optional is a third state.** Not taught, and
  taught-but-not-required, are different things; the sequence data must say
  which, and a learner's completion must not silently depend on it.
- **Resequencing moves `sym.lesson`.** The join-key hazard from CONTEXT.md is
  live again here. Task 1.1 made ids stable so this is safe, and the
  sequence-wide forward-reference check from task 3.3 is what proves the new
  ordering holds.
