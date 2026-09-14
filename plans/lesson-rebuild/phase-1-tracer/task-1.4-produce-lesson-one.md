---
doc_type: reference
title: "Task 1.4 — Author, generate and serve Lesson 1"
description: Write Lesson 1's script from the symbols' own properties, generate its deck and assets, point the lesson at the deck arm, and prove the learner's schedule is unchanged.
covers:
  - content/lessons/lesson-01.md
  - public/lessons/lesson-01/
  - src/domain/script/data/symbols.ts
  - src/domain/script/data/lesson01Deck.test.ts
status: stable
task_id: "1.4"
task_status: complete
depends_on: ["1.1b", "1.2", "1.3", "1.5"]
size: medium
verify:
  - npm test -- src/domain/script
  - npm run build
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/lesson01Deck.test.ts asserting lesson 1 resolves to the deck arm"
  - "AC2 -> a case in src/domain/script/data/lesson01Deck.test.ts cross-checking the deck's symbols against the lesson's declared set"
  - "AC3 -> a case in src/domain/script/data/lesson01Deck.test.ts resolving each example word against vocabulary.json"
  - "AC4 -> a case in src/domain/script/data/lesson01Deck.test.ts comparing scheduled cards and unlocked words either side of completion"
  - "AC5 -> the shared check from task 1.5, invoked over this deck's narration"
  - "AC6 -> a case in src/domain/script/data/lesson01Deck.test.ts asserting every referenced asset exists on disk"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 5"
weight_voted: "sha256:4556298850ae31929a8eaf3edc5abe26b76c4150f69fe93a37c0d2084dd059f9"
ac_tests:
  - "AC1 -> src/domain/script/data/lesson01Deck.test.ts::produces identical scheduled cards and unlocked vocabulary whether lesson 1 is on the video arm or the deck arm"
  - "AC2 -> src/domain/script/data/lesson01Deck.test.ts::teaches exactly the symbols lesson 1 declares — no more, no fewer"
  - "AC3 -> src/domain/script/data/lesson01Deck.test.ts::every Thai example word resolves to a vocabulary.json entry (or is declared in teachingWords with a reason)"
  - "AC4 -> src/domain/script/data/lesson01Deck.test.ts::produces identical scheduled cards and unlocked vocabulary whether lesson 1 is on the video arm or the deck arm"
  - "AC5 -> src/domain/script/data/lesson01Deck.test.ts::clears every piece of narration and mnemonic prose in the deck"
  - "AC6 -> src/domain/script/data/lesson01Deck.test.ts::every asset the deck references exists on disk, inside the lesson's own directory"
red_proof:
  - "AC2 -> Appended a stray Thai run (' ตัว', containing ต/ว/ั — none declared by lesson 1) to public/lessons/lesson-01/deck.json's first heading, then reran the single test."
  - "AC3 -> Replaced a reveal slide's answer with the nonsense word 'มามามา' (confirmed absent from vocabulary.json), then reran the single test."
  - "AC5 -> Appended the exact retired mug mnemonic ('Think of a coffee mug with a broken handle...') into a deck heading, then reran the single test."
  - "AC6 -> Added a phantom audio path ('/lessons/lesson-01/audio/phantom.mp3', not on disk) to a slide in deck.json, then reran the single test."
  - "AC1 -> In the scheduling test, changed `expect(deckArmState).toEqual(videoArmState)` to compare against a copy with `unlockedWords: [\"mutated-for-red-proof\"]`, then reran the single test."
  - "AC4 -> Same mutation and observation as AC1 (one assertion proves both: it compares the video-arm and deck-arm scheduling/vocabulary results for equality)."
lint:
  before: 5
  after: 5
  outcome: unsupported
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 1.4 — Lesson 1, end to end

The phase's proof. Lesson 1 teaches ม, น and สระ อา and builds three words
from them — the sequencing that already works and is being kept. What changes
is everything underneath: the mnemonics, the narration, the illustrations, and
where the example words come from.

## Acceptance Criteria

- AC1: Lesson 1 resolves to the deck arm of `LessonContent`. Opening
  `/lesson/1` renders in-house slides and no video element. Lessons 2–25 still
  resolve to the video arm and are untouched.
- AC2: The deck introduces exactly the symbols Lesson 1 declares, and uses
  no symbol the course has not yet taught. A symbol appearing in an example
  before its own lesson fails this.
- AC3: Every Thai example word in the deck resolves to a `vocabulary.json`
  entry, or is listed in the deck's own `teachingWords` field with a stated
  reason. The list is not a loophole to be used silently: a word in neither place
  fails.
- AC4: A learner completing Lesson 1 through the deck ends with the same
  scheduled script cards and the same unlocked vocabulary as a learner who
  completed it before this plan. This is the phase's end-to-end criterion: it
  fails if identity, migration, renderer, pipeline or content is wrong.
- AC5: Deck narration and mnemonics clear the shared originality check from
  task 1.5, which owns the corpus, the n width, the canary and the size floor.
  Write each mnemonic from the symbol's own shape, sound and class; do not open
  a transcript to check one.
- AC6: Every asset the deck references exists on disk and is reachable at
  the path the deck declares.

## Test cases

- Lesson 1 resolves to the deck arm; lesson 2 resolves to the video arm.
- The deck's symbol set equals Lesson 1's declared set exactly — assert both
  directions, so a deck that teaches a symbol the lesson does not declare fails
  as well as one that omits a declared symbol.
- Each example word is found in `vocabulary.json` or in `teachingWords` with a
  non-empty reason.
- Completing Lesson 1 through the deck and through a simulated video
  completion produce identical scheduled-card and unlocked-word sets.
- No 8-gram overlap between deck narration and the transcript corpus. Assert
  the check itself catches a planted overlap, so a silently empty corpus cannot
  make it pass vacuously.
- Every asset path in the deck exists.

## Architectural Decision

**Originality checked by n-gram overlap rather than by reviewer judgement.**
The constraint in CONTEXT.md is a hard one and prose alone does not enforce it.
An 8-gram overlap check is cheap, runs in the same runner as everything else,
and turns a standing instruction into a gate. It is a floor and not a proof:
it catches copied phrasing, not a mnemonic reproduced in fresh words. That
second case is the reviewer's, and the criterion says so rather than implying
the check covers it.

*Rejected:* seeding the deck with the transcripts' example words because they
demonstrate the letters well. The words are part of what is being replaced —
the app ranks 5,454 words by frequency and the source picks by convenience.

**`teachingWords` as a declared escape hatch rather than an implicit
allowance.** Some words genuinely must appear before they are frequency-ranked
— a letter's own acrophonic name, for one. Declaring them with a reason keeps
that visible and countable instead of letting any unmatched word pass.
