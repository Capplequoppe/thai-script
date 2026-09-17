---
doc_type: reference
title: "Task 4.2 — The consolidated tone-mark lesson"
description: Teach the whole eight-cell tone-mark table in one lesson, with the pattern visible, replacing six fragmented lessons.
covers:
  - content/lessons/lesson-tone-marks.md
  - public/lessons/lesson-tone-marks/
  - src/domain/script/data/toneMarkLesson.test.ts
  - src/domain/script/data/symbols.ts
  - src/domain/script/data/lessonSequence.ts
  - src/domain/script/data/lessonContent.ts
status: stable
task_id: "4.2"
task_status: complete
depends_on: ["4.1"]
size: medium
verify:
  - npm test -- src/domain/script
  - npm run build
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/toneMarkLesson.test.ts asserting the lesson resolves to the deck arm"
  - "AC2 -> a case in src/domain/script/data/toneMarkLesson.test.ts asserting all twelve combinations appear in the lesson content"
  - "AC3 -> a case in src/domain/script/data/toneMarkLesson.test.ts resolving tones from the lesson's stated table alone"
  - "AC4 -> a case in src/domain/script/data/toneMarkLesson.test.ts resolving each example word against vocabulary.json"
  - "AC5 -> a case in src/domain/script/data/toneMarkLesson.test.ts asserting no 8-gram overlap with the transcript corpus"
  - "AC6 -> a case in src/domain/script/data/toneMarkLesson.test.ts asserting every referenced asset exists"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 3"
  - "calibration-estimator -> 5"
weight_voted: "sha256:72c0616dcfdb003d388bd33e2efe1af2b15b6921cd9ecf7d38234f4141b5828c"
ac_tests:
  - "AC1 -> src/domain/script/data/toneMarkLesson.test.ts::AC1 — the lesson resolves to the deck arm at its declared position > is declared, decked, and comes after every spelling-based tone rule"
  - "AC2 -> src/domain/script/data/toneMarkLesson.test.ts::AC2 — all twelve class-by-mark combinations appear > states every resolved cell that toneMarkTable.ts declares resolved"
  - "AC3 -> src/domain/script/data/toneMarkLesson.test.ts::AC3 — the lesson's stated table resolves real corpus words > reproduces the tone of one word per resolved cell"
  - "AC4 -> src/domain/script/data/toneMarkLesson.test.ts::AC4 — every Thai example word is a real, rank-windowed corpus word > resolves every word the deck shows against vocabulary.json"
  - "AC5 -> src/domain/script/data/toneMarkLesson.test.ts::AC5 — the lesson reuses no phrasing from the source transcripts > clears the shared originality check on every line of the deck"
  - "AC6 -> src/domain/script/data/toneMarkLesson.test.ts::AC6 — every asset the deck references exists > references only files inside the lesson's own directory, and leaves none unreferenced"
red_proof:
  - "AC1 -> Removed \"lesson-tone-marks\" from DECK_LESSON_IDS in lessonContent.ts."
  - "AC2 -> Deleted the mai-tri line from the mid-class-marks slide body in the committed deck.json."
  - "AC3 -> Edited deck.json's low-class-marks slide so the mai-ek line claims \"gives low tone\" instead of \"gives falling tone\"."
  - "AC4 -> Appended an extra example line naming กระเป๋าถือ (a real vocabulary.json entry whose rank is null) to the one-table slide's body."
  - "AC5 -> Review-pass correction: the previously filed proof was the passing canary test, not an observed failure. Re-did it for real — planted \"Think of a coffee mug with a broken handle...\"… [see red-proofs/]"
  - "AC6 -> Set slides[0].image in deck.json to \"/thai-script/lessons/lesson-tone-marks/missing.png\", a path with no file on disk."
lint:
  before: 11
  after: 11
  outcome: unsupported
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 4.2 — The tone-mark lesson

One lesson for the whole table. The point is not compression for its own sake:
delivered across six lessons the learner never sees that mid class takes all
four marks in order, that the other two classes take only two, and that low
class is the exception. Those three observations are what make eight cells
memorable instead of eight facts.

Use the district encoding from phase 2 — the table is organised by class, and
class already has a visual identity by this point in the course.

## Acceptance Criteria

- AC1: The lesson resolves to the deck arm and sits at its declared
  sequence position, after every spelling-based tone rule has been taught.
- AC2: All twelve class-by-mark combinations appear in the lesson's content,
  including the four declared unreachable. A lesson that silently omits the
  unreachable four fails: their absence is a fact to teach, not a gap.
- AC3: Tones resolve from the table **as the lesson states it**. Applying
  the lesson's own content to a set of marked corpus words reproduces each word's
  tone; a word needing knowledge the lesson does not present fails.
- AC4: Every Thai example word resolves to a `vocabulary.json` entry inside
  the declared rank window, or is declared in `teachingWords` with a reason.
- AC5: No eight-word sequence of the lesson's narration occurs in the
  extracted transcript corpus; the check asserts it detects a planted overlap.
- AC6: Every asset the deck references exists at its declared path.

## Test cases

- The lesson resolves to the deck arm at its declared position, and every
  spelling tone rule precedes it in the sequence.
- All twelve combinations are present, the four unreachable ones marked as such.
- Applying the lesson's stated table to marked corpus words reproduces their
  tones.
- Removing one row from the lesson's stated content makes AC3's test fail,
  proving it reads the lesson rather than `toneMarkTable.ts`.
- Every example word resolves or is declared with a reason.
- No 8-gram overlap; a planted overlap is caught.
- Every asset exists.

## Architectural Decision

**One lesson, not six.** The source's fragmentation is defensible for a video
course with no scheduler — it spaces the material out. This app has an SRS that
handles spacing, so the only thing fragmentation costs here is the pattern. The
scheduler gives back what the consolidation gives up.

*Rejected:* teaching only the eight reachable cells. The four that cannot occur
halve the apparent size of the table, and a learner who does not know they are
impossible will look for them.
