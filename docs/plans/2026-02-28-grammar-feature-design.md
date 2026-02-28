# Grammar Feature Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Add grammar as a third learning pillar alongside Script and Vocabulary. Grammar lessons introduce Thai grammar patterns (SVO, questions, negation, tense markers, etc.) and are gated by vocabulary mastery — the user must have graduated enough words of the right word classes before a grammar point unlocks.

## Architecture

Mirrors the vocabulary architecture:
- `grammar.json` data file with 15 hand-curated grammar points
- `GrammarService` with vocab-mastery-based unlocking
- `GrammarCard` type extending `SrsCard` (recognition + application)
- Own `"grammar"` card pool in `ReviewService`
- Dedicated `GrammarPage` with 5-phase flow

## Data Model

### GrammarEntry (grammar.json schema)

```typescript
interface GrammarEntry {
  id: string;                        // e.g., "svo-basic", "classifier"
  title: string;                     // e.g., "Basic Sentence Structure (SVO)"
  explanation: string;               // Plain text explanation
  pattern: string;                   // e.g., "[Subject] [Verb] [Object]"
  lessonNumber: number;              // Sequential ordering

  prerequisites: {
    minVocabByClass: Record<string, number>;  // e.g., { "n": 3, "v": 2 }
    minTotalVocab?: number;
  };

  examples: Array<{
    thai: string;
    romanization: string;
    english: string;
    breakdown?: string;              // Word-by-word analysis
  }>;

  cards: {
    recognition: {
      question: string;
      correctAnswer: string;
      distractors: string[];         // 3 wrong answers
    };
    application: {
      question: string;
      correctExample: number;        // Index into examples array
      incorrectExamples: string[];   // 3 wrong sentences
    };
  };
}
```

### GrammarCard

```typescript
interface GrammarCard extends SrsCard {
  grammarId: string;
  property: "recognition" | "application";
}
```

Two cards per grammar point:
- **Recognition**: "What does this pattern express?" (pattern to explanation)
- **Application**: "Which sentence correctly uses [pattern]?" (apply in context)

### Storage

Add `grammarCards: Record<string, GrammarCard>` to `LearnerState`.
Extend `CardPool` to `"script" | "vocab" | "grammar"`.
Add `"grammar-lesson"` and `"grammar-review"` to `SessionSummary.type`.

## Service Layer

### GrammarService

```typescript
class GrammarService {
  constructor(storage, grammarData, apprenticeService?) {}

  getUnlockedGrammarPoints(): GrammarEntry[]    // Meets vocab prerequisites
  getUnlearnedGrammarPoints(): GrammarEntry[]   // Unlocked, no cards yet
  getNextLesson(): GrammarLessonSummary | null   // Next batch (up to 3)
  startLesson(): GrammarCard[] | null            // Generate cards, save
  getUnlockedCount(): number
  getLearnedCount(): number
}
```

**Unlocking logic:**
1. Count distinct graduated vocab words per `word_class`
2. For each grammar entry (sorted by lessonNumber), check:
   - All `prerequisites.minVocabByClass` thresholds met
   - `minTotalVocab` met (if specified)
   - All lower-numbered grammar lessons already have cards (sequential gating)

**Batch size:** 3 grammar points per lesson (denser than vocab).

**Vocab mastery counting:** A vocab word counts as "mastered" when its cards are graduated (`learningStep === null`). Count distinct words by `wordThai`, grouped by `word_class` from the original `VocabEntry`.

### Integration with existing services

- **ReviewService**: Add `"grammar"` branch in `getCardRecord()` returning `state.grammarCards`
- **ApprenticeService**: Count grammar cards in `getApprenticeCount()` and stats
- **LeechService**: Add grammar branch in pool selection

## UI Layer

### GrammarPage (`/grammar`)

5-phase flow mirroring VocabularyPage:
1. **Overview** — Stats (unlocked, learned, due), action buttons
2. **Intro** — Pattern, explanation, example sentences with breakdown
3. **Quiz** — Multiple choice for recognition + application cards
4. **Complete** — Accuracy summary
5. **Review** — Due grammar cards (flashcard for graduated, MC for learning)

### Dashboard

Add grammar section following vocabulary section pattern:
- Unlocked / Learned / Due counts
- "Go to Grammar" button
- Only visible when user has >= 1 unlocked grammar point

### ProgressPage

Add grammar stage counts using `getStageCounts("grammar")`.

### Navigation

Add "Grammar" nav item, visible once grammar is unlocked.

## Grammar Content (15 points)

| # | Grammar Point | Prerequisites |
|---|---|---|
| 1 | Basic SVO | n: 2, v: 2 |
| 2 | Yes/No Questions (ไหม) | n: 3, v: 2 |
| 3 | Negation (ไม่) | n: 3, v: 3 |
| 4 | Adjectives as Predicates | n: 4, adj: 2 |
| 5 | Possession (ของ) | n: 5 |
| 6 | Classifiers | n: 8 |
| 7 | Location (ที่/อยู่) | n: 8, v: 3 |
| 8 | Want/Need (อยาก/ต้องการ) | v: 5 |
| 9 | Past (แล้ว) | v: 5, n: 8 |
| 10 | Future (จะ) | v: 6, n: 8 |
| 11 | Progressive (กำลัง) | v: 7 |
| 12 | Comparatives (กว่า) | adj: 4, n: 10 |
| 13 | Because/So (เพราะ/เลย) | v: 8, n: 10 |
| 14 | Can/Able (ได้/เป็น) | v: 8 |
| 15 | Polite Particles (ครับ/ค่ะ) | n: 5, v: 3 |

## File Change Summary

### New files
- `src/grammar-types.ts` — GrammarEntry, GrammarCard, GrammarLessonSummary
- `src/grammar.json` — 15 grammar points with examples and card templates
- `src/grammar-service.ts` — Unlocking, progression, card generation
- `src/grammar-service.test.ts` — Service tests
- `src/grammar-card-generator.ts` — generateGrammarCards() factory
- `src/grammar-card-generator.test.ts` — Card generation tests
- `src/pages/GrammarPage.tsx` — 5-phase grammar page

### Modified files
- `src/types.ts` — Add grammarCards to LearnerState
- `src/review-service.ts` — Add "grammar" branch in getCardRecord()
- `src/review-service.test.ts` — Grammar pool tests
- `src/apprentice-service.ts` — Count grammar cards
- `src/apprentice-service.test.ts` — Grammar counting tests
- `src/leech-service.ts` — Grammar branch in pool selection
- `src/storage.ts` — Handle missing grammarCards in load()
- `src/context/AppContext.tsx` — Wire GrammarService, expose operations
- `src/pages/Dashboard.tsx` — Grammar stats section
- `src/pages/ProgressPage.tsx` — Grammar stage counts
- `src/App.tsx` — /grammar route
- `src/interfaces.ts` — IGrammarService
- `src/validation.ts` — Validate grammarCards

### Unchanged
- `src/srs.ts` — Pool-agnostic, works as-is
- `src/vocabulary-service.ts` — No grammar dependency
- `src/learning-service.ts` — No grammar dependency

## Phasing

**Phase 1:** Types, data, service layer, tests
**Phase 2:** UI layer (GrammarPage, Dashboard/ProgressPage, routing, AppContext)

## Verification (per phase)
1. `npx tsc --noEmit` — no type errors
2. `npx vitest run` — all tests pass
3. `npx biome check src/` — lint clean
