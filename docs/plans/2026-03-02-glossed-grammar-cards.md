# Glossed Grammar Application Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Grammar application quiz choices show Thai with inline English glosses (e.g., `เขา(he) กิน(eat) ข้าว(rice)`) so learners can evaluate word order patterns.

**Architecture:** Add `GlossedWord` and `GlossedPhrase` types. Update `GrammarEntry` to use structured word arrays for application card data. The card generator formats these into display strings at card creation time. No UI changes needed.

**Tech Stack:** TypeScript, Vitest

**Design doc:** `docs/plans/2026-03-02-glossed-grammar-cards-design.md`

---

### Task 1: Add GlossedWord and GlossedPhrase types

**Files:**
- Modify: `src/domain/grammar/types.ts:1-31`

**Step 1: Write the new types and update GrammarEntry**

Add these types before `GrammarEntry` and update the interface:

```typescript
import type { SrsCard } from "../shared/types";

export interface GlossedWord {
	thai: string;
	gloss: string;
}

export interface GlossedPhrase {
	words: GlossedWord[];
}

export interface GrammarEntry {
	id: string;
	title: string;
	explanation: string;
	pattern: string;
	lessonNumber: number;
	prerequisites: {
		minVocabByClass: Record<string, number>;
		minTotalVocab?: number;
	};
	examples: Array<{
		thai: string;
		romanization: string;
		english: string;
		breakdown?: string;
		words?: GlossedWord[];
	}>;
	cards: {
		recognition: {
			question: string;
			correctAnswer: string;
			distractors: string[];
		};
		application: {
			question: string;
			correctExample: number;
			incorrectExamples: GlossedPhrase[];
		};
	};
}
```

**Step 2: Run type check to see what breaks**

Run: `pnpm tsc --noEmit`
Expected: Errors in `GrammarCardGenerator.ts` (spreading `GlossedPhrase[]` where `string[]` expected) and `GrammarCardGenerator.test.ts` (test fixture uses `string[]` for incorrectExamples). This is expected — we fix these in Tasks 2 and 3.

**Step 3: Commit**

```bash
git add src/domain/grammar/types.ts
git commit -m "feat(grammar): add GlossedWord/GlossedPhrase types and update GrammarEntry"
```

---

### Task 2: Update card generator to format glossed choices

**Files:**
- Modify: `src/domain/grammar/services/GrammarCardGenerator.ts:1-43`

**Step 1: Write the failing test**

Update the test fixture in `src/domain/grammar/services/GrammarCardGenerator.test.ts` to use the new `GlossedPhrase` format, then add a test for the glossed output:

Replace the `makeGrammarEntry` function and update tests:

```typescript
import { describe, expect, it } from "vitest";
import type { GrammarEntry } from "../types";
import { generateGrammarCards } from "./GrammarCardGenerator";

function makeGrammarEntry(overrides?: Partial<GrammarEntry>): GrammarEntry {
	return {
		id: "svo-basic",
		title: "Basic SVO",
		explanation: "Thai follows Subject-Verb-Object order",
		pattern: "[Subject] [Verb] [Object]",
		lessonNumber: 1,
		prerequisites: { minVocabByClass: { n: 2, v: 2 } },
		examples: [
			{
				thai: "เขากินข้าว",
				romanization: "khao gin khao",
				english: "He eats rice",
				breakdown: "เขา (he) + กิน (eat) + ข้าว (rice)",
				words: [
					{ thai: "เขา", gloss: "he" },
					{ thai: "กิน", gloss: "eat" },
					{ thai: "ข้าว", gloss: "rice" },
				],
			},
			{
				thai: "ฉันดื่มน้ำ",
				romanization: "chan duem nam",
				english: "I drink water",
			},
		],
		cards: {
			recognition: {
				question: "What does the SVO pattern express?",
				correctAnswer: "Subject performing action on object",
				distractors: [
					"Object receiving action from subject",
					"A question about the subject",
					"A description of the subject",
				],
			},
			application: {
				question: "Which sentence correctly uses SVO order?",
				correctExample: 0,
				incorrectExamples: [
					{
						words: [
							{ thai: "ข้าว", gloss: "rice" },
							{ thai: "กิน", gloss: "eat" },
							{ thai: "เขา", gloss: "he" },
						],
					},
					{
						words: [
							{ thai: "กิน", gloss: "eat" },
							{ thai: "เขา", gloss: "he" },
							{ thai: "ข้าว", gloss: "rice" },
						],
					},
					{
						words: [
							{ thai: "เขา", gloss: "he" },
							{ thai: "ข้าว", gloss: "rice" },
							{ thai: "กิน", gloss: "eat" },
						],
					},
				],
			},
		},
		...overrides,
	};
}

describe("generateGrammarCards", () => {
	it("generates exactly 2 cards per grammar entry", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		expect(cards).toHaveLength(2);
	});

	it("generates a recognition card with correct ID format", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const recognition = cards.find(
			(c) => c.property === "recognition",
		) as NonNullable<(typeof cards)[number]>;
		expect(recognition.id).toBe("grammar:svo-basic:recognition");
		expect(recognition.grammarId).toBe("svo-basic");
		expect(recognition.question).toBe("What does the SVO pattern express?");
		expect(recognition.correctAnswer).toBe(
			"Subject performing action on object",
		);
	});

	it("generates an application card with glossed correct answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find(
			(c) => c.property === "application",
		) as NonNullable<(typeof cards)[number]>;
		expect(application.id).toBe("grammar:svo-basic:application");
		expect(application.grammarId).toBe("svo-basic");
		expect(application.correctAnswer).toBe("เขา(he) กิน(eat) ข้าว(rice)");
	});

	it("recognition card has 4 choices including correct answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const recognition = cards.find(
			(c) => c.property === "recognition",
		) as NonNullable<(typeof cards)[number]>;
		expect(recognition.choices).toHaveLength(4);
		expect(recognition.choices).toContain(
			"Subject performing action on object",
		);
	});

	it("application card has 4 glossed choices including correct example", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find(
			(c) => c.property === "application",
		) as NonNullable<(typeof cards)[number]>;
		expect(application.choices).toHaveLength(4);
		expect(application.choices).toContain("เขา(he) กิน(eat) ข้าว(rice)");
		expect(application.choices).toContain("ข้าว(rice) กิน(eat) เขา(he)");
		expect(application.choices).toContain("กิน(eat) เขา(he) ข้าว(rice)");
		expect(application.choices).toContain("เขา(he) ข้าว(rice) กิน(eat)");
	});

	it("cards have initialized SRS data", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		for (const card of cards) {
			expect(card.srs.easeFactor).toBe(2.5);
			expect(card.srs.learningStep).toBe(1);
			expect(card.srs.lapseCount).toBe(0);
		}
	});
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/domain/grammar/services/GrammarCardGenerator.test.ts`
Expected: FAIL — application card `correctAnswer` is still `"เขากินข้าว"` (plain Thai) instead of `"เขา(he) กิน(eat) ข้าว(rice)"` (glossed).

**Step 3: Update the card generator**

Replace `src/domain/grammar/services/GrammarCardGenerator.ts` with:

```typescript
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { GlossedWord, GrammarCard, GrammarEntry } from "../types";

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

function formatGlossed(words: GlossedWord[]): string {
	return words.map((w) => `${w.thai}(${w.gloss})`).join(" ");
}

export function generateGrammarCards(entry: GrammarEntry): GrammarCard[] {
	const recognition: GrammarCard = {
		id: `grammar:${entry.id}:recognition`,
		grammarId: entry.id,
		property: "recognition",
		question: entry.cards.recognition.question,
		correctAnswer: entry.cards.recognition.correctAnswer,
		choices: shuffle([
			entry.cards.recognition.correctAnswer,
			...entry.cards.recognition.distractors,
		]),
		srs: SrsSchedule.initial().toDTO(),
	};

	const correctExample = entry.examples[entry.cards.application.correctExample];
	const correctAnswer = correctExample?.words
		? formatGlossed(correctExample.words)
		: correctExample?.thai;

	const incorrectChoices = entry.cards.application.incorrectExamples.map(
		(ex) => formatGlossed(ex.words),
	);

	const application: GrammarCard = {
		id: `grammar:${entry.id}:application`,
		grammarId: entry.id,
		property: "application",
		question: entry.cards.application.question,
		correctAnswer: correctAnswer,
		choices: shuffle([correctAnswer, ...incorrectChoices]),
		srs: SrsSchedule.initial().toDTO(),
	};

	return [recognition, application];
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/domain/grammar/services/GrammarCardGenerator.test.ts`
Expected: All 6 tests PASS.

**Step 5: Commit**

```bash
git add src/domain/grammar/services/GrammarCardGenerator.ts src/domain/grammar/services/GrammarCardGenerator.test.ts
git commit -m "feat(grammar): generate glossed application card choices"
```

---

### Task 3: Update grammar.json data

**Files:**
- Modify: `src/domain/grammar/data/grammar.json`

This is the largest task — update all 15 grammar entries to:
1. Add `words` array to the example referenced by `correctExample`
2. Convert each `incorrectExamples` entry from a string to a `GlossedPhrase` object

**Step 1: Update the JSON data**

For each grammar entry, apply this transformation pattern:

**Before (e.g., svo-basic):**
```json
"correctExample": 0,
"incorrectExamples": ["ข้าวกินเขา", "กินเขาข้าว", "ข้าวเขากิน"]
```

**After:**
```json
"correctExample": 0,
"incorrectExamples": [
  { "words": [{ "thai": "ข้าว", "gloss": "rice" }, { "thai": "กิน", "gloss": "eat" }, { "thai": "เขา", "gloss": "he" }] },
  { "words": [{ "thai": "กิน", "gloss": "eat" }, { "thai": "เขา", "gloss": "he" }, { "thai": "ข้าว", "gloss": "rice" }] },
  { "words": [{ "thai": "ข้าว", "gloss": "rice" }, { "thai": "เขา", "gloss": "he" }, { "thai": "กิน", "gloss": "eat" }] }
]
```

And add `words` to the correct example (examples[0] for most entries):
```json
"words": [
  { "thai": "เขา", "gloss": "he" },
  { "thai": "กิน", "gloss": "eat" },
  { "thai": "ข้าว", "gloss": "rice" }
]
```

Do this for all 15 entries. Use the existing `breakdown` fields and Thai text to determine the correct word segmentation and glosses.

**Complete list of entries to update:**
1. `svo-basic` (lesson 1)
2. `question-mai` (lesson 2)
3. `negation-mai` (lesson 3)
4. `adj-predicate` (lesson 4)
5. `possession-khong` (lesson 5)
6. `classifiers` (lesson 6)
7. `location` (lesson 7)
8. `want-need` (lesson 8)
9. `past-laew` (lesson 9)
10. `future-ja` (lesson 10)
11. `progressive-kamlang` (lesson 11)
12. `comparative-kwaa` (lesson 12)
13. `because-so` (lesson 13)
14. `can-able` (lesson 14)
15. `polite-particles` (lesson 15)

**Step 2: Run tests**

Run: `pnpm vitest run src/domain/grammar/services/GrammarCardGenerator.test.ts`
Expected: All tests PASS.

**Step 3: Run type check**

Run: `pnpm tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/domain/grammar/data/grammar.json
git commit -m "feat(grammar): add glossed words to all grammar entries"
```

---

### Task 4: Run full test suite and lint

**Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests PASS.

**Step 2: Run linting and formatting**

Run: `pnpm biome check --write .`
Expected: No errors remaining.

**Step 3: Final commit if any formatting changes**

```bash
git add -A
git commit -m "style: apply formatting fixes"
```
