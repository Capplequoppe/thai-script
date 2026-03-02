# Glossed Grammar Application Cards

**Date:** 2026-03-02
**Status:** Approved

## Problem

Grammar application cards present Thai-only choices (e.g., `เขากินข้าว`, `ข้าวกินเขา`) that are unreadable for learners who haven't mastered the vocabulary yet. The grammar lesson is meant to teach word order patterns, but learners can't evaluate the choices without knowing the words.

## Decision

Use inline word-by-word glosses so learners see both Thai script and English meaning together. Each choice displays as:

```
เขา(he) กิน(eat) ข้าว(rice)
```

This bridges Thai script recognition with structural understanding of grammar patterns.

## Approach: Structured Words Array

Store a `words` array (list of `{ thai, gloss }` objects) on:
- Each grammar example that serves as a correct answer
- Each incorrect example in application card data

The card generator formats these into display strings at card creation time.

## Data Model

### New Types

```typescript
interface GlossedWord {
  thai: string;
  gloss: string;
}

interface GlossedPhrase {
  words: GlossedWord[];
}
```

### Updated Grammar Entry Shape

```json
{
  "examples": [
    {
      "thai": "เขากินข้าว",
      "romanization": "khao gin khao",
      "english": "He eats rice.",
      "breakdown": "เขา (he) + กิน (eat) + ข้าว (rice)",
      "words": [
        { "thai": "เขา", "gloss": "he" },
        { "thai": "กิน", "gloss": "eat" },
        { "thai": "ข้าว", "gloss": "rice" }
      ]
    }
  ],
  "cards": {
    "application": {
      "question": "Which sentence correctly uses the SVO pattern?",
      "correctExample": 0,
      "incorrectExamples": [
        { "words": [{ "thai": "ข้าว", "gloss": "rice" }, { "thai": "กิน", "gloss": "eat" }, { "thai": "เขา", "gloss": "he" }] },
        { "words": [{ "thai": "กิน", "gloss": "eat" }, { "thai": "เขา", "gloss": "he" }, { "thai": "ข้าว", "gloss": "rice" }] },
        { "words": [{ "thai": "ข้าว", "gloss": "rice" }, { "thai": "เขา", "gloss": "he" }, { "thai": "กิน", "gloss": "eat" }] }
      ]
    }
  }
}
```

## Card Generator

Formats glossed words into a display string:

```typescript
const formatGlossed = (words: GlossedWord[]) =>
  words.map(w => `${w.thai}(${w.gloss})`).join(" ");
```

The `correctAnswer` and `choices` fields on the generated `GrammarCard` use these formatted strings.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/grammar/types.ts` | Add `GlossedWord`, `GlossedPhrase`; update `incorrectExamples` type; add `words?` to examples |
| `src/domain/grammar/data/grammar.json` | Add `words` arrays to all 15 entries (correct examples + incorrect examples) |
| `src/domain/grammar/services/GrammarCardGenerator.ts` | Format glossed words for application card choices |
| `src/domain/grammar/services/GrammarCardGenerator.test.ts` | Update fixtures and assertions |

## Not Changed

- No UI changes — `MultipleChoice` renders `string[]` choices and the glossed format is just a string.
- Recognition cards remain unchanged (they already use English text).
