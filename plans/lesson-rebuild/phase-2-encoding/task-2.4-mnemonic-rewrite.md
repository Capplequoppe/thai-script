---
doc_type: reference
title: "Task 2.4 — Rewrite every symbol mnemonic under scene grammar"
description: Replace all 82 existing mnemonics with original records that bind shape, sound and class district, written from each symbol's own properties.
covers:
  - src/domain/script/data/symbols.ts
  - src/domain/script/data/mnemonics.test.ts
status: stable
task_id: "2.4"
task_status: pending
depends_on: ["2.1", "2.2"]
size: x-large
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/script
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/mnemonics.test.ts iterating all consonants and vowels"
  - "AC2 -> a case in src/domain/script/data/mnemonics.test.ts validating each record against the scene-grammar schema"
  - "AC3 -> a case in src/domain/script/data/mnemonics.test.ts asserting each consonant's district matches its derived class"
  - "AC4 -> the shared originality check from task 1.5, invoked over every mnemonic"
  - "AC5 -> a case in src/domain/script/data/mnemonics.test.ts asserting each pair's cue names the distinguishing feature task 2.1 declared"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 13"
weight_voted: "sha256:c130aaff1f58627a3ab549eee23d28bfa696d1fd8f4e6e4987549ee18a6a221e"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 2.4 — Mnemonic rewrite

The 82 mnemonic strings in `symbols.ts` today are close paraphrases of the
licensed transcripts, and they encode shape only — never class, which is the
larger burden. Every one is replaced by a structured record written from the
symbol's own properties.

**Write from the symbol, not from a transcript.** Take the glyph's shape, its
initial and final sounds, its class and its district, and build an image from
those. Do not open a transcript to check what an existing mnemonic said; the
existing strings are the thing being removed, not a starting point.

## Acceptance Criteria

- AC1: Every consonant and every vowel carries a mnemonic record. The counts
  are asserted (44 consonants, 29 vowels), so a shrinking source cannot pass by
  covering fewer symbols.
- AC2: Every record validates against the scene-grammar schema from task
  2.1: a district, a shape cue and a sound cue as separate fields, and a tone
  motion where the record carries a tone.
- AC3: Each consonant's declared district matches the class derived from its
  sound type. A record staging a mid-class letter in the low district fails.
- AC4: No eight-word sequence of any mnemonic occurs in the extracted
  transcript corpus. The check asserts it catches a planted overlap, so an empty
  or unreadable corpus cannot make it pass vacuously.
- AC5: Confusable pairs carry cues that contrast rather than coincide: the
  pairs the course already treats as confusable (ม/น, ช/ซ, พ/ฟ, ค/ด, บ/ป, ด/ต,
  ผ/พ, ฝ/ฟ, ถ/ก/ภ, ฎ/ฏ) each have mnemonics whose shape cues differ on the
  feature that actually distinguishes the glyphs.

## Test cases

- All 44 consonants and 29 vowels have records; the counts are exact.
- Every record validates; a record missing its sound cue fails, naming it.
- Every consonant's district equals its derived class district.
- No 8-gram overlap with the corpus; a planted overlap is detected.
- For each confusable pair, the two shape cues differ.
- A vowel record carries no district requirement and still validates.

## Architectural Decision

**Structured records, not prose strings.** The current `mnemonic?: string` can
hold anything and is checkable for nothing. Separate shape, sound and district
fields make AC2, AC3 and AC5 mechanical rather than matters of reviewer taste,
and let the renderer show the district cue without parsing English.

**Sized x-large deliberately.** 73 original mnemonics, each constrained by
district, shape and sound and cross-checked against confusable neighbours, is
the largest single authoring task in the plan. Splitting it by symbol class was
considered and rejected: the confusable pairs cross those boundaries — ข is
high and ช is low, ผ is high and พ is low — so a split would put both halves of
a contrast in different tasks that cannot see each other, which is exactly the
collaboration trap the plan format warns about.

**Depends on 2.2 as well as 2.1.** This task rewrites `nameRomanized` on every
symbol while 2.2 converts the vocabulary corpus, and both emit Paiboon. Run
concurrently they would each settle the spelling conventions independently and
the two halves of the app would disagree about how Thai is romanised — a
disagreement invisible to `tsc` and to both tasks' own tests. 2.2 owns the
convention because it has to handle every phoneme in the corpus; this task
consumes it.

*Rejected:* editing the existing strings to add class information. They are
derived from licensed material; the constraint in CONTEXT.md is that they are
rewritten, not extended.
