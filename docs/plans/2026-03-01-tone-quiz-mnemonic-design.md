# Design: Tone Quiz & Mnemonic Visibility

**Date:** 2026-03-01
**Status:** Approved

## Overview

Two complementary features that reinforce correct Thai pronunciation from the very first encounter with a word:

1. **Mnemonic visibility** — surface the mnemonic aid in both the intro (WordCard) and quiz phases so learners build the sound-meaning association immediately.
2. **Tone quiz** — a new `toneIdentification` card type presented during vocab reviews, where the user identifies the tone of each syllable of a word.

---

## 1. Data Model Changes

### `VocabProperty` (types.ts)

Add `"toneIdentification"` to the union:

```ts
type VocabProperty =
  | "thaiToEnglish"
  | "englishToThai"
  | "audioRecognition"
  | "toneIdentification";
```

### `VocabularyCard` (types.ts)

Add two optional fields:

```ts
interface VocabularyCard extends SrsCard {
  wordThai: string;
  property: VocabProperty;
  mnemonic?: string | null;
  syllables?: { text: string; tone: string }[];
}
```

- `mnemonic` — copied from the source `VocabEntry` at card-generation time.
- `syllables` — only populated for `toneIdentification` cards; each entry is a syllable with its correct tone.

---

## 2. Card Generation (VocabCardGenerator.ts)

- Copy `word.mnemonic` into all card types (thaiToEnglish, englishToThai, audioRecognition).
- Generate one `toneIdentification` card per word **only when** at least one syllable has a `tone` value.
  - `correctAnswer`: pipe-separated tones, e.g. `"falling|mid"`
  - `choices`: empty array (the ToneQuiz component handles its own answer buttons)
  - `syllables`: filtered `word.syllables` mapped to `{ text, tone }`

---

## 3. WordCard — Mnemonic Repositioned

Move the mnemonic section from position 4 (bottom) to position 2 (immediately after the hero), so it appears before the syllable breakdown.

New section order:
1. Hero (image + Thai word + audio + English + romanization + word_class)
2. **Mnemonic** (accent-coloured block with "Memory tip 💡" label, more visual weight)
3. Syllable Breakdown
4. Example Sentences

---

## 4. MultipleChoice — Mnemonic Hint

Add an optional `mnemonicExpanded` boolean prop (default `false`):

- **Lesson quiz** (`mnemonicExpanded={true}`): mnemonic panel always visible, rendered below the question, above the answer grid.
- **Review phase** (`mnemonicExpanded={false}`): mnemonic hidden behind a "Show hint" toggle; expanding it reveals the hint inline.

Sniff the mnemonic at runtime using the existing pattern:
`const mnemonic = "mnemonic" in card ? card.mnemonic : null`

Render only when mnemonic is truthy.

---

## 5. ToneQuiz Component (new)

**File:** `src/presentation/components/organisms/ToneQuiz.tsx`

**Props:**
```ts
interface ToneQuizProps {
  card: VocabularyCard;
  onAnswer: (correct: boolean, responseTimeMs: number) => void;
}
```

**Layout:**
```
[Thai word — large, same ThaiWordDisplay as MultipleChoice]
"What is the tone of each syllable?"

─── Syllable 1 text ───────────────
[mid]  [low]  [high]  [falling]  [rising]

─── Syllable 2 text (multi-syllable) ────
[mid]  [low]  [high]  [falling]  [rising]

           [Check ▶]   ← disabled until all syllables selected
```

**Behaviour:**
- Each syllable row tracks its own selected tone independently.
- "Check" button enabled only when every syllable has a selection.
- On submit: reveal correct/incorrect per row (green ✓ correct, red ✗ with correct tone shown).
- After 600 ms delay: call `onAnswer(allCorrect, elapsed)`.

---

## 6. VocabularyPage Routing

**Quiz phase** — route `toneIdentification` cards to `ToneQuiz`, all other cards to `MultipleChoice` with `mnemonicExpanded`:

```tsx
if (currentVocabCard.property === "toneIdentification") {
  return <ToneQuiz card={currentVocabCard} onAnswer={flow.advance} />;
}
return <MultipleChoice card={currentVocabCard} onAnswer={flow.advance} mnemonicExpanded />;
```

**Review phase** — keep existing `MultipleChoice` / `Flashcard` routing; add `ToneQuiz` for `toneIdentification`:

```tsx
if (current.card.property === "toneIdentification") {
  return <ToneQuiz card={current.card} onAnswer={handleMcAnswer} />;
}
if (current.mode === "multipleChoice") {
  return <MultipleChoice card={current.card} onAnswer={handleMcAnswer} />;
}
return <Flashcard card={current.card} onRate={handleReviewAdvance} />;
```

---

## Implementation Order

1. Update `VocabularyCard` types — `toneIdentification` property + `mnemonic` + `syllables`
2. Update `VocabCardGenerator` — copy mnemonic, generate tone cards
3. Update `WordCard` — reposition mnemonic to position 2
4. Update `MultipleChoice` — add `mnemonicExpanded` prop + hint rendering
5. Create `ToneQuiz` component
6. Update `VocabularyPage` — route tone cards, pass `mnemonicExpanded`
