# Vocabulary Spelling Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add character-tapping spelling quiz cards to vocabulary lessons so learners practice exact Thai word spelling.

**Architecture:** Two new `VocabProperty` values (`spelling`, `spellingFromAudio`) generated in `VocabCardGenerator`. A new `generateSpellingDistractors` utility builds confusable character grids from the `consonants` data. The existing `SentenceBuilder` component renders the quiz. No new entities or domain services.

**Tech Stack:** TypeScript, Vitest, React (existing `SentenceBuilder` component)

---

### Task 1: Add spelling properties to VocabProperty type

**Files:**
- Modify: `src/domain/vocabulary/types.ts:3-7`

**Step 1: Update VocabProperty union**

In `src/domain/vocabulary/types.ts`, change:

```ts
export type VocabProperty =
	| "thaiToEnglish"
	| "englishToThai"
	| "audioRecognition"
	| "toneIdentification";
```

To:

```ts
export type VocabProperty =
	| "thaiToEnglish"
	| "englishToThai"
	| "audioRecognition"
	| "toneIdentification"
	| "spelling"
	| "spellingFromAudio";
```

**Step 2: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/domain/vocabulary/types.ts
git commit -m "feat(vocab): add spelling and spellingFromAudio to VocabProperty"
```

---

### Task 2: Implement generateSpellingDistractors and spelling card generation

**Files:**
- Modify: `src/domain/vocabulary/services/VocabCardGenerator.ts`
- Test: `src/domain/vocabulary/services/VocabCardGenerator.test.ts`

**Step 1: Write failing tests for spelling cards**

Add to `src/domain/vocabulary/services/VocabCardGenerator.test.ts`:

```ts
it("produces a spelling card for every word", () => {
	const cards = generateVocabCards(testWord, allWords);
	const card = cards.find((c) => c.property === "spelling");
	expect(card).toBeDefined();
	expect(card?.id).toBe("vocab:ที่:spelling");
	expect(card?.question).toBe('Spell the Thai word for "at"');
	expect(card?.correctAnswer).toBe("ที่");
	expect(card?.wordThai).toBe("ที่");
});

it("spelling card choices contain all characters of the word", () => {
	const cards = generateVocabCards(testWord, allWords);
	const card = cards.find((c) => c.property === "spelling");
	for (const ch of ["ท", "ี", "่"]) {
		expect(card?.choices).toContain(ch);
	}
});

it("spelling card choices contain more characters than the word itself", () => {
	const cards = generateVocabCards(testWord, allWords);
	const card = cards.find((c) => c.property === "spelling");
	expect(card!.choices.length).toBeGreaterThan(3);
});

it("does not produce spellingFromAudio card without audio", () => {
	const cards = generateVocabCards(testWord, allWords);
	const card = cards.find((c) => c.property === "spellingFromAudio");
	expect(card).toBeUndefined();
});

it("produces spellingFromAudio card when audio exists", () => {
	const cards = generateVocabCards(testWordWithAudio, allWords);
	const card = cards.find((c) => c.property === "spellingFromAudio");
	expect(card).toBeDefined();
	expect(card?.id).toBe("vocab:ที่:spellingFromAudio");
	expect(card?.question).toBe("Listen and spell the word");
	expect(card?.correctAnswer).toBe("ที่");
	expect(card?.audioUrl).toBe("/audio/thai/thi.mp3");
	expect(card?.wordThai).toBe("ที่");
});

it("spelling cards carry mnemonic from source word", () => {
	const cards = generateVocabCards(testWordWithMnemonic, allWords);
	const spellingCard = cards.find((c) => c.property === "spelling");
	expect(spellingCard?.mnemonic).toBe("tea tree → falling tone");
});
```

Also update the existing card count tests:

```ts
// Change "produces 2 cards" to "produces 3 cards" (thaiToEnglish, englishToThai, spelling)
it("produces 3 cards for a word without audio", () => {
	const cards = generateVocabCards(testWord, allWords);
	expect(cards).toHaveLength(3);
});

// Change "produces 3 cards" to "produces 5 cards" (+ spelling + spellingFromAudio)
it("produces 5 cards for a word with audio", () => {
	const cards = generateVocabCards(testWordWithAudio, allWords);
	expect(cards).toHaveLength(5);
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts`
Expected: New tests FAIL, count tests FAIL

**Step 3: Implement generateSpellingDistractors and spelling card generation**

In `src/domain/vocabulary/services/VocabCardGenerator.ts`, add import and the distractor function:

```ts
import { consonants } from "../../script/data/symbols";
```

Add `generateSpellingDistractors` function (file scope, before `generateVocabCards`):

```ts
/** Normalise an initialSound string to its base phoneme for grouping. */
function normaliseSound(sound: string): string {
	return sound.replace(/\s*\(.*\)/, "").trim().toLowerCase();
}

/** Build a map from base sound → set of consonant characters. */
function buildConfusableMap(): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const c of consonants) {
		const key = normaliseSound(c.initialSound);
		const list = map.get(key) ?? [];
		list.push(c.character);
		map.set(key, list);
	}
	return map;
}

const confusableMap = buildConfusableMap();

/** All consonant characters as a flat set for quick membership checks. */
const consonantChars = new Set(consonants.map((c) => c.character));

/**
 * Generate a shuffled character grid for a spelling quiz.
 *
 * Includes all characters of the word plus phonetically confusable
 * consonant distractors and random padding characters.
 */
function generateSpellingChoices(word: VocabEntry): string[] {
	const wordChars = [...word.thai].filter((ch) => ch !== " ");
	const charSet = new Set(wordChars);

	// Add confusable consonants for each consonant in the word
	for (const ch of wordChars) {
		if (!consonantChars.has(ch)) continue;
		// Find which sound group this consonant belongs to
		const consonant = consonants.find((c) => c.character === ch);
		if (!consonant) continue;
		const key = normaliseSound(consonant.initialSound);
		const group = confusableMap.get(key) ?? [];
		for (const confusable of group) {
			if (confusable !== ch) charSet.add(confusable);
		}
	}

	// Pad with random characters if grid is too small
	const allChars = consonants.map((c) => c.character);
	const MIN_GRID_SIZE = wordChars.length + 3;
	while (charSet.size < MIN_GRID_SIZE) {
		const random = allChars[Math.floor(Math.random() * allChars.length)]!;
		charSet.add(random);
	}

	// Shuffle
	const choices = [...charSet];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[choices[i], choices[j]] = [choices[j]!, choices[i]!];
	}
	return choices;
}
```

Then at the end of `generateVocabCards`, before `return cards;`, add:

```ts
// Spelling (always)
cards.push({
	id: `vocab:${word.thai}:spelling`,
	wordThai: word.thai,
	property: "spelling",
	question: `Spell the Thai word for "${word.english}"`,
	correctAnswer: word.thai.replaceAll(" ", ""),
	choices: generateSpellingChoices(word),
	mnemonic,
	srs: SrsSchedule.initial().toDTO(),
});

// Spelling from audio (only if audio exists)
if (word.thai_audio_file) {
	cards.push({
		id: `vocab:${word.thai}:spellingFromAudio`,
		wordThai: word.thai,
		property: "spellingFromAudio",
		question: "Listen and spell the word",
		correctAnswer: word.thai.replaceAll(" ", ""),
		choices: generateSpellingChoices(word),
		mnemonic,
		srs: SrsSchedule.initial().toDTO(),
		audioUrl: word.thai_audio_file,
	});
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts`
Expected: ALL tests pass

**Step 5: Commit**

```bash
git add src/domain/vocabulary/services/VocabCardGenerator.ts src/domain/vocabulary/services/VocabCardGenerator.test.ts
git commit -m "feat(vocab): generate spelling and spellingFromAudio cards with confusable distractors"
```

---

### Task 3: Route spelling cards to SentenceBuilder in VocabularyPage

**Files:**
- Modify: `src/presentation/pages/VocabularyPage.tsx`

**Step 1: Add SentenceBuilder import**

Add to VocabularyPage.tsx imports:

```ts
import { SentenceBuilder } from "../components/organisms/SentenceBuilder";
```

**Step 2: Update quiz phase dispatch**

In the quiz phase rendering (around line 380), change:

```tsx
{currentVocabCard.property === "toneIdentification" ? (
	<ToneQuiz card={currentVocabCard} onAnswer={flow.advance} />
) : (
	<MultipleChoice card={currentVocabCard} onAnswer={flow.advance} />
)}
```

To:

```tsx
{currentVocabCard.property === "toneIdentification" ? (
	<ToneQuiz card={currentVocabCard} onAnswer={flow.advance} />
) : currentVocabCard.property === "spelling" ||
  currentVocabCard.property === "spellingFromAudio" ? (
	<SentenceBuilder card={currentVocabCard} onAnswer={flow.advance} />
) : (
	<MultipleChoice card={currentVocabCard} onAnswer={flow.advance} />
)}
```

**Step 3: Update review phase dispatch**

In the review phase rendering (around line 510), update similarly. The review dispatch currently checks for `toneIdentification` and then falls back to `mode`. Add a spelling check between the tone check and mode check:

Before the `current.mode === "multipleChoice"` branch, add:

```tsx
: "property" in current.card &&
  ((current.card as unknown as VocabularyCard).property === "spelling" ||
   (current.card as unknown as VocabularyCard).property === "spellingFromAudio") ? (
	<SentenceBuilder
		card={current.card as unknown as VocabularyCard}
		onAnswer={handleMcAnswer}
	/>
)
```

**Step 4: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/presentation/pages/VocabularyPage.tsx
git commit -m "feat(vocab): route spelling cards to SentenceBuilder in VocabularyPage"
```

---

### Task 4: Route spelling cards to SentenceBuilder in ReviewPage

**Files:**
- Modify: `src/presentation/pages/ReviewPage.tsx`

**Step 1: Add imports**

Add to ReviewPage.tsx imports:

```ts
import { SentenceBuilder } from "../components/organisms/SentenceBuilder";
import type { VocabularyCard } from "../../domain/vocabulary/types";
```

**Step 2: Update card rendering dispatch**

The current dispatch at around line 244 is:

```tsx
{reviewSession.currentCard.mode === "multipleChoice" ? (
	<MultipleChoice
		card={reviewSession.currentCard.card}
		onAnswer={handleMcAnswer}
	/>
) : (
	<Flashcard
		card={reviewSession.currentCard.card}
		onRate={handleAdvance}
	/>
)}
```

Change to:

```tsx
{"property" in reviewSession.currentCard.card &&
 ((reviewSession.currentCard.card as unknown as VocabularyCard).property === "spelling" ||
  (reviewSession.currentCard.card as unknown as VocabularyCard).property === "spellingFromAudio") ? (
	<SentenceBuilder
		card={reviewSession.currentCard.card as unknown as VocabularyCard}
		onAnswer={handleMcAnswer}
	/>
) : reviewSession.currentCard.mode === "multipleChoice" ? (
	<MultipleChoice
		card={reviewSession.currentCard.card}
		onAnswer={handleMcAnswer}
	/>
) : (
	<Flashcard
		card={reviewSession.currentCard.card}
		onRate={handleAdvance}
	/>
)}
```

**Step 3: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/presentation/pages/ReviewPage.tsx
git commit -m "feat(vocab): route spelling cards to SentenceBuilder in ReviewPage"
```

---

### Task 5: Run full test suite and verify linting

**Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

**Step 2: Run linting and formatting**

Run: `pnpm biome check --write .`
Expected: No errors

**Step 3: Final commit if formatting changes**

```bash
git add -u
git commit -m "style: apply formatting"
```
