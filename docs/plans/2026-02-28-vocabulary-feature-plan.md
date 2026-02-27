# Vocabulary Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add vocabulary learning with frequency-based unlocking, lesson-style batches, and separate SRS reviews.

**Architecture:** Pre-compute syllable/tone data via Python script (PyThaiNLP). Extract generic `SrsCard` base from `PropertyCard`. New `VocabularyService` handles unlock logic and dynamic lesson composition. Separate vocab card pool in storage. New `/vocabulary` page with intro→quiz→complete flow.

**Tech Stack:** TypeScript, React, PyThaiNLP (offline script), Vitest, Biome

---

## Phase 1: Python Enrichment Script

### Task 1: Create enrichment script and requirements

**Files:**
- Create: `scripts/requirements.txt`
- Create: `scripts/enrich-vocabulary.py`

**Step 1: Create requirements.txt**

```
pythainlp>=5.0
```

**Step 2: Write the enrichment script**

```python
#!/usr/bin/env python3
"""Enrich vocabulary.json with character decomposition, syllable breakdown, and tone rules."""

import json
import sys
from pathlib import Path
from pythainlp.tokenize import syllable_tokenize
from pythainlp.util import thai_digit_to_arabic_digit

VOCAB_PATH = Path(__file__).parent.parent / "src" / "vocabulary.json"

# Thai character ranges
CONSONANTS = set("กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฬวศษสหฬอฮ")
VOWEL_MARKS = set("ะัาำิีึืุูเแโใไ็")
TONE_MARKS = set("่้๊๋")
SPECIAL_CHARS = set("์ฯๆ")  # These don't gate unlocking

# Consonant class lookup (from symbol.ts)
MID_CLASS = set("กจฎฏดตบปอ")
HIGH_CLASS = set("ขฃฉฐถผฝศษสห")
LOW_CLASS = set("คฅฆงชซฌญฑฒณทธนพฟภมยรฤลฬวฮ")

# Tone mark name mapping
TONE_MARK_NAMES = {
    "่": "mayek",
    "้": "maytho",
    "๊": "maytri",
    "๋": "mayjattawa",
}

# Final consonant sound classes for dead/live determination
STOP_FINALS = set("กขฃคฅฆบปพฟภดตถทธจชซศษสฎฏฐฑฒ")
SONORANT_FINALS = set("งนณญรลฬมย")


def get_consonant_class(char: str) -> str | None:
    if char in MID_CLASS:
        return "mid"
    if char in HIGH_CLASS:
        return "high"
    if char in LOW_CLASS:
        return "low"
    return None


def extract_characters(word: str) -> list[str]:
    """Extract unique Thai codepoints from a word."""
    chars = []
    seen = set()
    for ch in word:
        if "\u0e00" <= ch <= "\u0e7f" and ch not in SPECIAL_CHARS and ch not in seen:
            chars.append(ch)
            seen.add(ch)
    return chars


def analyze_syllable(syl: str) -> dict:
    """Analyze a single syllable for its components and tone rule."""
    result = {
        "text": syl,
        "initialConsonant": None,
        "vowel": None,
        "finalConsonant": None,
        "toneMark": None,
        "consonantClass": None,
        "syllableType": None,
        "tone": None,
    }

    consonants_found = []
    vowels_found = []
    tone_mark = None

    for ch in syl:
        if ch in CONSONANTS:
            consonants_found.append(ch)
        elif ch in VOWEL_MARKS:
            vowels_found.append(ch)
        elif ch in TONE_MARKS:
            tone_mark = ch

    # Initial consonant is typically the first consonant
    if consonants_found:
        result["initialConsonant"] = consonants_found[0]
        result["consonantClass"] = get_consonant_class(consonants_found[0])

    # Final consonant (if more than one consonant)
    if len(consonants_found) > 1:
        result["finalConsonant"] = consonants_found[-1]

    if vowels_found:
        result["vowel"] = "".join(vowels_found)

    result["toneMark"] = tone_mark

    # Determine syllable type (live vs dead)
    has_long_vowel = bool(set(vowels_found) & set("าีืูเแโใไ"))
    final = consonants_found[-1] if len(consonants_found) > 1 else None

    if final:
        if final in STOP_FINALS:
            result["syllableType"] = "dead-short" if not has_long_vowel else "dead-long"
        else:
            result["syllableType"] = "live"
    elif has_long_vowel:
        result["syllableType"] = "live"
    else:
        # Short vowel with no final = dead
        result["syllableType"] = "dead-short"

    return result


def determine_tone_rule_id(syllable_info: dict) -> str | None:
    """Map a syllable's analysis to a tone rule ID matching symbol.ts format."""
    cls = syllable_info.get("consonantClass")
    if not cls:
        return None

    tone_mark = syllable_info.get("toneMark")
    if tone_mark and tone_mark in TONE_MARK_NAMES:
        # Tone mark rule: "{class}-{markName}"
        return f"{cls}-{TONE_MARK_NAMES[tone_mark]}"

    syllable_type = syllable_info.get("syllableType")
    if not syllable_type:
        return None

    # Base tone rule: "{class}-{syllableType}"
    return f"{cls}-{syllable_type}"


def enrich_entry(entry: dict) -> dict:
    """Add characters, syllables, and toneRules to a vocabulary entry."""
    word = entry["thai"]

    # Extract unique characters
    entry["characters"] = extract_characters(word)

    # Syllable tokenization
    try:
        syls = syllable_tokenize(word)
    except Exception:
        syls = [word]

    syllable_infos = []
    tone_rule_ids = set()

    for syl in syls:
        info = analyze_syllable(syl)
        syllable_infos.append(info)
        rule_id = determine_tone_rule_id(info)
        if rule_id:
            tone_rule_ids.add(rule_id)

    entry["syllables"] = syllable_infos
    entry["toneRules"] = sorted(tone_rule_ids)

    # Ensure mnemonic field exists
    if "mnemonic" not in entry:
        entry["mnemonic"] = None

    return entry


def main():
    if not VOCAB_PATH.exists():
        print(f"ERROR: {VOCAB_PATH} not found", file=sys.stderr)
        sys.exit(1)

    with open(VOCAB_PATH, encoding="utf-8") as f:
        data = json.load(f)

    print(f"Enriching {len(data)} vocabulary entries...")

    # Collect unknown characters for reporting
    all_known = CONSONANTS | VOWEL_MARKS | TONE_MARKS | SPECIAL_CHARS
    unknown_chars = set()

    for i, entry in enumerate(data):
        data[i] = enrich_entry(entry)
        for ch in entry["thai"]:
            if "\u0e00" <= ch <= "\u0e7f" and ch not in all_known:
                unknown_chars.add(ch)

        if (i + 1) % 500 == 0:
            print(f"  Processed {i + 1}/{len(data)}...")

    with open(VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Done! Enriched {len(data)} entries.")
    if unknown_chars:
        print(f"WARNING: Unknown Thai characters found: {unknown_chars}")
        print("These characters are in SPECIAL_CHARS and won't gate unlocking.")


if __name__ == "__main__":
    main()
```

**Step 3: Run the script**

```bash
cd scripts
pip install -r requirements.txt
python enrich-vocabulary.py
```

Expected: "Enriching 5435 vocabulary entries..." then "Done! Enriched 5435 entries."

**Step 4: Verify enrichment**

```bash
python3 -c "
import json
with open('../src/vocabulary.json') as f:
    data = json.load(f)
e = data[0]
print(f'Word: {e[\"thai\"]}')
print(f'Characters: {e[\"characters\"]}')
print(f'Syllables: {len(e[\"syllables\"])}')
print(f'Tone rules: {e[\"toneRules\"]}')
print(f'Mnemonic: {e[\"mnemonic\"]}')
"
```

Expected: Shows characters, syllables, and toneRules arrays populated.

**Step 5: Commit**

```bash
git add scripts/ src/vocabulary.json
git commit -m "feat: add Python enrichment script for vocabulary syllable/tone analysis"
```

---

## Phase 2: SRS Refactoring — Generic Card Infrastructure

### Task 2: Extract SrsCard base type

**Files:**
- Modify: `src/types.ts`

**Step 1: Write test for type compatibility**

No new test file needed — existing tests will verify backwards compatibility. The refactoring is purely structural: extract shared fields into `SrsCard`, have `PropertyCard` extend it.

**Step 2: Refactor types.ts**

Add `SrsCard` interface before `PropertyCard`. Make `PropertyCard` extend it:

```typescript
// After RecallRating, before PropertyCard:

export interface SrsCard {
	id: string;
	question: string;
	correctAnswer: string;
	choices: string[];
	srs: SrsData;
	audioUrl?: string;
}

export interface PropertyCard extends SrsCard {
	symbolCharacter: string;
	property: PropertyType | "toneRule";
	lessonNumber: number;
}
```

Remove the duplicated fields from `PropertyCard` (id, question, correctAnswer, choices, srs, audioUrl) — they now come from `SrsCard`.

**Step 3: Run tests to verify no breakage**

Run: `npx vitest run`
Expected: All 105 tests pass (PropertyCard is structurally identical).

**Step 4: Run lint**

Run: `npx biome check src/types.ts`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/types.ts
git commit -m "refactor: extract SrsCard base interface from PropertyCard"
```

---

### Task 3: Add VocabularyCard type and vocab storage

**Files:**
- Create: `src/vocabulary-types.ts`
- Modify: `src/types.ts` (add vocabCards to LearnerState)
- Modify: `src/storage.ts` (update validation and merge)

**Step 1: Create vocabulary-types.ts**

```typescript
import type { SrsCard } from "./types";

export type VocabProperty = "thaiToEnglish" | "englishToThai" | "audioRecognition";

export interface VocabularyCard extends SrsCard {
	wordThai: string;
	property: VocabProperty;
}

export interface SyllableInfo {
	text: string;
	initialConsonant: string | null;
	vowel: string | null;
	finalConsonant: string | null;
	toneMark: string | null;
	consonantClass: string | null;
	syllableType: string | null;
	tone: string | null;
}

export interface VocabEntry {
	thai: string;
	romanization: string;
	word_class: string;
	english: string;
	rank: number | null;
	frequency: number;
	mnemonic: string | null;
	characters: string[];
	syllables: SyllableInfo[];
	toneRules: string[];
	thai_audio_file: string | null;
	english_audio_file: string | null;
	image_file: string | null;
	samples: Array<{
		thai: string;
		romanization: string;
		english: string;
		thai_audio_file: string | null;
		english_audio_file: string | null;
	}>;
	source: string;
}

export interface VocabLessonSummary {
	words: VocabEntry[];
}
```

**Step 2: Add vocabCards to LearnerState in types.ts**

In `LearnerState` interface, add:
```typescript
vocabCards: Record<string, VocabularyCard>;
```

In `INITIAL_LEARNER_STATE`, add:
```typescript
vocabCards: {},
```

Note: Import `VocabularyCard` from `./vocabulary-types`.

**Step 3: Update storage validation**

In `src/storage.ts`, update `validateLearnerState` — if `vocabCards` is missing, that's OK (backwards compat), but if present it must be an object.

In `LocalStorageAdapter.load()`, ensure `vocabCards` defaults to `{}` when loading old data that lacks it.

**Step 4: Update merge logic**

In `src/merge-service.ts`, add merging for `vocabCards` using the same strategy as `cards` (keep the one with higher repetitions).

**Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass (existing tests don't reference vocabCards, backwards compat handles missing field).

**Step 6: Commit**

```bash
git add src/vocabulary-types.ts src/types.ts src/storage.ts src/merge-service.ts
git commit -m "feat: add VocabularyCard type and vocabCards storage"
```

---

### Task 4: Generalize ReviewService for dual card pools

**Files:**
- Modify: `src/review-service.ts`
- Modify: `src/review-service.test.ts`

**Step 1: Write failing test for vocab review**

Add to `src/review-service.test.ts`:

```typescript
it("getDueCards with 'vocab' pool returns only vocab cards", () => {
	// Setup: add a due vocab card to state
	const state = storage.load();
	state.vocabCards["test-vocab:thaiToEnglish"] = {
		id: "test-vocab:thaiToEnglish",
		wordThai: "ที่",
		property: "thaiToEnglish",
		question: "What does ที่ mean?",
		correctAnswer: "at",
		choices: ["at", "can", "will", "this"],
		srs: { ...DEFAULT_SRS_DATA, nextReviewDate: new Date(Date.now() - 60000).toISOString() },
		audioUrl: undefined,
	};
	storage.save(state);

	const dueScript = service.getDueCards(undefined, "script");
	const dueVocab = service.getDueCards(undefined, "vocab");
	expect(dueVocab).toHaveLength(1);
	expect(dueVocab[0]!.id).toBe("test-vocab:thaiToEnglish");
	expect(dueScript).not.toContainEqual(expect.objectContaining({ id: "test-vocab:thaiToEnglish" }));
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/review-service.test.ts`
Expected: FAIL — getDueCards doesn't accept pool parameter.

**Step 3: Refactor ReviewService**

Add a `pool` parameter (`"script" | "vocab"`, default `"script"`) to `getDueCards`, `getNumDueCards`, `startReviewSession`, and `recordReview`.

```typescript
type CardPool = "script" | "vocab";

private getCardMap(pool: CardPool): Record<string, SrsCard> {
	const state = this.storage.load();
	return pool === "vocab" ? state.vocabCards : state.cards;
}

getDueCards(now?: string, pool: CardPool = "script"): SrsCard[] {
	const cardMap = this.getCardMap(pool);
	const currentTime = now ?? new Date().toISOString();
	return Object.values(cardMap).filter((card) => isDue(card.srs, currentTime));
}

getNumDueCards(now?: string, pool: CardPool = "script"): number {
	return this.getDueCards(now, pool).length;
}

recordReview(cardId: string, rating: RecallRating, now?: string, timing?: ResponseTimingData, pool: CardPool = "script"): void {
	const state = this.storage.load();
	const cardMap = pool === "vocab" ? state.vocabCards : state.cards;
	const card = cardMap[cardId];
	if (!card) throw new Error(`Card not found: ${cardId}`);
	const currentTime = now ?? new Date().toISOString();
	card.srs = calculateNextReview(card.srs, rating, currentTime, timing);
	this.storage.save(state);
}

startReviewSession(maxCards?: number, now?: string, pool: CardPool = "script"): ActiveReviewSession {
	const dueCards = this.getDueCards(now, pool);
	// ... rest is the same, sorting and shuffling
}
```

The `SessionSummary.type` union in `types.ts` needs extending:
```typescript
type: "lesson" | "review" | "vocab-lesson" | "vocab-review";
```

Update `endReviewSession` to accept a session type parameter.

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass (default pool="script" preserves existing behavior).

**Step 5: Commit**

```bash
git add src/review-service.ts src/review-service.test.ts src/types.ts
git commit -m "refactor: generalize ReviewService with card pool parameter"
```

---

## Phase 3: Vocabulary Service

### Task 5: Create vocabulary card generator

**Files:**
- Create: `src/vocabulary-card-generator.ts`
- Create: `src/vocabulary-card-generator.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { generateVocabCards } from "./vocabulary-card-generator";
import type { VocabEntry } from "./vocabulary-types";

const mockEntry: VocabEntry = {
	thai: "ที่",
	romanization: "tʰîː",
	word_class: "",
	english: "at",
	rank: 1,
	frequency: 773568,
	mnemonic: null,
	characters: ["ท", "ี", "่"],
	syllables: [{
		text: "ที่",
		initialConsonant: "ท",
		vowel: "ี",
		finalConsonant: null,
		toneMark: "่",
		consonantClass: "low",
		syllableType: "live",
		tone: "falling",
	}],
	toneRules: ["low-live-mayek"],
	thai_audio_file: null,
	english_audio_file: null,
	image_file: null,
	samples: [],
	source: "frequency_csv",
};

describe("generateVocabCards", () => {
	it("generates thaiToEnglish and englishToThai cards", () => {
		const cards = generateVocabCards(mockEntry, [mockEntry]);
		expect(cards).toHaveLength(2);
		expect(cards.find(c => c.property === "thaiToEnglish")).toBeDefined();
		expect(cards.find(c => c.property === "englishToThai")).toBeDefined();
	});

	it("thaiToEnglish card shows Thai word and asks for English meaning", () => {
		const cards = generateVocabCards(mockEntry, [mockEntry]);
		const card = cards.find(c => c.property === "thaiToEnglish")!;
		expect(card.wordThai).toBe("ที่");
		expect(card.question).toContain("ที่");
		expect(card.correctAnswer).toBe("at");
		expect(card.choices).toContain("at");
	});

	it("englishToThai card shows English and asks for Thai word", () => {
		const cards = generateVocabCards(mockEntry, [mockEntry]);
		const card = cards.find(c => c.property === "englishToThai")!;
		expect(card.question).toContain("at");
		expect(card.correctAnswer).toBe("ที่");
		expect(card.choices).toContain("ที่");
	});

	it("generates audioRecognition card when audio exists", () => {
		const entryWithAudio = { ...mockEntry, thai_audio_file: "/audio/test.mp3" };
		const cards = generateVocabCards(entryWithAudio, [entryWithAudio]);
		expect(cards).toHaveLength(3);
		expect(cards.find(c => c.property === "audioRecognition")).toBeDefined();
	});

	it("generates unique card IDs", () => {
		const cards = generateVocabCards(mockEntry, [mockEntry]);
		const ids = cards.map(c => c.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each card has choices containing the correct answer", () => {
		const cards = generateVocabCards(mockEntry, [mockEntry]);
		for (const card of cards) {
			expect(card.choices).toContain(card.correctAnswer);
		}
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/vocabulary-card-generator.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement vocabulary-card-generator.ts**

```typescript
import { createSrsData } from "./srs";
import type { VocabularyCard } from "./vocabulary-types";
import type { VocabEntry } from "./vocabulary-types";

function pickChoices(correct: string, pool: string[], count = 4): string[] {
	const distractors = pool.filter((item) => item !== correct);
	const needed = Math.min(count - 1, distractors.length);

	const copy = [...distractors];
	for (let i = copy.length - 1; i > copy.length - 1 - needed && i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	const picked = copy.slice(copy.length - needed);

	const choices = [...picked, correct];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[choices[i], choices[j]] = [choices[j]!, choices[i]!];
	}

	return choices;
}

export function generateVocabCards(
	entry: VocabEntry,
	allEntries: VocabEntry[],
): VocabularyCard[] {
	const englishPool = allEntries.map((e) => e.english);
	const thaiPool = allEntries.map((e) => e.thai);

	const cards: VocabularyCard[] = [];

	// Thai → English
	cards.push({
		id: `vocab:${entry.thai}:thaiToEnglish`,
		wordThai: entry.thai,
		property: "thaiToEnglish",
		question: `What does "${entry.thai}" mean?`,
		correctAnswer: entry.english,
		choices: pickChoices(entry.english, englishPool),
		srs: createSrsData(),
		audioUrl: entry.thai_audio_file ?? undefined,
	});

	// English → Thai
	cards.push({
		id: `vocab:${entry.thai}:englishToThai`,
		wordThai: entry.thai,
		property: "englishToThai",
		question: `Which Thai word means "${entry.english}"?`,
		correctAnswer: entry.thai,
		choices: pickChoices(entry.thai, thaiPool),
		srs: createSrsData(),
		audioUrl: entry.thai_audio_file ?? undefined,
	});

	// Audio recognition (only when audio exists)
	if (entry.thai_audio_file) {
		cards.push({
			id: `vocab:${entry.thai}:audioRecognition`,
			wordThai: entry.thai,
			property: "audioRecognition",
			question: "Listen to the audio. Which word is this?",
			correctAnswer: entry.thai,
			choices: pickChoices(entry.thai, thaiPool),
			srs: createSrsData(),
			audioUrl: entry.thai_audio_file,
		});
	}

	return cards;
}
```

**Step 4: Run tests**

Run: `npx vitest run src/vocabulary-card-generator.test.ts`
Expected: All pass.

**Step 5: Commit**

```bash
git add src/vocabulary-card-generator.ts src/vocabulary-card-generator.test.ts
git commit -m "feat: add vocabulary card generator"
```

---

### Task 6: Create VocabularyService

**Files:**
- Create: `src/vocabulary-service.ts`
- Create: `src/vocabulary-service.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { VocabularyService } from "./vocabulary-service";
import { InMemoryStorage } from "./storage";
import type { VocabEntry } from "./vocabulary-types";

const mockVocab: VocabEntry[] = [
	{
		thai: "มา",
		romanization: "maa",
		word_class: "v",
		english: "come",
		rank: 10,
		frequency: 100000,
		mnemonic: null,
		characters: ["ม", "า"],
		syllables: [{ text: "มา", initialConsonant: "ม", vowel: "า", finalConsonant: null, toneMark: null, consonantClass: "low", syllableType: "live", tone: "mid" }],
		toneRules: ["low-live"],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
	},
	{
		thai: "นา",
		romanization: "naa",
		word_class: "n",
		english: "field",
		rank: 50,
		frequency: 50000,
		mnemonic: null,
		characters: ["น", "า"],
		syllables: [{ text: "นา", initialConsonant: "น", vowel: "า", finalConsonant: null, toneMark: null, consonantClass: "low", syllableType: "live", tone: "mid" }],
		toneRules: ["low-live"],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
	},
];

describe("VocabularyService", () => {
	let storage: InMemoryStorage;
	let service: VocabularyService;

	beforeEach(() => {
		storage = new InMemoryStorage();
		service = new VocabularyService(storage, mockVocab);
	});

	it("returns no unlocked words when no lessons completed", () => {
		expect(service.getUnlockedWords()).toHaveLength(0);
	});

	it("unlocks words when all characters and tone rules are mastered", () => {
		const state = storage.load();
		state.completedLessons = [1, 2]; // lesson 1 has ม, น, า; lesson 2 has tone rule low-live
		storage.save(state);
		expect(service.getUnlockedWords()).toHaveLength(2);
	});

	it("returns unlearned words sorted by rank", () => {
		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);
		const words = service.getUnlearnedWords();
		expect(words[0]!.thai).toBe("มา"); // rank 10
		expect(words[1]!.thai).toBe("นา"); // rank 50
	});

	it("getNextLesson returns batch of up to 5 words", () => {
		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);
		const lesson = service.getNextLesson();
		expect(lesson).not.toBeNull();
		expect(lesson!.words.length).toBeLessThanOrEqual(5);
		expect(lesson!.words.length).toBe(2); // only 2 words available
	});

	it("getNextLesson excludes already-learned words", () => {
		const state = storage.load();
		state.completedLessons = [1, 2];
		state.vocabCards["vocab:มา:thaiToEnglish"] = {
			id: "vocab:มา:thaiToEnglish",
			wordThai: "มา",
			property: "thaiToEnglish",
			question: 'What does "มา" mean?',
			correctAnswer: "come",
			choices: ["come", "field"],
			srs: { easeFactor: 2.0, interval: 10, repetitions: 0, learningStep: 1, nextReviewDate: new Date().toISOString(), lastReviewDate: null },
		};
		storage.save(state);
		const lesson = service.getNextLesson();
		expect(lesson!.words).toHaveLength(1);
		expect(lesson!.words[0]!.thai).toBe("นา");
	});

	it("getNextLesson returns null when no unlearned words", () => {
		expect(service.getNextLesson()).toBeNull();
	});

	it("startLesson generates cards and saves them", () => {
		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);
		const cards = service.startLesson();
		expect(cards.length).toBeGreaterThan(0);
		const saved = storage.load();
		expect(Object.keys(saved.vocabCards).length).toBeGreaterThan(0);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/vocabulary-service.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement VocabularyService**

```typescript
import { generateVocabCards } from "./vocabulary-card-generator";
import {
	consonants,
	toneMarkRules,
	toneMarks,
	toneRules,
	vowels,
} from "./symbol";
import type { IStorage } from "./storage";
import type { VocabEntry, VocabLessonSummary, VocabularyCard } from "./vocabulary-types";

const BATCH_SIZE = 5;

export class VocabularyService {
	constructor(
		private readonly storage: IStorage,
		private readonly vocabulary: VocabEntry[],
	) {}

	/** Get set of all Thai characters mastered from completed script lessons. */
	private getMasteredCharacters(): Set<string> {
		const state = this.storage.load();
		const chars = new Set<string>();

		for (const sym of consonants) {
			if (sym.lesson != null && state.completedLessons.includes(sym.lesson)) {
				chars.add(sym.character);
			}
		}
		for (const sym of vowels) {
			if (sym.lesson != null && state.completedLessons.includes(sym.lesson)) {
				// Add all individual codepoints of the vowel character
				for (const ch of sym.character) {
					if ("\u0e00" <= ch && ch <= "\u0e7f") {
						chars.add(ch);
					}
				}
			}
		}
		for (const sym of toneMarks) {
			if (sym.lesson != null && state.completedLessons.includes(sym.lesson)) {
				chars.add(sym.character);
			}
		}

		return chars;
	}

	/** Get set of all tone rule IDs mastered from completed script lessons. */
	private getMasteredToneRules(): Set<string> {
		const state = this.storage.load();
		const rules = new Set<string>();

		for (const rule of toneRules) {
			if (state.completedLessons.includes(rule.lesson)) {
				rules.add(rule.id);
			}
		}

		// Tone mark rules: build ID as "{class}-{markNameNormalized}"
		const markNameMap: Record<string, string> = {
			"mai ek": "mayek",
			"mai tho": "maytho",
			"mai tri": "maytri",
			"mai chattawa": "mayjattawa",
		};

		for (const rule of toneMarkRules) {
			if (state.completedLessons.includes(rule.lesson)) {
				const markId = markNameMap[rule.toneMarkName];
				if (markId) {
					rules.add(`${rule.consonantClass}-${markId}`);
				}
			}
		}

		return rules;
	}

	/** All words whose characters and tone rules are fully mastered. */
	getUnlockedWords(): VocabEntry[] {
		const chars = this.getMasteredCharacters();
		const rules = this.getMasteredToneRules();

		return this.vocabulary.filter((entry) => {
			const allCharsMastered = entry.characters.every((ch) => chars.has(ch));
			const allRulesMastered = entry.toneRules.every((r) => rules.has(r));
			return allCharsMastered && allRulesMastered;
		});
	}

	/** Unlocked words that don't yet have cards generated. Sorted by rank. */
	getUnlearnedWords(): VocabEntry[] {
		const state = this.storage.load();
		const learnedThaiWords = new Set(
			Object.values(state.vocabCards).map((c) => c.wordThai),
		);

		return this.getUnlockedWords()
			.filter((e) => !learnedThaiWords.has(e.thai))
			.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
	}

	/** Next batch of words to learn (up to BATCH_SIZE). */
	getNextLesson(): VocabLessonSummary | null {
		const words = this.getUnlearnedWords();
		if (words.length === 0) return null;
		return { words: words.slice(0, BATCH_SIZE) };
	}

	/** Generate cards for the next lesson batch and save to storage. */
	startLesson(): VocabularyCard[] {
		const lesson = this.getNextLesson();
		if (!lesson) throw new Error("No vocabulary words available to learn");

		const allUnlocked = this.getUnlockedWords();
		const cards = lesson.words.flatMap((entry) =>
			generateVocabCards(entry, allUnlocked),
		);

		const state = this.storage.load();
		for (const card of cards) {
			state.vocabCards[card.id] = card;
		}
		this.storage.save(state);

		return cards;
	}

	/** Count of unlocked (including learned) words. */
	getUnlockedCount(): number {
		return this.getUnlockedWords().length;
	}

	/** Count of words that have cards generated. */
	getLearnedCount(): number {
		const state = this.storage.load();
		return new Set(Object.values(state.vocabCards).map((c) => c.wordThai)).size;
	}
}
```

**Step 4: Run tests**

Run: `npx vitest run src/vocabulary-service.test.ts`
Expected: All pass.

**Step 5: Run full test suite and lint**

Run: `npx vitest run && npx biome check src/`
Expected: All pass.

**Step 6: Commit**

```bash
git add src/vocabulary-service.ts src/vocabulary-service.test.ts
git commit -m "feat: add VocabularyService with unlock logic and dynamic lessons"
```

---

## Phase 4: UI — Components and Pages

### Task 7: Create WordCard component

**Files:**
- Create: `src/components/WordCard.tsx`

**Step 1: Implement WordCard**

```typescript
import type { VocabEntry } from "../vocabulary-types";

function SyllableBreakdown({ entry }: { entry: VocabEntry }) {
	if (entry.syllables.length === 0) return null;

	return (
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
			<h3 className="text-xs font-semibold text-gray-500 uppercase">
				Syllable Breakdown
			</h3>
			{entry.syllables.map((syl, i) => (
				<div
					key={`${syl.text}-${i}`}
					className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
				>
					<span className="thai text-lg">{syl.text}</span>
					<div className="flex gap-2 text-xs">
						{syl.consonantClass && (
							<span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
								{syl.consonantClass}
							</span>
						)}
						{syl.syllableType && (
							<span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
								{syl.syllableType}
							</span>
						)}
						{syl.tone && (
							<span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
								{syl.tone}
							</span>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

export function WordCard({ entry }: { entry: VocabEntry }) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<span className="thai text-[72px] leading-none">{entry.thai}</span>
				{entry.thai_audio_file && (
					<button
						onClick={() => new Audio(entry.thai_audio_file!).play()}
						className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
						aria-label="Play pronunciation"
					>
						🔊
					</button>
				)}
				<h2 className="text-2xl font-semibold mt-2">{entry.english}</h2>
				<p className="text-sm text-gray-400">{entry.romanization}</p>
				{entry.word_class && (
					<span className="text-xs text-gray-400 italic">{entry.word_class}</span>
				)}
			</div>

			<SyllableBreakdown entry={entry} />

			{entry.mnemonic && (
				<div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
					<p className="text-sm text-amber-800 dark:text-amber-300">
						💡 {entry.mnemonic}
					</p>
				</div>
			)}
		</div>
	);
}
```

**Step 2: Run build to verify**

Run: `pnpm build`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/WordCard.tsx
git commit -m "feat: add WordCard component for vocabulary lesson intro"
```

---

### Task 8: Wire VocabularyService into AppContext

**Files:**
- Modify: `src/context/AppContext.tsx`
- Modify: `src/hooks/useApp.ts`

**Step 1: Import and instantiate VocabularyService**

In `AppContext.tsx`, add:
```typescript
import vocabularyData from "../vocabulary.json";
import { VocabularyService } from "../vocabulary-service";
import type { VocabEntry, VocabLessonSummary, VocabularyCard } from "../vocabulary-types";

const vocabularyService = new VocabularyService(storage, vocabularyData as VocabEntry[]);
```

**Step 2: Extend AppContextValue**

Add to the interface:
```typescript
// Vocabulary operations
getUnlockedWords: () => VocabEntry[];
getUnlearnedWords: () => VocabEntry[];
getNextVocabLesson: () => VocabLessonSummary | null;
startVocabLesson: () => VocabularyCard[];
getVocabUnlockedCount: () => number;
getVocabLearnedCount: () => number;
getNumDueVocabCards: () => number;
recordVocabReview: (cardId: string, rating: RecallRating, timing?: { responseTimeMs: number; averageResponseTimeMs: number }) => void;
startVocabReviewSession: (maxCards?: number) => ActiveReviewSession;
endVocabReviewSession: (session: ActiveReviewSession) => SessionSummary;
```

**Step 3: Wire into value object**

Add to the useMemo value:
```typescript
getUnlockedWords: () => vocabularyService.getUnlockedWords(),
getUnlearnedWords: () => vocabularyService.getUnlearnedWords(),
getNextVocabLesson: () => vocabularyService.getNextLesson(),
startVocabLesson: () => wrap(() => vocabularyService.startLesson()),
getVocabUnlockedCount: () => vocabularyService.getUnlockedCount(),
getVocabLearnedCount: () => vocabularyService.getLearnedCount(),
getNumDueVocabCards: () => reviewService.getNumDueCards(undefined, "vocab"),
recordVocabReview: (cardId, rating, timing) =>
	wrap(() => reviewService.recordReview(cardId, rating, undefined, timing, "vocab")),
startVocabReviewSession: (maxCards) =>
	reviewService.startReviewSession(maxCards, undefined, "vocab"),
endVocabReviewSession: (session) =>
	wrap(() => reviewService.endReviewSession(session)),
```

**Step 4: Run build**

Run: `pnpm build`
Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add src/context/AppContext.tsx src/hooks/useApp.ts
git commit -m "feat: wire VocabularyService into AppContext"
```

---

### Task 9: Create VocabularyPage

**Files:**
- Create: `src/pages/VocabularyPage.tsx`

**Step 1: Implement the page**

The page has three phases: overview, lesson (intro → quiz → complete), and review.

```typescript
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { WordCard } from "../components/WordCard";
import { useApp } from "../hooks/useApp";
import type { ActiveReviewSession } from "../review-service";
import type { RecallRating } from "../types";
import type { VocabEntry, VocabularyCard } from "../vocabulary-types";

type Phase = "overview" | "intro" | "quiz" | "complete" | "review";

function VocabIntro({
	words,
	onComplete,
}: {
	words: VocabEntry[];
	onComplete: () => void;
}) {
	const [idx, setIdx] = useState(0);
	const current = words[idx];
	const isLast = idx === words.length - 1;

	const advance = useCallback(() => {
		if (isLast) onComplete();
		else setIdx((i) => i + 1);
	}, [isLast, onComplete]);

	const goBack = useCallback(() => {
		if (idx > 0) setIdx((i) => i - 1);
	}, [idx]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				advance();
			} else if (e.key === "ArrowLeft" || e.key === "Backspace") {
				e.preventDefault();
				goBack();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [advance, goBack]);

	if (!current) return null;

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center text-sm text-gray-500">
				<span>
					{idx + 1} / {words.length}
				</span>
				<span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
					vocabulary
				</span>
			</div>
			<div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full">
				<div
					className="h-full bg-emerald-600 rounded-full transition-all"
					style={{ width: `${((idx + 1) / words.length) * 100}%` }}
				/>
			</div>
			<WordCard entry={current} />
			<div className="flex gap-3">
				{idx > 0 && (
					<button
						onClick={goBack}
						className="py-3 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors"
					>
						Back
					</button>
				)}
				<button
					onClick={advance}
					className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
				>
					{isLast ? "Start Quiz" : "Next"}
				</button>
			</div>
		</div>
	);
}

export function VocabularyPage() {
	const app = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonWords, setLessonWords] = useState<VocabEntry[]>([]);
	const [cards, setCards] = useState<VocabularyCard[]>([]);
	const [cardIdx, setCardIdx] = useState(0);
	const [correct, setCorrect] = useState(0);
	const [incorrect, setIncorrect] = useState(0);

	// Review state
	const [session, setSession] = useState<ActiveReviewSession | null>(null);
	const sessionRef = useRef<ActiveReviewSession | null>(null);

	const nextLesson = app.getNextVocabLesson();
	const unlockedCount = app.getVocabUnlockedCount();
	const learnedCount = app.getVocabLearnedCount();
	const dueVocabCards = app.getNumDueVocabCards();

	const handleStartLesson = () => {
		if (!nextLesson) return;
		setLessonWords(nextLesson.words);
		setPhase("intro");
	};

	const handleIntroComplete = () => {
		const generated = app.startVocabLesson();
		setCards(generated);
		setCardIdx(0);
		setCorrect(0);
		setIncorrect(0);
		setPhase("quiz");
	};

	const handleAnswer = (isCorrect: boolean) => {
		if (isCorrect) setCorrect((c) => c + 1);
		else setIncorrect((c) => c + 1);

		if (cardIdx + 1 < cards.length) {
			setCardIdx((i) => i + 1);
		} else {
			setPhase("complete");
		}
	};

	const handleStartReview = () => {
		const s = app.startVocabReviewSession();
		if (s.cards.length === 0) return;
		sessionRef.current = s;
		setSession(s);
		setCardIdx(0);
		setPhase("review");
	};

	const handleReviewAdvance = useCallback(
		(rating: RecallRating) => {
			if (!session || !sessionRef.current) return;
			const current = session.cards[cardIdx];
			if (!current) return;

			app.recordVocabReview(current.card.id, rating);
			sessionRef.current.results.push({ cardId: current.card.id, rating });

			if (cardIdx + 1 < session.cards.length) {
				setCardIdx((i) => i + 1);
			} else {
				app.endVocabReviewSession(sessionRef.current);
				setPhase("overview");
				setSession(null);
			}
		},
		[app, session, cardIdx],
	);

	const handleMcAnswer = useCallback(
		(isCorrect: boolean) => {
			handleReviewAdvance(isCorrect ? 4 : 2);
		},
		[handleReviewAdvance],
	);

	// Overview
	if (phase === "overview") {
		return (
			<div className="space-y-8 py-4">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Vocabulary</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
						Learn Thai words unlocked by your script mastery
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{unlockedCount}</div>
						<div className="text-xs text-gray-500 mt-1">Unlocked</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{learnedCount}</div>
						<div className="text-xs text-gray-500 mt-1">Learned</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold text-orange-500">{dueVocabCards}</div>
						<div className="text-xs text-gray-500 mt-1">Due</div>
					</div>
				</div>

				<div className="space-y-3">
					{nextLesson && (
						<div>
							<button
								onClick={handleStartLesson}
								className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-semibold transition-colors"
							>
								Learn {nextLesson.words.length} New Words
							</button>
							<div className="mt-2 flex flex-wrap gap-2 justify-center">
								{nextLesson.words.map((w) => (
									<span
										key={w.thai}
										className="thai text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
									>
										{w.thai} — {w.english}
									</span>
								))}
							</div>
						</div>
					)}

					{!nextLesson && unlockedCount === 0 && (
						<p className="text-center text-gray-500">
							Complete more script lessons to unlock vocabulary words.
						</p>
					)}

					{!nextLesson && unlockedCount > 0 && learnedCount === unlockedCount && (
						<p className="text-center text-green-600 dark:text-green-400 font-semibold">
							All unlocked words learned! Complete more script lessons to unlock more.
						</p>
					)}

					{dueVocabCards > 0 && (
						<button
							onClick={handleStartReview}
							className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors"
						>
							Review {dueVocabCards} Due Words
						</button>
					)}
				</div>
			</div>
		);
	}

	// Intro
	if (phase === "intro") {
		return (
			<div>
				<h1 className="text-xl font-bold mb-1">New Vocabulary</h1>
				<p className="text-sm text-gray-500 mb-6">
					{lessonWords.length} words to learn
				</p>
				<VocabIntro words={lessonWords} onComplete={handleIntroComplete} />
			</div>
		);
	}

	// Quiz
	if (phase === "quiz" && cards[cardIdx]) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-lg font-bold">Vocabulary Quiz</h1>
					<span className="text-sm text-gray-500">
						{cardIdx + 1} / {cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-emerald-600 rounded-full transition-all"
						style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}
					/>
				</div>
				<MultipleChoice card={cards[cardIdx]!} onAnswer={handleAnswer} />
			</div>
		);
	}

	// Complete
	if (phase === "complete") {
		const total = correct + incorrect;
		const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

		return (
			<div className="text-center space-y-6 py-8">
				<div className="text-6xl">
					{accuracy >= 80 ? "🎉" : accuracy >= 50 ? "💪" : "📚"}
				</div>
				<h1 className="text-2xl font-bold">Words Learned!</h1>
				<div className="grid grid-cols-3 gap-4">
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{total}</div>
						<div className="text-xs text-gray-500">Cards</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold text-green-600">{correct}</div>
						<div className="text-xs text-gray-500">Correct</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{accuracy}%</div>
						<div className="text-xs text-gray-500">Accuracy</div>
					</div>
				</div>
				<div className="space-y-3">
					<button
						onClick={() => setPhase("overview")}
						className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
					>
						Back to Vocabulary
					</button>
					<button
						onClick={() => navigate("/")}
						className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
					>
						Back to Home
					</button>
				</div>
			</div>
		);
	}

	// Review
	if (phase === "review" && session) {
		const current = session.cards[cardIdx];
		if (!current) return null;

		return (
			<div>
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-lg font-bold">Vocabulary Review</h1>
					<span className="text-sm text-gray-500">
						{cardIdx + 1} / {session.cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-orange-500 rounded-full transition-all"
						style={{
							width: `${((cardIdx + 1) / session.cards.length) * 100}%`,
						}}
					/>
				</div>
				{current.mode === "multipleChoice" ? (
					<MultipleChoice card={current.card} onAnswer={handleMcAnswer} />
				) : (
					<Flashcard card={current.card} onRate={handleReviewAdvance} />
				)}
			</div>
		);
	}

	return null;
}
```

Note: This component uses `useRef` — add it to the import. Also, `MultipleChoice` and `Flashcard` currently accept `PropertyCard` — since `VocabularyCard` extends `SrsCard` (not `PropertyCard`), we need to update those components to accept `SrsCard`. This is addressed in Task 10.

**Step 2: Run build**

Run: `pnpm build`
Expected: May fail if component prop types need updating — handle in Task 10.

**Step 3: Commit**

```bash
git add src/pages/VocabularyPage.tsx
git commit -m "feat: add VocabularyPage with lesson and review flows"
```

---

### Task 10: Update quiz components to accept SrsCard

**Files:**
- Modify: `src/components/MultipleChoice.tsx`
- Modify: `src/components/Flashcard.tsx`
- Modify: `src/types.ts` (QuizCard)

**Step 1: Update MultipleChoice props**

Change the Props interface from `PropertyCard` to `SrsCard`:
```typescript
import type { SrsCard } from "../types";

interface Props {
	card: SrsCard;
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}
```

The `hideAudioHint` logic checks `card.property` — this field exists on both `PropertyCard` and `VocabularyCard` but not on `SrsCard`. We need to handle this by checking if the property exists:

```typescript
const hideAudioHint = "property" in card &&
	(card.property === "recognition" || card.property === "initialSound");
const isAudioRecognition = "property" in card && card.property === "audioRecognition";
```

Similarly for the Thai character detection in choices (`hasThaiChar` already works generically).

**Step 2: Update Flashcard props**

Same change — accept `SrsCard` instead of `PropertyCard`.

**Step 3: Update QuizCard type**

```typescript
export interface QuizCard {
	card: SrsCard;
	mode: QuizMode;
}
```

**Step 4: Run full test suite and build**

Run: `npx vitest run && pnpm build`
Expected: All pass.

**Step 5: Commit**

```bash
git add src/components/MultipleChoice.tsx src/components/Flashcard.tsx src/types.ts
git commit -m "refactor: update quiz components to accept generic SrsCard"
```

---

### Task 11: Add route and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Step 1: Add route**

In `App.tsx`, add import and route:
```typescript
import { VocabularyPage } from "./pages/VocabularyPage";

// Inside Routes:
<Route path="/vocabulary" element={<VocabularyPage />} />
```

**Step 2: Add nav item**

In `Layout.tsx`, add to navItems:
```typescript
{ to: "/vocabulary", label: "Vocab" },
```

**Step 3: Run build**

Run: `pnpm build`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat: add /vocabulary route and nav item"
```

---

### Task 12: Add vocabulary section to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Add vocab stats**

After the existing review button section, add a vocabulary section:

```typescript
{/* Vocabulary */}
<div className="border-t border-gray-200 dark:border-gray-800 pt-6">
	<h2 className="text-sm font-semibold text-gray-500 mb-3">Vocabulary</h2>
	<div className="grid grid-cols-3 gap-4 text-center mb-3">
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
			<div className="text-lg font-bold">{app.getVocabUnlockedCount()}</div>
			<div className="text-[10px] text-gray-500">Unlocked</div>
		</div>
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
			<div className="text-lg font-bold">{app.getVocabLearnedCount()}</div>
			<div className="text-[10px] text-gray-500">Learned</div>
		</div>
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
			<div className="text-lg font-bold text-orange-500">{app.getNumDueVocabCards()}</div>
			<div className="text-[10px] text-gray-500">Due</div>
		</div>
	</div>
	<button
		onClick={() => navigate("/vocabulary")}
		className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
	>
		Go to Vocabulary
	</button>
</div>
```

**Step 2: Run build**

Run: `pnpm build`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add vocabulary stats section to Dashboard"
```

---

## Phase 5: Verification

### Task 13: Full verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 2: Run build**

Run: `pnpm build`
Expected: No TypeScript errors.

**Step 3: Run lint**

Run: `npx biome check src/`
Expected: No errors.

**Step 4: Code review**

Use superpowers:requesting-code-review to validate:
- SrsCard extraction doesn't break existing functionality
- VocabularyService unlock logic is correct
- Storage backwards compatibility works
- No dead code introduced

**Step 5: Final commit**

If any fixes needed from review, commit them:
```bash
git add -A
git commit -m "fix: address code review feedback for vocabulary feature"
```
