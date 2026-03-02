# Dynamic Grammar Application Cards

**Date:** 2026-03-02
**Status:** Approved

## Problem

Grammar application cards use hardcoded Thai phrases (e.g., เขากินข้าว) that contain characters the learner hasn't been taught yet. A learner at script lesson 7 encounters ไหม in grammar lesson 2 — characters they've never seen.

## Decision

Generate grammar application cards dynamically using the learner's mastered vocabulary. The grammar pattern defines word-class slots; the card generator fills them with known words at card creation time. Function words introduced by each grammar pattern (ไหม, ไม่, ของ, etc.) must also be mastered vocabulary.

## Gating Chain

```
Script lessons → mastered characters → unlocked vocabulary → mastered vocab → grammar unlocked
```

Grammar gates transitively through vocabulary. No direct script check needed in grammar — vocabulary already handles that.

## Application Template

Each grammar entry defines an `applicationTemplate`:

```typescript
interface ApplicationTemplate {
  slots: Array<{
    role: string;                   // semantic name: "subject", "verb", "object"
    wordClass: string;              // primary: "pron", "v", "n", "adj"
    fallbackWordClasses?: string[]; // alternatives if primary has too few
  }>;
  functionWords: Array<{
    thai: string;                   // the function word: "ไหม", "ไม่", "ของ"
    gloss: string;                  // English gloss: "?", "not", "of"
    position: "start" | "end" | "before-verb" | "after-verb";
  }>;
  distractorPatterns: string[][];   // reorderings of roles for wrong answers
}
```

### Example: SVO Basic

```json
{
  "applicationTemplate": {
    "slots": [
      { "role": "subject", "wordClass": "pron", "fallbackWordClasses": ["n"] },
      { "role": "verb", "wordClass": "v" },
      { "role": "object", "wordClass": "n" }
    ],
    "functionWords": [],
    "distractorPatterns": [
      ["object", "verb", "subject"],
      ["verb", "subject", "object"],
      ["object", "subject", "verb"]
    ]
  }
}
```

### Example: Question ไหม

```json
{
  "applicationTemplate": {
    "slots": [
      { "role": "subject", "wordClass": "pron", "fallbackWordClasses": ["n"] },
      { "role": "verb", "wordClass": "v" },
      { "role": "object", "wordClass": "n" }
    ],
    "functionWords": [
      { "thai": "ไหม", "gloss": "?", "position": "end" }
    ],
    "distractorPatterns": [
      ["subject", "verb", "object"],
      ["subject", "verb", "object"],
      ["subject", "verb", "object"]
    ]
  }
}
```

For `question-mai`, the correct answer has ไหม at the end. Distractors have the same slot order but move ไหม to wrong positions (beginning, middle). The distractor generation logic handles function word misplacement.

## Card Generation Flow

1. Get mastered vocabulary (graduated vocab cards → VocabEntry objects)
2. For each slot, pick a random mastered word of the required word class
3. Correct answer: slot words + function words in template order, glossed
4. Distractors: reorder slots per distractorPatterns, misplace function words
5. Format all as glossed strings: `คน(person) มา(come) งาน(work)`

## Prerequisites Change

`meetsPrerequisites` gains an additional check: all `functionWords` in the template must exist in the learner's mastered vocabulary. This naturally gates grammar patterns behind both vocab AND script progress.

The existing `minVocabByClass` ensures enough words exist to fill slots.

## Files Changed

| File | Change |
|------|--------|
| `types.ts` | Add `ApplicationTemplate`, add `applicationTemplate` to `GrammarEntry` |
| `grammar.json` | Add `applicationTemplate` to all 15 entries |
| `GrammarCardGenerator.ts` | Dynamic application card from template + mastered vocab |
| `GrammarCardGenerator.test.ts` | Update tests for dynamic generation |
| `GrammarLessonService.ts` | Pass mastered vocab to generator, check function word prereqs |
| `GrammarLessonService.test.ts` | Update tests |

## Not Changed

- Recognition card (English-only, unchanged)
- Sentence domain (separate concern)
- Script/vocab services (grammar uses vocab transitively)
- UI (glossed strings are already rendered as `string[]`)
- Existing `examples` array (stays for lesson intro/explanation)
