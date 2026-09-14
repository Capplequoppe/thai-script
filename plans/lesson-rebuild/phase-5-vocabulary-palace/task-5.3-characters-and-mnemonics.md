---
doc_type: reference
title: "Task 5.3 — Pom and Chan, and vocabulary mnemonics staged in rooms"
description: Introduce two recurring characters sharing the mnemonic universe, and stage vocabulary mnemonics in their rooms with the room exposed correctly per review direction.
covers:
  - src/domain/vocabulary/data/characters.ts
  - src/domain/vocabulary/data/characters.test.ts
  - src/domain/vocabulary/services/VocabMnemonic.ts
  - src/domain/vocabulary/services/VocabMnemonic.test.ts
  - src/presentation/components/organisms/WordCard.tsx
  - src/presentation/components/organisms/WordCard.test.tsx
  - src/presentation/components/organisms/Flashcard.tsx
  - src/presentation/components/organisms/Flashcard.test.tsx
status: stable
task_id: "5.3"
task_status: pending
depends_on: ["5.1", "5.2"]
size: large
verify:
  - npm run build
  - npm test -- src/domain/vocabulary
  - npm test -- src/presentation/components/organisms
  - npx biome check src/domain/vocabulary/data src/domain/vocabulary/services src/presentation/components/organisms
ac_enforcement:
  - "AC1 -> a case in src/domain/vocabulary/data/characters.test.ts asserting each character declares a fixed register"
  - "AC2 -> a case in src/domain/vocabulary/services/VocabMnemonic.test.ts validating each mnemonic against its word's room"
  - "AC3 -> a case in src/domain/vocabulary/services/VocabMnemonic.test.ts asserting scene-grammar conformance"
  - "AC4 -> six cases in src/presentation/components/organisms/Flashcard.test.tsx, one per VocabProperty"
  - "AC5 -> the shared originality check from task 1.5, invoked over every vocabulary mnemonic"
  - "AC7 -> a case in src/domain/vocabulary/services/VocabMnemonic.test.ts asserting the declared coverage floor is met"
  - "AC6 -> three cases in src/domain/vocabulary/services/VocabMnemonic.test.ts, one per state"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 8"
  - "calibration-estimator -> 8"
weight_voted: "sha256:eaf38ea1e78cae3b4bde175b94d83c6b0df6e9a799087adb213fc74ea63b6651"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 5.3 — Characters and vocabulary mnemonics

Two recurring characters, Pom and Chan, named for the gendered first-person
pronouns. They teach that split by exposure, and they give every mnemonic a
consistent cast so images compose instead of competing.

Both ผ (in ผม) and ฉ (in ฉัน) are high class. The characters are **not** natives
of the high district: they move between rooms, because a character fixed to one
district stops being usable in the other two and the class signal would compete
with the room signal wherever they appear.

**Write mnemonics from the word's own properties** — its sound, its room, its
characters — never from the licensed transcripts. The same constraint and the
same check as every content task in this plan.

## Acceptance Criteria

- AC1: Each character declares a fixed politeness register, and every
  mnemonic using that character is consistent with it. The register is a stated
  decision, not an accident of whichever form a mnemonic reached for.
- AC2: Every vocabulary mnemonic is staged in the room its word belongs to.
  A mnemonic whose scene contradicts its word's room fails.
- AC3: Every vocabulary mnemonic validates against the scene-grammar schema
  from task 2.1: it declares its room, its characters where present, and binds
  sound to image rather than describing the word's meaning alone.
- AC4: In the production direction the room is shown as a cue before reveal.
  In the recognition direction it is shown only after reveal, as part of the
  answer. Showing it as a pre-reveal cue in recognition fails — the learner does
  not know the part of speech yet, and showing it gives away the answer's shape.
- AC5: Every vocabulary mnemonic clears the shared originality check from task
  1.5 — including the **277 that already ship**, which were written before the
  constraint existed and have never been checked.
- AC7: The task declares a **coverage floor** — an explicit count of words that
  must carry a mnemonic, and the rank range they are drawn from — and meets it.
  Three reviewers independently found that without one, "has none yet" is a
  valid terminal state for all 5,454 words and every other criterion here is
  satisfiable by doing almost nothing. The floor is stated as a number, as task
  2.4 does for its 73 symbols.
- AC6: A word is in exactly one of three states with respect to mnemonics:
  has one, has none yet, or was found unsuitable for one with a reason recorded.
  Unsuitable never reads as missing.

## Test cases

- Each character's declared register is consistent across every mnemonic using
  them.
- Each mnemonic's staged room equals its word's assigned room.
- A mnemonic missing its sound binding fails validation, naming the field.
- For each of the six properties, the room is absent before the learner acts
  and present after reveal; reveal state is read from `Flashcard`.
- The declared coverage floor is met, and a run one word short fails.
- No 8-gram overlap; a planted overlap is caught.
- The three per-word mnemonic states are three distinct values.
- A word whose room changes (because 5.2's provenance was revised) surfaces its
  mnemonic as needing restaging rather than silently mismatching.

## Architectural Decision

**Register declared per character rather than chosen per mnemonic.** ฉัน is
informal and ดิฉัน formal; a learner meeting Chan constantly adopts whichever
form the mnemonics happen to use. Declaring it once makes the choice
deliberate and checkable.

**Room shown asymmetrically by direction.** The palace prunes in production and
cannot in recognition, and building the UI as though it prunes in both would
leak the answer. The asymmetry is the honest implementation of the device's
actual reach, and AC4 exists because the symmetric version is the tempting one.
