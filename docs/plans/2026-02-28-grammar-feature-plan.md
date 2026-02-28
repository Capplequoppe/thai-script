# Grammar Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add grammar as a third learning pillar gated by vocabulary mastery, with its own card pool, service layer, and dedicated UI page.

**Architecture:** Mirrors the vocabulary pillar — GrammarService handles unlocking/progression, grammar-card-generator creates SRS cards, ReviewService gains a `"grammar"` pool. GrammarPage follows the same 5-phase flow (overview/intro/quiz/complete/review) as VocabularyPage.

**Tech Stack:** TypeScript, React, Vitest, Biome, localStorage persistence

**Design doc:** `docs/plans/2026-02-28-grammar-feature-design.md`

---

## Phase 1: Types, Data & Service Layer

### Task 1: Grammar Types

**Files:**
- Create: `src/grammar-types.ts`

**Step 1: Create the grammar types file**

```typescript
import type { SrsCard } from "./types";

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
			incorrectExamples: string[];
		};
	};
}

export interface GrammarCard extends SrsCard {
	grammarId: string;
	property: "recognition" | "application";
}

export interface GrammarLessonSummary {
	grammarPoints: GrammarEntry[];
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```
git add src/grammar-types.ts
git commit -m "feat(grammar): add grammar types"
```

---

### Task 2: Extend LearnerState & Storage

**Files:**
- Modify: `src/types.ts` — add `grammarCards` to `LearnerState` and `INITIAL_LEARNER_STATE`
- Modify: `src/storage.ts` — handle missing `grammarCards` in `LocalStorageAdapter.load()`
- Modify: `src/validation.ts` — no change needed (validation is permissive)
- Modify: `src/review-service.ts` — extend `CardPool` type, update `getCardRecord()`

**Step 1: Add grammarCards to LearnerState**

In `src/types.ts`, add `grammarCards` to `LearnerState` interface and initial state:

```typescript
// In LearnerState interface, after vocabCards:
grammarCards: Record<string, GrammarCard>;

// In INITIAL_LEARNER_STATE, after vocabCards:
grammarCards: {},
```

Add `GrammarCard` to the import from `./grammar-types`. Note: `types.ts` currently imports from `./symbol` and `./vocabulary-types`, so add:

```typescript
import type { GrammarCard } from "./grammar-types";
```

**Step 2: Handle missing grammarCards in storage**

In `src/storage.ts`, in `LocalStorageAdapter.load()`, after the existing `vocabCards` migration (line 56-58), add:

```typescript
if (!state.grammarCards) {
	state.grammarCards = {};
}
```

**Step 3: Extend CardPool and getCardRecord**

In `src/review-service.ts`, change `CardPool`:

```typescript
export type CardPool = "script" | "vocab" | "grammar";
```

Update `getCardRecord()`:

```typescript
private getCardRecord(
	state: LearnerState,
	pool: CardPool,
): Record<string, SrsCard> {
	switch (pool) {
		case "script": return state.cards;
		case "vocab": return state.vocabCards;
		case "grammar": return state.grammarCards;
	}
}
```

**Step 4: Run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all existing tests pass, no type errors

**Step 5: Commit**

```
git add src/types.ts src/storage.ts src/review-service.ts
git commit -m "feat(grammar): extend LearnerState and CardPool for grammar"
```

---

### Task 3: Update ApprenticeService & LeechService

**Files:**
- Modify: `src/apprentice-service.ts` — count grammar cards in apprentice stats
- Modify: `src/leech-service.ts` — add grammar branch in pool selection

**Step 1: Update ApprenticeService**

In `src/apprentice-service.ts`:

Update `ApprenticeStats` to include `grammar: number`.

Update `getApprenticeCount()` to also count grammar cards:

```typescript
for (const card of Object.values(state.grammarCards)) {
	if (card.srs.learningStep !== null) count++;
}
```

Update `getApprenticeStats()` to count grammar cards and include in result:

```typescript
let grammar = 0;
// ... in the loop:
for (const card of Object.values(state.grammarCards)) {
	if (card.srs.learningStep !== null) grammar++;
}
const count = script + vocab + grammar;
return { count, limit: this.limit, isAtLimit: count >= this.limit, script, vocab, grammar };
```

**Step 2: Update LeechService**

In `src/leech-service.ts`, update `getLeechCards()` pool selection to handle `"grammar"`:

```typescript
getLeechCards(pool?: CardPool): SrsCard[] {
	const state = this.storage.load();
	let cards: SrsCard[];
	switch (pool) {
		case "script":
			cards = Object.values(state.cards);
			break;
		case "vocab":
			cards = Object.values(state.vocabCards);
			break;
		case "grammar":
			cards = Object.values(state.grammarCards);
			break;
		default:
			cards = [
				...Object.values(state.cards),
				...Object.values(state.vocabCards),
				...Object.values(state.grammarCards),
			];
	}
	return cards.filter((card) => this.isLeech(card));
}
```

**Step 3: Run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass

**Step 4: Commit**

```
git add src/apprentice-service.ts src/leech-service.ts
git commit -m "feat(grammar): extend apprentice and leech services for grammar pool"
```

---

### Task 4: Grammar Card Generator

**Files:**
- Create: `src/grammar-card-generator.ts`
- Create: `src/grammar-card-generator.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { generateGrammarCards } from "./grammar-card-generator";
import type { GrammarEntry } from "./grammar-types";

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
				breakdown: "[เขา=he] [กิน=eat] [ข้าว=rice]",
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
				incorrectExamples: ["ข้าวกินเขา", "กินเขาข้าว", "เขาข้าวกิน"],
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
		const recognition = cards.find((c) => c.property === "recognition")!;
		expect(recognition.id).toBe("grammar:svo-basic:recognition");
		expect(recognition.grammarId).toBe("svo-basic");
		expect(recognition.question).toBe("What does the SVO pattern express?");
		expect(recognition.correctAnswer).toBe(
			"Subject performing action on object",
		);
	});

	it("generates an application card with correct example as answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find((c) => c.property === "application")!;
		expect(application.id).toBe("grammar:svo-basic:application");
		expect(application.grammarId).toBe("svo-basic");
		expect(application.correctAnswer).toBe("เขากินข้าว");
	});

	it("recognition card has 4 choices including correct answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const recognition = cards.find((c) => c.property === "recognition")!;
		expect(recognition.choices).toHaveLength(4);
		expect(recognition.choices).toContain(
			"Subject performing action on object",
		);
	});

	it("application card has 4 choices including correct example", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find((c) => c.property === "application")!;
		expect(application.choices).toHaveLength(4);
		expect(application.choices).toContain("เขากินข้าว");
	});

	it("cards have initialized SRS data", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		for (const card of cards) {
			expect(card.srs.easeFactor).toBe(2.0);
			expect(card.srs.learningStep).toBe(1);
			expect(card.srs.lapseCount).toBe(0);
		}
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/grammar-card-generator.test.ts`
Expected: FAIL — module not found

**Step 3: Implement grammar-card-generator.ts**

```typescript
import type { GrammarCard, GrammarEntry } from "./grammar-types";
import { createSrsData } from "./srs";

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
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
		srs: createSrsData(),
	};

	const correctSentence = entry.examples[entry.cards.application.correctExample]!.thai;
	const application: GrammarCard = {
		id: `grammar:${entry.id}:application`,
		grammarId: entry.id,
		property: "application",
		question: entry.cards.application.question,
		correctAnswer: correctSentence,
		choices: shuffle([
			correctSentence,
			...entry.cards.application.incorrectExamples,
		]),
		srs: createSrsData(),
	};

	return [recognition, application];
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/grammar-card-generator.test.ts`
Expected: all 6 tests PASS

**Step 5: Commit**

```
git add src/grammar-card-generator.ts src/grammar-card-generator.test.ts
git commit -m "feat(grammar): add grammar card generator with tests"
```

---

### Task 5: Grammar Data File

**Files:**
- Create: `src/grammar.json`

**Step 1: Create grammar.json with 15 grammar points**

Create `src/grammar.json` with all 15 grammar points. Each entry must conform to the `GrammarEntry` schema. Include 3-5 example sentences per grammar point, with Thai, romanization, English, and optional breakdown.

The grammar points in order:

1. `svo-basic` — Basic SVO (n:2, v:2)
2. `question-mai` — Yes/No Questions with ไหม (n:3, v:2)
3. `negation-mai` — Negation with ไม่ (n:3, v:3)
4. `adj-predicate` — Adjectives as Predicates (n:4, adj:2)
5. `possession-khong` — Possession with ของ (n:5)
6. `classifiers` — Classifiers (n:8)
7. `location` — Location with ที่/อยู่ (n:8, v:3)
8. `want-need` — Want/Need with อยาก/ต้องการ (v:5)
9. `past-laew` — Past with แล้ว (v:5, n:8)
10. `future-ja` — Future with จะ (v:6, n:8)
11. `progressive-kamlang` — Progressive with กำลัง (v:7)
12. `comparative-kwaa` — Comparatives with กว่า (adj:4, n:10)
13. `because-so` — Because/So with เพราะ/เลย (v:8, n:10)
14. `can-able` — Can/Able with ได้/เป็น (v:8)
15. `polite-particles` — Polite Particles ครับ/ค่ะ (n:5, v:3)

Each entry needs:
- `id`, `title`, `explanation`, `pattern`, `lessonNumber`
- `prerequisites.minVocabByClass` (and optional `minTotalVocab`)
- 3-5 `examples` with thai, romanization, english, optional breakdown
- `cards.recognition` with question, correctAnswer, 3 distractors
- `cards.application` with question, correctExample index, 3 incorrectExamples

Use real Thai sentences that would be constructible from common vocabulary words. Ensure example sentences are natural and grammatically correct.

**Step 2: Verify JSON is valid**

Run: `node -e "require('./src/grammar.json')"`
Expected: no errors

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```
git add src/grammar.json
git commit -m "feat(grammar): add 15 hand-curated grammar points"
```

---

### Task 6: Grammar Service

**Files:**
- Create: `src/grammar-service.ts`
- Create: `src/grammar-service.test.ts`

**Step 1: Write the failing tests**

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { GrammarService } from "./grammar-service";
import { InMemoryStorage } from "./storage";
import type { GrammarEntry } from "./grammar-types";
import type { VocabularyCard } from "./vocabulary-types";
import { ApprenticeService } from "./apprentice-service";

const FUTURE_NOW = new Date(Date.now() + 15 * 60 * 1000).toISOString();

function makeGrammarEntry(
	id: string,
	lessonNumber: number,
	prerequisites: GrammarEntry["prerequisites"],
): GrammarEntry {
	return {
		id,
		title: `Grammar ${id}`,
		explanation: `Explanation for ${id}`,
		pattern: `[Pattern for ${id}]`,
		lessonNumber,
		prerequisites,
		examples: [
			{ thai: "ตัวอย่าง", romanization: "tuayang", english: "example" },
			{ thai: "อีกตัวอย่าง", romanization: "iik tuayang", english: "another" },
		],
		cards: {
			recognition: {
				question: `What is ${id}?`,
				correctAnswer: `Answer for ${id}`,
				distractors: ["Wrong 1", "Wrong 2", "Wrong 3"],
			},
			application: {
				question: `Which uses ${id}?`,
				correctExample: 0,
				incorrectExamples: ["Wrong A", "Wrong B", "Wrong C"],
			},
		},
	};
}

function seedGraduatedVocabCards(
	storage: InMemoryStorage,
	wordClass: string,
	count: number,
): void {
	const state = storage.load();
	for (let i = 0; i < count; i++) {
		const id = `vocab:${wordClass}-word-${i}:thaiToEnglish`;
		const card: VocabularyCard = {
			id,
			question: `What does ${wordClass}-word-${i} mean?`,
			correctAnswer: `meaning-${i}`,
			choices: [`meaning-${i}`, "wrong1", "wrong2", "wrong3"],
			srs: {
				easeFactor: 2.0,
				interval: 4320,
				repetitions: 5,
				learningStep: null,
				nextReviewDate: FUTURE_NOW,
				lastReviewDate: null,
				lapseCount: 0,
			},
			wordThai: `${wordClass}-word-${i}`,
			property: "thaiToEnglish",
		};
		state.vocabCards[id] = card;
	}
	storage.save(state);
}

describe("GrammarService", () => {
	let storage: InMemoryStorage;
	let grammarData: GrammarEntry[];

	beforeEach(() => {
		storage = new InMemoryStorage();
		grammarData = [
			makeGrammarEntry("g1", 1, { minVocabByClass: { n: 2, v: 2 } }),
			makeGrammarEntry("g2", 2, { minVocabByClass: { n: 3 } }),
			makeGrammarEntry("g3", 3, { minVocabByClass: { n: 2 }, minTotalVocab: 10 }),
		];
	});

	describe("getUnlockedGrammarPoints", () => {
		it("returns empty when no vocab is mastered", () => {
			const service = new GrammarService(storage, grammarData);
			expect(service.getUnlockedGrammarPoints()).toHaveLength(0);
		});

		it("unlocks grammar point when vocab prerequisites are met", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			const unlocked = service.getUnlockedGrammarPoints();
			expect(unlocked).toHaveLength(1);
			expect(unlocked[0]!.id).toBe("g1");
		});

		it("enforces sequential gating — g2 requires g1 cards exist", () => {
			seedGraduatedVocabCards(storage, "n", 3);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			// g1 prerequisites met, g2 prerequisites met, but g1 has no cards yet
			const unlocked = service.getUnlockedGrammarPoints();
			expect(unlocked.map((g) => g.id)).toEqual(["g1"]);
		});

		it("unlocks g2 after g1 cards are generated", () => {
			seedGraduatedVocabCards(storage, "n", 3);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			service.startLesson(); // generates g1 cards
			const unlocked = service.getUnlockedGrammarPoints();
			expect(unlocked.map((g) => g.id)).toEqual(["g1", "g2"]);
		});

		it("checks minTotalVocab when specified", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			// g3 needs minTotalVocab: 10, we only have 4
			const service = new GrammarService(storage, grammarData);
			service.startLesson(); // g1 cards
			// Even if vocab class prereqs met, total vocab is too low
			expect(
				service.getUnlockedGrammarPoints().map((g) => g.id),
			).not.toContain("g3");
		});
	});

	describe("getUnlearnedGrammarPoints", () => {
		it("returns unlocked points without cards", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			expect(service.getUnlearnedGrammarPoints()).toHaveLength(1);
		});

		it("excludes points that already have cards", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			service.startLesson();
			expect(service.getUnlearnedGrammarPoints()).toHaveLength(0);
		});
	});

	describe("getNextLesson", () => {
		it("returns null when no grammar points unlocked", () => {
			const service = new GrammarService(storage, grammarData);
			expect(service.getNextLesson()).toBeNull();
		});

		it("returns batch of unlearned grammar points", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			const lesson = service.getNextLesson();
			expect(lesson).not.toBeNull();
			expect(lesson!.grammarPoints).toHaveLength(1);
			expect(lesson!.grammarPoints[0]!.id).toBe("g1");
		});

		it("returns null when at apprentice limit", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const apprenticeService = new ApprenticeService(storage, 0);
			const service = new GrammarService(
				storage,
				grammarData,
				apprenticeService,
			);
			expect(service.getNextLesson()).toBeNull();
		});
	});

	describe("startLesson", () => {
		it("generates cards and saves to storage", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			const cards = service.startLesson();
			expect(cards).not.toBeNull();
			expect(cards!.length).toBe(2); // 2 cards per grammar point
			const state = storage.load();
			expect(Object.keys(state.grammarCards)).toHaveLength(2);
		});

		it("returns null when nothing to learn", () => {
			const service = new GrammarService(storage, grammarData);
			expect(service.startLesson()).toBeNull();
		});

		it("returns null when at apprentice limit", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const apprenticeService = new ApprenticeService(storage, 0);
			const service = new GrammarService(
				storage,
				grammarData,
				apprenticeService,
			);
			expect(service.startLesson()).toBeNull();
		});
	});

	describe("counts", () => {
		it("getUnlockedCount returns number of unlocked grammar points", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			expect(service.getUnlockedCount()).toBe(1);
		});

		it("getLearnedCount returns number of grammar points with cards", () => {
			seedGraduatedVocabCards(storage, "n", 2);
			seedGraduatedVocabCards(storage, "v", 2);
			const service = new GrammarService(storage, grammarData);
			expect(service.getLearnedCount()).toBe(0);
			service.startLesson();
			expect(service.getLearnedCount()).toBe(1);
		});
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/grammar-service.test.ts`
Expected: FAIL — module not found

**Step 3: Implement GrammarService**

```typescript
import type { ApprenticeService } from "./apprentice-service";
import { generateGrammarCards } from "./grammar-card-generator";
import type {
	GrammarCard,
	GrammarEntry,
	GrammarLessonSummary,
} from "./grammar-types";
import type { IStorage } from "./storage";
import type { VocabEntry } from "./vocabulary-types";

const BATCH_SIZE = 3;

export class GrammarService {
	constructor(
		private readonly storage: IStorage,
		private readonly grammarData: GrammarEntry[],
		private readonly apprenticeService?: ApprenticeService,
		private readonly vocabularyData?: VocabEntry[],
	) {}

	private getMasteredVocabCounts(): { byClass: Record<string, number>; total: number } {
		const state = this.storage.load();
		const graduatedWords = new Set<string>();

		for (const card of Object.values(state.vocabCards)) {
			if (card.srs.learningStep === null) {
				graduatedWords.add(card.wordThai);
			}
		}

		const byClass: Record<string, number> = {};
		let total = 0;

		if (this.vocabularyData) {
			for (const entry of this.vocabularyData) {
				if (graduatedWords.has(entry.thai)) {
					const cls = entry.word_class || "";
					byClass[cls] = (byClass[cls] ?? 0) + 1;
					total++;
				}
			}
		} else {
			total = graduatedWords.size;
		}

		return { byClass, total };
	}

	private meetsPrerequisites(
		entry: GrammarEntry,
		vocabCounts: { byClass: Record<string, number>; total: number },
	): boolean {
		for (const [cls, min] of Object.entries(entry.prerequisites.minVocabByClass)) {
			if ((vocabCounts.byClass[cls] ?? 0) < min) return false;
		}
		if (
			entry.prerequisites.minTotalVocab != null &&
			vocabCounts.total < entry.prerequisites.minTotalVocab
		) {
			return false;
		}
		return true;
	}

	getUnlockedGrammarPoints(): GrammarEntry[] {
		const vocabCounts = this.getMasteredVocabCounts();
		const state = this.storage.load();
		const learnedGrammarIds = new Set(
			Object.values(state.grammarCards).map((c) => c.grammarId),
		);

		const sorted = [...this.grammarData].sort(
			(a, b) => a.lessonNumber - b.lessonNumber,
		);

		const unlocked: GrammarEntry[] = [];
		for (const entry of sorted) {
			if (!this.meetsPrerequisites(entry, vocabCounts)) continue;

			// Sequential gating: all lower-numbered grammar points must have cards
			const previousMissing = sorted.some(
				(prev) =>
					prev.lessonNumber < entry.lessonNumber &&
					!learnedGrammarIds.has(prev.id) &&
					this.meetsPrerequisites(prev, vocabCounts),
			);
			if (previousMissing) continue;

			unlocked.push(entry);
		}

		return unlocked;
	}

	getUnlearnedGrammarPoints(): GrammarEntry[] {
		const state = this.storage.load();
		const learnedGrammarIds = new Set(
			Object.values(state.grammarCards).map((c) => c.grammarId),
		);
		return this.getUnlockedGrammarPoints().filter(
			(entry) => !learnedGrammarIds.has(entry.id),
		);
	}

	getNextLesson(): GrammarLessonSummary | null {
		if (this.apprenticeService && !this.apprenticeService.canStartLesson()) {
			return null;
		}
		const unlearned = this.getUnlearnedGrammarPoints();
		if (unlearned.length === 0) return null;
		return { grammarPoints: unlearned.slice(0, BATCH_SIZE) };
	}

	startLesson(): GrammarCard[] | null {
		if (this.apprenticeService && !this.apprenticeService.canStartLesson()) {
			return null;
		}
		const lesson = this.getNextLesson();
		if (!lesson) return null;

		const cards = lesson.grammarPoints.flatMap((entry) =>
			generateGrammarCards(entry),
		);

		const state = this.storage.load();
		for (const card of cards) {
			state.grammarCards[card.id] = card;
		}
		this.storage.save(state);

		return cards;
	}

	getUnlockedCount(): number {
		return this.getUnlockedGrammarPoints().length;
	}

	getLearnedCount(): number {
		const state = this.storage.load();
		return new Set(
			Object.values(state.grammarCards).map((c) => c.grammarId),
		).size;
	}
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/grammar-service.test.ts`
Expected: all tests PASS

**Step 5: Run full verification**

Run: `npx tsc --noEmit && npx vitest run && npx biome check src/`
Expected: all pass

**Step 6: Commit**

```
git add src/grammar-service.ts src/grammar-service.test.ts
git commit -m "feat(grammar): add grammar service with vocab-gated unlocking"
```

---

### Task 7: Review Service Grammar Pool Tests

**Files:**
- Modify: `src/review-service.test.ts` — add grammar pool tests

**Step 1: Add grammar pool tests**

Add a new `describe("grammar pool", ...)` block, mirroring the existing `describe("vocab pool", ...)` block. Seed grammar cards directly into storage and test:

- `getDueCards` returns grammar cards with pool `"grammar"`
- `getDueCards` with default pool does not return grammar cards
- `recordReview` updates grammar card SRS data
- `endReviewSession` sets type to `"grammar-review"` for grammar pool

For session type, note that `endReviewSession` currently only checks `pool === "script"` for type assignment. Update `endReviewSession` in `src/review-service.ts` to handle `"grammar"`:

```typescript
const summaryType = pool === "script" ? "review" : pool === "vocab" ? "vocab-review" : "grammar-review";
```

Also update the `SessionSummary.type` union in `src/types.ts` to include `"grammar-lesson" | "grammar-review"`.

**Step 2: Run tests**

Run: `npx vitest run src/review-service.test.ts`
Expected: all tests pass

**Step 3: Commit**

```
git add src/review-service.ts src/review-service.test.ts src/types.ts
git commit -m "feat(grammar): add grammar pool support in review service"
```

---

## Phase 2: UI Layer

### Task 8: GrammarPage

**Files:**
- Create: `src/pages/GrammarPage.tsx`

**Step 1: Create GrammarPage**

Follow the same 5-phase pattern as `src/pages/VocabularyPage.tsx`. Key differences:

- **Overview phase**: Show unlocked/learned/due grammar stats. "Learn N New Grammar Points" button. "Review N Due Grammar Cards" button.
- **Intro phase**: Instead of `WordCard`, show a `GrammarIntro` component inline that displays: title, pattern (in a code-like box), explanation, example sentences with romanization and English, optional breakdown.
- **Quiz phase**: Multiple choice using the grammar cards, same as vocab quiz.
- **Complete phase**: Same accuracy summary.
- **Review phase**: Same review flow using grammar pool.

Use teal/cyan colors (`bg-cyan-600`, `hover:bg-cyan-700`) to visually distinguish from vocabulary (emerald) and script (indigo).

The page should use `useApp()` hook to access:
- `getNextGrammarLesson()`, `startGrammarLesson()`, `getGrammarUnlockedCount()`, `getGrammarLearnedCount()`
- `getNumDueGrammarCards()`, `recordGrammarReview()`, `startGrammarReviewSession()`, `endGrammarReviewSession()`

These will be wired in Task 9.

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: will fail until Task 9 wires AppContext — that's OK, commit the page now

**Step 3: Commit**

```
git add src/pages/GrammarPage.tsx
git commit -m "feat(grammar): add GrammarPage with 5-phase flow"
```

---

### Task 9: Wire AppContext & Routing

**Files:**
- Modify: `src/context/AppContext.tsx` — instantiate GrammarService, add grammar operations
- Modify: `src/App.tsx` — add `/grammar` route
- Modify: `src/components/Layout.tsx` — add Grammar nav item

**Step 1: Update AppContext**

Import `GrammarService` and grammar data. Instantiate:

```typescript
import grammarData from "../grammar.json";
import { GrammarService } from "../grammar-service";
import type { GrammarEntry, GrammarCard, GrammarLessonSummary } from "../grammar-types";

const grammarService = new GrammarService(storage, grammarData as GrammarEntry[], apprenticeService, vocabularyData as VocabEntry[]);
```

Add to `AppContextValue` interface:

```typescript
// Grammar operations
getNextGrammarLesson: () => GrammarLessonSummary | null;
startGrammarLesson: () => GrammarCard[] | null;
getGrammarUnlockedCount: () => number;
getGrammarLearnedCount: () => number;
getNumDueGrammarCards: () => number;
recordGrammarReview: (cardId: string, rating: RecallRating, timing?: { responseTimeMs: number; averageResponseTimeMs: number }) => void;
startGrammarReviewSession: (maxCards?: number) => ActiveReviewSession;
endGrammarReviewSession: (session: ActiveReviewSession) => SessionSummary;
```

Add implementations in the `useMemo` value:

```typescript
getNextGrammarLesson: () => grammarService.getNextLesson(),
startGrammarLesson: () => wrap(() => grammarService.startLesson()),
getGrammarUnlockedCount: () => grammarService.getUnlockedCount(),
getGrammarLearnedCount: () => grammarService.getLearnedCount(),
getNumDueGrammarCards: () => reviewService.getNumDueCards(undefined, "grammar"),
recordGrammarReview: (cardId, rating, timing) =>
	wrap(() => reviewService.recordReview(cardId, rating, undefined, timing, "grammar")),
startGrammarReviewSession: (maxCards) =>
	reviewService.startReviewSession(maxCards, undefined, "grammar"),
endGrammarReviewSession: (session) =>
	wrap(() => reviewService.endReviewSession(session, undefined, "grammar")),
```

Update `getStageCounts` to handle `"grammar"` pool:

```typescript
getStageCounts: (pool) => {
	let cards;
	switch (pool) {
		case "script": cards = Object.values(state.cards); break;
		case "vocab": cards = Object.values(state.vocabCards); break;
		case "grammar": cards = Object.values(state.grammarCards); break;
		default: cards = [...Object.values(state.cards), ...Object.values(state.vocabCards), ...Object.values(state.grammarCards)];
	}
	return getStageCounts(cards.map((c) => c.srs));
},
```

**Step 2: Add route**

In `src/App.tsx`, add:

```typescript
import { GrammarPage } from "./pages/GrammarPage";
// In Routes:
<Route path="/grammar" element={<GrammarPage />} />
```

**Step 3: Add nav item**

In `src/components/Layout.tsx`, add to `navItems` array (after Vocab):

```typescript
{ to: "/grammar", label: "Grammar" },
```

**Step 4: Run full verification**

Run: `npx tsc --noEmit && npx vitest run && npx biome check src/`
Expected: all pass

**Step 5: Commit**

```
git add src/context/AppContext.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(grammar): wire grammar service into AppContext and routing"
```

---

### Task 10: Dashboard & ProgressPage Updates

**Files:**
- Modify: `src/pages/Dashboard.tsx` — add grammar stats section
- Modify: `src/pages/ProgressPage.tsx` — add grammar stage counts

**Step 1: Update Dashboard**

Add a grammar section after the vocabulary section, following the same pattern:

```tsx
{/* Grammar */}
<div className="border-t border-gray-200 dark:border-gray-800 pt-6">
	<h2 className="text-sm font-semibold text-gray-500 mb-3">Grammar</h2>
	<div className="grid grid-cols-3 gap-4 text-center mb-3">
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
			<div className="text-lg font-bold">{getGrammarUnlockedCount()}</div>
			<div className="text-[10px] text-gray-500">Unlocked</div>
		</div>
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
			<div className="text-lg font-bold">{getGrammarLearnedCount()}</div>
			<div className="text-[10px] text-gray-500">Learned</div>
		</div>
		<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
			<div className="text-lg font-bold text-orange-500">{getNumDueGrammarCards()}</div>
			<div className="text-[10px] text-gray-500">Due</div>
		</div>
	</div>
	<button
		onClick={() => navigate("/grammar")}
		className="w-full py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold transition-colors"
	>
		Go to Grammar
	</button>
</div>
```

Destructure the new methods from `useApp()`.

**Step 2: Update ProgressPage**

Add a grammar stage section. Use `getStageCounts("grammar")` and display in a similar grid to the script stages, with a heading "Grammar Stages".

**Step 3: Run full verification**

Run: `npx tsc --noEmit && npx vitest run && npx biome check src/`
Expected: all pass

**Step 4: Commit**

```
git add src/pages/Dashboard.tsx src/pages/ProgressPage.tsx
git commit -m "feat(grammar): add grammar stats to Dashboard and ProgressPage"
```

---

### Task 11: Final Verification & Cleanup

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Lint**

Run: `npx biome check src/`
Expected: clean

**Step 4: Review for dead code**

Check all new files for unused imports or dead code. Remove any found.

**Step 5: Final commit if any cleanup was needed**

```
git commit -m "chore: grammar feature cleanup"
```
