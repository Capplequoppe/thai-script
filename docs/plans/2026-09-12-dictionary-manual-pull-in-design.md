# Dictionary Manual Pull-In Design

**Goal:** Let a learner manually add a specific vocabulary word to the SRS system from the Dictionary page, even before the frequency rank-window would normally reach it — as long as its script (characters + tone rules) is already mastered. Since sentences unlock purely from word mastery, this also surfaces which other words are worth pulling in to unlock a specific sentence.

**Architecture:** Two new read-only domain queries (`getPullableWords`, `getUnlockSuggestions`) plus one new domain mutation (`generateCardsForWord`), wired through a new `StartLessonUseCase.pullInVocabWord()`. The Dictionary page's existing unlocked-only grid is untouched; only its search path and word detail view change. No new persistence shape — a manually pulled-in word's cards are indistinguishable from normally-unlocked ones, matching how `getLearnedEntries()` already works (learned = has cards, full stop).

**Tech Stack:** Existing domain/application/presentation layering, React, TypeScript, AppContext.

---

## Domain Layer

### `VocabularyService` (`src/domain/vocabulary/services/VocabularyLessonService.ts`)

Three new public methods, all built on the existing private `getMasteredCharacters()` / `getMasteredToneRules()` / `isWordMastered()` / `getLearnedThaiWords()` — no changes to those.

```typescript
/** Script is fully mastered and the word has no cards yet. Ignores rank/rank-window entirely. */
isPullable(entry: VocabEntry): boolean

/** Every vocabulary entry that isPullable(), regardless of rank (including rank: null entries). */
getPullableWords(): VocabEntry[]

/** Which characters/tone rules are still missing for a word (for the locked-reason UI). */
getMissingPrerequisites(entry: VocabEntry): { characters: string[]; toneRules: string[] }

/**
 * Generate (but do not persist) cards for one specific word, bypassing the
 * rank-window/batch selection getNextLesson() uses. Returns null if the word
 * isn't pullable, or if the apprentice cap blocks starting it (same
 * canStartLesson("vocab") check generateLessonCards() already makes — that
 * cap is enforced here explicitly, since this path doesn't go through
 * getNextLesson()).
 */
generateCardsForWord(thai: string): VocabularyCard[] | null
```

`generateCardsForWord` looks up the entry in `this.vocabulary` by `thai`, calls `isPullable`, checks `apprenticeService?.canStartLesson("vocab")`, then calls the existing `generateVocabCards(entry, this.vocabulary, introducedChars)` for that single entry — the exact same generator `generateLessonCards()` already uses per-word, just invoked for one explicit entry instead of an auto-selected batch. Persistence still goes through the existing public `commitLessonCards()` — unchanged.

### `SentenceService` (`src/domain/sentence/services/SentenceLessonService.ts`)

One new public method:

```typescript
interface UnlockSuggestion {
  sentence: SentenceEntry;
  missingWords: string[]; // other words in the sentence not yet learned
}

/**
 * Sentences containing `thai`, each with its other still-missing words —
 * but only sentences where every missing word is itself pullable (via the
 * injected vocabService.isPullable/getPullableWords) are included, so every
 * suggestion is actually actionable. Sorted by missingWords.length ascending
 * (sentences `thai` alone would unlock come first), capped to 5.
 */
getUnlockSuggestions(thai: string): UnlockSuggestion[]
```

Implementation: filter `sentenceData` for entries whose `words` include `thai`; for each, `missingWords = entry.words.filter(w => w !== thai && !learnedWords.has(w))`; keep only if every word in `missingWords` is in the `Set` built from `this.vocabService.getPullableWords()`; sort by `missingWords.length`; `slice(0, 5)`.

### `StartLessonUseCase` (`src/application/use-cases/StartLessonUseCase.ts`)

```typescript
/** Manually pull a word into the SRS system. Returns false if it's not pullable or the apprentice cap blocks it (caller shows the appropriate message). */
pullInVocabWord(thai: string): boolean
```

```typescript
pullInVocabWord(thai: string): boolean {
  const cards = this.vocabService.generateCardsForWord(thai);
  if (!cards) return false;
  this.vocabService.commitLessonCards(cards);
  return true;
}
```

Exposed via `AppContext` the same way the existing `lesson`/`vocabularyService`/`sentenceService` instances already are.

---

## UI Components

### `DictionaryPage.tsx` — search path only

The main grid keeps showing exactly `vocab.getUnlockedWords()` (unchanged, existing tests stay valid). When the search query is non-empty, it *additionally* matches against `vocab.getPullableWords()` (memoized off the same `state` deps the grid already uses) and merges in any matches not already covered by the grid, rendered with a distinct "not yet due" visual treatment (muted/outline tile, no `StageDot`) instead of the learned/unlearned states that exist today.

### Word detail view

Extends the existing detail panel (below `WordCard`, same slot `StageBadge` occupies for learned words):

- **Already learned:** unchanged, no new UI.
- **Pullable, not learned:** a "Pull into SRS" button. On click: `lesson.pullInVocabWord(entry.thai)` then `refresh()` on success; on failure (cap reached — mastery is already guaranteed true to reach this branch) show an inline message, e.g. "Too many words in progress — clear some reviews first."
- **Not pullable (script incomplete):** no button; instead a locked explanation built from `vocab.getMissingPrerequisites(entry)`, e.g. "Still needs: tone rule `low-maytho`, character `ๅ`."
- **Sentence suggestions panel** (shown whenever the word isn't learned, pullable or not — it's useful context either way): "Appears in N sentences." List from `sentence.getUnlockSuggestions(entry.thai)`. Each row shows the sentence's Thai/English and either "Unlocks immediately" (when `missingWords` is empty) or "Also pull in:" followed by a chip per missing word — each chip is itself a small pull-in action (reuses the exact same `pullInVocabWord` call), so a learner can cascade through a sentence's prerequisites from this one panel.

---

## Data Flow

1. Learner searches the Dictionary for a word they encountered elsewhere (e.g. "air conditioner").
2. If it's outside the current rank window but script-mastered, it shows up tagged "not yet due" instead of being absent.
3. Opening its detail view shows either a "Pull into SRS" button, or a locked reason, plus the sentences it appears in and what else pulling it in would still be missing.
4. Clicking "Pull into SRS" (on the word itself, or on a suggestion chip) calls `pullInVocabWord` → `generateCardsForWord` (mastery + cap re-checked) → `commitLessonCards` → `refresh()`.
5. `refresh()` updates `state`; `getUnlockedSentences()` (pull-based, recomputed on next call — see `SentenceLessonService.getUnlockedSentences`) now includes any sentence whose last missing word was just filled in, so it shows up next time the sentence review queue is consulted, same as any normally-unlocked sentence.

---

## Testing

- `VocabularyService.isPullable` / `getPullableWords` — mastered+uncarded word included; mastered+already-learned excluded; unmastered excluded regardless of rank; `rank: null` mastered word included (this is the actual point of the feature).
- `VocabularyService.generateCardsForWord` — returns cards for a pullable word; returns `null` for an unmastered word; returns `null` when `apprenticeService.canStartLesson("vocab")` is false; cards match what `generateVocabCards` would produce directly.
- `VocabularyService.getMissingPrerequisites` — returns the exact missing characters/tone rules for a partially-mastered word; empty arrays for a fully mastered one.
- `SentenceService.getUnlockSuggestions` — a sentence with all-other-words-learned surfaces with empty `missingWords`; a sentence with an unpullable missing word is excluded entirely; ordering is fewest-missing-first; capped at 5.
- `StartLessonUseCase.pullInVocabWord` — delegates correctly, returns `false` on the same conditions `generateCardsForWord` returns `null` for.
- `DictionaryPage` — search surfaces a pullable-but-locked-by-rank word distinctly from the unlocked grid; pull-in button appears only when pullable, disappears once learned (post-refresh); locked-reason text renders for an unmastered word; suggestion panel renders and its chip pull-in actions work; existing "no Override Stage button" test (`DictionaryPage.test.tsx:178-186`) is re-verified to still pass unchanged (it targets a different, pre-existing feature).
