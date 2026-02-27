# Design: Vocabulary Feature with Frequency-Based Unlocking

## Context

The app teaches Thai script (consonants, vowels, tone marks) through lessons and SRS reviews. A vocabulary.json file contains 5,435 Thai words sorted by frequency. As users master Thai characters and tone rules, they unlock words composed entirely of mastered elements. Unlocked words are learned in frequency-ranked order through lesson-style batches, with separate SRS reviews.

## Data Model

### Enriched Vocabulary Entry

Each entry in `vocabulary.json` is enriched offline via a Python script using PyThaiNLP:

```json
{
  "thai": "ที่",
  "romanization": "tʰîː",
  "word_class": "",
  "english": "at",
  "rank": 1,
  "frequency": 773568,
  "mnemonic": null,
  "characters": ["ท", "ี", "่"],
  "syllables": [
    {
      "text": "ที่",
      "initialConsonant": "ท",
      "vowel": "ี",
      "finalConsonant": null,
      "toneMark": "่",
      "consonantClass": "low",
      "syllableType": "live",
      "tone": "falling"
    }
  ],
  "toneRules": ["low-live-mayek"],
  "samples": [...],
  "thai_audio_file": null,
  "english_audio_file": null,
  "image_file": null,
  "source": "frequency_csv"
}
```

- **characters**: Flat array of unique Thai codepoints (individual Unicode characters)
- **syllables**: Full syllable breakdown from PyThaiNLP
- **toneRules**: Deduplicated tone rule IDs matching symbol.ts format
- **mnemonic**: Nullable, filled manually over time

### Tone Rule ID Format

- Without tone mark: `"{class}-{syllableType}"` or `"{class}-{syllableType}-{vowelLength}"` for dead syllables
- With tone mark: `"{class}-{toneMarkName}"`
- Examples: `"mid-live"`, `"low-dead-short"`, `"low-mayek"`, `"mid-maytho"`

## SRS Refactoring

### Generic SrsCard Base

```typescript
interface SrsCard {
  id: string;
  question: string;
  correctAnswer: string;
  choices: string[];
  srs: SrsData;
  audioUrl?: string;
}

interface PropertyCard extends SrsCard {
  symbolCharacter: string;
  property: PropertyType | "toneRule";
  lessonNumber: number;
}

interface VocabularyCard extends SrsCard {
  wordThai: string;
  property: VocabProperty;
  vocabLessonNumber: number;
}
```

`VocabProperty = "thaiToEnglish" | "englishToThai" | "audioRecognition"`

### Storage

```typescript
interface LearnerState {
  completedLessons: number[];
  currentLesson: number | null;
  cards: Record<string, PropertyCard>;
  vocabCards: Record<string, VocabularyCard>;
  sessionHistory: SessionSummary[];
}
```

No `vocabCompletedLessons` — learned words are tracked by presence in `vocabCards`.

### ReviewService Generalization

ReviewService is parameterized by card pool. `getDueCards()`, `recordReview()`, `startReviewSession()` all accept a card pool selector (script vs vocab) to keep reviews separate.

`SessionSummary.type` extended to: `"lesson" | "review" | "vocab-lesson" | "vocab-review"`.

## Unlocking Logic

A word is unlockable when:
1. Every codepoint in `characters` maps to a symbol in a completed script lesson
2. Every entry in `toneRules` maps to a tone rule in a completed script lesson

Special characters (`์` การันต์, `ฯ` ไปยาลน้อย, `ๆ` ไม้ยมก) are flagged during enrichment and do not gate unlocking.

## Dynamic Vocabulary Lessons

Lessons are computed on the fly, not persisted:

1. Compute all unlocked words (characters + tone rules satisfied)
2. Remove words already learned (exist in `vocabCards`)
3. Sort remaining by `rank` ascending (most frequent first)
4. Next vocab lesson = first N unlearned words, where N = min(5, remaining count)
5. If only 2 words are unlockable, the lesson has 2 words

No fixed lesson IDs. As the user masters more script, the pool of unlockable words grows dynamically.

### Lesson Flow

1. **Intro phase**: Swipeable cards per word — Thai text, English meaning, romanization, mnemonic, audio button, syllable breakdown with tone annotations
2. **Quiz phase**: MultipleChoice using existing components — thaiToEnglish, englishToThai, audioRecognition (if audio exists)
3. **Complete phase**: Cards enter SRS, summary shown

## Pages & Navigation

### New Route: `/vocabulary`

**VocabularyPage** has two modes:

1. **Overview**: Unlocked/learned word counts, "Next lesson" button with word preview, "Review" button with due count, learned words grid
2. **Lesson mode**: Intro → Quiz → Complete (mirrors script lesson flow)

Vocab review reuses the ReviewPage flow, pulling only from `vocabCards`.

### Dashboard Changes

New "Vocabulary" section: words unlocked/learned, due vocab reviews, link to `/vocabulary`.

### Layout

"Vocabulary" nav item added to main navigation.

## Python Enrichment Script

### `scripts/enrich-vocabulary.py`

Dependencies: `pythainlp` (in `scripts/requirements.txt`)

Process:
1. Read `src/vocabulary.json`
2. For each entry: extract codepoints, syllable-tokenize, determine tone rules per syllable
3. Validate all codepoints against known symbols; flag unrecognized characters
4. Write enriched data back to `src/vocabulary.json`

Idempotent — re-enriches the full file each run.

## Files

### Created
| File | Purpose |
|------|---------|
| `scripts/enrich-vocabulary.py` | Offline enrichment with PyThaiNLP |
| `scripts/requirements.txt` | Python dependencies |
| `src/vocabulary-service.ts` | Unlock logic, dynamic lesson composition, vocab card generation |
| `src/vocabulary-types.ts` | VocabularyCard, VocabProperty, VocabEntry, VocabLessonSummary |
| `src/vocabulary-card-generator.ts` | Generate quiz cards per word |
| `src/pages/VocabularyPage.tsx` | Overview + lesson + review modes |
| `src/components/WordCard.tsx` | Intro card for vocabulary words |

### Modified
| File | Change |
|------|--------|
| `src/types.ts` | Extract SrsCard base; PropertyCard extends it |
| `src/review-service.ts` | Generalize to SrsCard; card pool parameter |
| `src/storage.ts` | Add vocabCards to LearnerState; update validation + merge |
| `src/context/AppContext.tsx` | Wire VocabularyService; expose vocab operations |
| `src/hooks/useApp.ts` | Type update for new context values |
| `src/App.tsx` | Add /vocabulary route |
| `src/components/Layout.tsx` | Add Vocabulary nav item |
| `src/pages/Dashboard.tsx` | Add vocabulary stats section |
| `src/vocabulary.json` | Enriched with characters, syllables, toneRules, mnemonic |
