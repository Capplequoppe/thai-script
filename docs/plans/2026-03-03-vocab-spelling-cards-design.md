# Vocabulary Spelling Cards Design

## Problem

Many Thai consonants share the same sound (e.g. ท/ธ/ฑ/ฒ all produce "th"). Learners need to practice the exact spelling of words by heart, not just recognition.

## Solution

Add two new vocabulary card types that use character-tapping (reusing the existing `SentenceBuilder` component) to quiz spelling:

- **`spelling`** — English meaning as prompt, user taps Thai characters to spell the word
- **`spellingFromAudio`** — Audio as prompt (only for words with `thai_audio_file`), user taps characters to spell what they hear

## Card Specification

### `spelling`

| Field | Value |
|---|---|
| id | `vocab:{thai}:spelling` |
| question | `Spell the Thai word for "{english}"` |
| correctAnswer | Thai word (spaces stripped) |
| choices | Word characters + phonetically confusable distractors, shuffled |
| wordThai | Thai word |
| property | `"spelling"` |

### `spellingFromAudio`

| Field | Value |
|---|---|
| id | `vocab:{thai}:spellingFromAudio` |
| question | `Listen and spell the word` |
| correctAnswer | Thai word (spaces stripped) |
| choices | Word characters + phonetically confusable distractors, shuffled |
| wordThai | Thai word |
| property | `"spellingFromAudio"` |
| audioUrl | `thai_audio_file` |

## Distractor Generation

For each word, generate confusable distractors by:

1. Split the Thai word into individual Unicode code points
2. For each consonant, find other consonants with the same `initialSound` from the `consonants` data (normalized, stripping parentheticals). Include 1-2 confusables per consonant
3. Pad with 2-3 random Thai characters (consonants/vowels/tone marks) not already in the set
4. Return all word characters + distractors, shuffled

Example for ที่ (thîː):
- Word characters: [ท, ี, ่]
- ท (initialSound: "th") → confusables: ธ, ฑ, ฒ
- Pad: ก, า, ้
- Final grid (shuffled): [ธ, ่, ก, ท, ฑ, า, ี, ้, ฒ]

## Timing

Spelling cards are generated as part of the initial lesson alongside the existing 4 card types. No deferred introduction.

## Changes

| File | Change |
|---|---|
| `src/domain/vocabulary/types.ts` | Add `"spelling" \| "spellingFromAudio"` to `VocabProperty` |
| `src/domain/vocabulary/services/VocabCardGenerator.ts` | Add spelling card generation + `generateSpellingDistractors()` |
| `src/presentation/pages/VocabularyPage.tsx` | Route spelling properties to `SentenceBuilder` |
| `src/presentation/pages/ReviewPage.tsx` | Route spelling properties to `SentenceBuilder` in review mode |

No new entities, domain services, or UI components required.
