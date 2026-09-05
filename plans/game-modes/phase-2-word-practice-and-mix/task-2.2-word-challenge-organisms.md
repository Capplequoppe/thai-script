---
doc_type: reference
title: "Task 2.2 — Word challenge organisms"
description: WordDictationChallenge and WordProductionChallenge over the WordGameItem content task 2.1 fixed, matching phase 1's input-mode contract and reset discipline.
covers:
  - src/presentation/components/organisms/WordDictationChallenge.tsx
  - src/presentation/components/organisms/WordDictationChallenge.test.tsx
  - src/presentation/components/organisms/WordProductionChallenge.tsx
  - src/presentation/components/organisms/WordProductionChallenge.test.tsx
status: draft
task_id: "2.2"
task_status: complete
depends_on: ["2.1"]
size: medium
verify:
  - npm test -- src/presentation/components/organisms/WordDictationChallenge
  - npm test -- src/presentation/components/organisms/WordProductionChallenge
ac_enforcement:
  - "AC1 -> a render test (via renderWithApp from task 1.4) asserting audio autoplay on mount using the word item's own Thai audio URL, a canvas or paper-mode reveal button per the input-mode prop, and both the Thai spelling and English meaning shown after reveal"
  - "AC2 -> a render test asserting the English word is shown first with no Thai audio autoplay, a write-input per the input-mode prop, and the Thai spelling shown after reveal"
  - "AC3 -> a case rendering each organism with input-mode \"paper\" and asserting the DrawingCanvas is not rendered, and with \"draw\" asserting it is"
  - "AC4 -> a case with a word item whose audioUrl is absent (an item-level field, not a raw VocabEntry field), asserting no throw and no Audio constructed"
  - "AC5 -> a case asserting RatingButtons is absent before reveal and present after, in both organisms"
  - "AC6 -> a case asserting each organism resets revealed/canvas state when the current item changes, across two consecutive items of the same organism"
ac_tests:
  - "AC1 -> src/presentation/components/organisms/WordDictationChallenge.test.tsx::auto-plays the item's own audio on mount, offers a write-input, and reveals the spelling and meaning"
  - "AC2 -> src/presentation/components/organisms/WordProductionChallenge.test.tsx::shows the English word first with no audio autoplay, offers a write-input, and reveals the spelling"
  - "AC3 -> src/presentation/components/organisms/WordDictationChallenge.test.tsx::renders no canvas in paper mode"
  - "AC4 -> src/presentation/components/organisms/WordDictationChallenge.test.tsx::does not construct an Audio for an item with no audioUrl"
  - "AC5 -> src/presentation/components/organisms/WordDictationChallenge.test.tsx::shows RatingButtons only after reveal"
  - "AC6 -> src/presentation/components/organisms/WordProductionChallenge.test.tsx::resets revealed/canvas state when the current item changes"
red_proof:
  - "AC1 -> Removed the playAudio() call from WordDictationChallenge's item-change effect."
  - "AC2 -> Added a playAudio() call to WordProductionChallenge's item-change reset effect."
  - "AC3 -> Changed WordDictationChallenge's canvas-render condition from inputMode === \"draw\" to true."
  - "AC4 -> Removed the `if (!item.audioUrl) return;` guard from WordDictationChallenge's playAudio."
  - "AC5 -> Rendered RatingButtons unconditionally in WordDictationChallenge, ahead of the reveal branch."
  - "AC6 -> Changed WordProductionChallenge's reset useEffect dependency array from [item.thaiWord] to [] so it would not re-run on item change."
lint:
  before: 0
  after: 0
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 2.2 — Word challenge organisms

## Description

Two new organisms over the `WordItemContent` shape task 2.1 fixed. Read
`SymbolDictationChallenge`/`SymbolReadingChallenge` (task 1.4) first — the
audio-on-mount pattern, the draw/paper input-mode branching, the reveal step
into `RatingButtons`, and **the id-keyed reset effect** are all identical in
shape here; only the prompt/reveal content differs.

Revised after panel review found the original draft's AC4 named raw
`VocabEntry` field names (`thai_audio_file`/`english_audio_file`) that these
organisms never see — they consume the `WordItemContent` projection task 2.1
produces (an item-level `audioUrl`, English meaning, Thai spelling), not
`VocabEntry` directly. Fixed below.

- `WordDictationChallenge`: plays the item's Thai audio on mount; the person
  writes the Thai spelling and (mentally/on paper) the English translation;
  reveal shows the Thai spelling *and* the English meaning, plus a replay
  control.
- `WordProductionChallenge`: shows the English word as the prompt (no audio
  yet); the person writes the Thai spelling and says it aloud; reveal shows
  the Thai spelling and makes the Thai audio available.

Both take the same input-mode prop contract task 1.4's symbol organisms
already use. **Write-input is the drawing canvas or a plain paper-mode
button — never a focusable text field.** `RatingButtons` binds digits 1-5
globally on `window` with no focus guard (see CONTEXT.md); a text field
receiving a digit keystroke would silently fire a rating.

## Acceptance Criteria

- AC1: `WordDictationChallenge` auto-plays the item's own Thai audio on
  mount, presents the write-input per the input-mode prop, and reveals both
  the Thai spelling and the English meaning.
- AC2: `WordProductionChallenge` shows the English word first with no audio
  autoplay, presents the write-input per the input-mode prop, and reveals
  the Thai spelling.
- AC3: Both organisms render the drawing canvas only in draw mode, a plain
  reveal control in paper mode.
- AC4: A word item with no `audioUrl` does not crash either organism and
  does not attempt to construct an `Audio`.
- AC5: `RatingButtons` is absent before reveal, present after, in both
  organisms — matching the symbol organisms' established behavior.
- AC6: Both organisms reset their own revealed/canvas state when the current
  item changes, proven across two consecutive same-organism items.

## Architectural Decision

Two components, not one parameterized by direction — matches
`DrawingQuiz`/`SentenceBuilder`/task 1.4's two symbol organisms.

Write-input is constrained to canvas-or-paper, explicitly, because
`RatingButtons`' global digit-key handler makes a focusable text field a real
collision risk, not a theoretical one — this constraint is written down here
so it survives being copied into two more components.

## Test Cases

- Dictation: audio autoplay (item's own URL), write-input per mode, reveal
  shows spelling + translation.
- Production: English shown first, no premature audio, write-input per
  mode, reveal shows spelling.
- Draw mode vs. paper mode: canvas presence differs as expected.
- Item-level null audio: no crash, no `Audio` construction attempt.
- Reveal-then-rate ordering in both organisms.
- Two consecutive items of the same organism: no stale state carries over.
