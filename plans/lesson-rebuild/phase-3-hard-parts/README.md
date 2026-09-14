---
doc_type: index
title: "Phase 3 — The hard parts, taught as real lessons"
description: Promote unwritten vowels, consonant clusters and leading consonants from scattered asides to first-class lessons, and produce the middle band.
covers:
  - content/lessons
  - public/lessons/lesson-06
  - public/lessons/lesson-07
  - public/lessons/lesson-08
  - public/lessons/lesson-09
  - public/lessons/lesson-10
  - public/lessons/lesson-11
  - public/lessons/lesson-clusters
  - public/lessons/lesson-leading-consonants
  - public/lessons/lesson-unwritten-vowels
  - src/domain/script/data
phase_id: "3"
depends_on: ["2"]
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Phase 3 — The hard parts

Three things actually stop beginners reading Thai, and the source course treats
all three as asides:

- **Unwritten vowels** — the implicit โอะ in a bare consonant pair, the implicit
  อะ in polysyllables. Roughly three scattered paragraphs across four lessons.
- **Consonant clusters** — one passing mention that only ร ล ว cluster, with
  true-versus-false clusters (ทร reading as *s*, the silent ร) held back to the
  final lesson.
- **Leading consonants (อักษรนำ)** — stated once as an observation about two
  words, then the ห-leading case and the identical อ-leading case are taught ten
  lessons apart and never connected as one mechanism.

Each becomes a lesson here.

## What a person can do at the end

Read a word whose vowel is not written, decide whether two adjacent consonants
are a cluster, and know that a leading high or mid consonant passes its class
to the syllable after it — as one rule, not three coincidences.

## The end-to-end criterion

Task 3.2 AC4: given a set of written Thai words drawn from the frequency
corpus whose syllabification depends on exactly these three rules, the rules as
the lessons state them resolve every one — pronunciation and tone — without
appeal to material the lessons do not present.

## If the plan stopped here

The opening and middle bands are in-house and the three concepts that block
reading are taught. The remaining lessons still serve video through the seam.

## Tasks

| Task | Delivers | Depends on |
|---|---|---|
| 3.1 | Syllable rules as domain data: implicit vowels, cluster inventory, leading consonants | — |
| 3.2 | The three promoted lessons | 3.1 |
| 3.3 | The middle band produced, including the high-class residue lesson | 3.1 |

3.2 and 3.3 run concurrently on disjoint lesson files and disjoint asset
directories. 3.1 fixes the rule representation both encode against **and owns
`lessonSequence.ts`**, declaring a slot for every lesson this phase produces.
Without that, both content tasks would have to edit the sequence to place their
own lessons — a file neither declares, so the scheduler would not catch the
collision and the two would each invent an ordering.

## What will bite

- **These rules are why the app can parse syllables at all.** `vocabulary.json`
  already carries a `syllables` array per entry with `initialConsonant`,
  `vowel`, `finalConsonant`, `toneMark`, `consonantClass` and `syllableType`.
  Task 3.1's rules must agree with that existing data, and where they disagree
  the disagreement is the finding — one of the two is wrong about real words.
- **ห-leading and อ-leading are one mechanism.** Teaching them as two is the
  defect being repaired; a lesson plan that reintroduces the split fails 3.2.
- **The อ-leading case is closed at four words.** State the closure, because a
  learner who thinks it is productive will over-apply it.
