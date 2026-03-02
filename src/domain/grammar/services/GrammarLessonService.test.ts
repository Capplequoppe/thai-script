import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { ApprenticeService } from "../../shared/services/ApprenticeService";
import type { VocabEntry } from "../../vocabulary/types";
import type { GrammarEntry } from "../types";
import { GrammarService } from "./GrammarLessonService";

function makeGrammarEntry(
	id: string,
	lessonNumber: number,
	prerequisites: GrammarEntry["prerequisites"] = { minVocabByClass: {} },
): GrammarEntry {
	return {
		id,
		title: `Grammar ${id}`,
		explanation: `Explanation for ${id}`,
		pattern: `[Pattern ${id}]`,
		lessonNumber,
		prerequisites,
		examples: [
			{
				thai: `thai-${id}-0`,
				romanization: `rom-${id}-0`,
				english: `eng-${id}-0`,
				words: [
					{ thai: "w1", gloss: "g1" },
					{ thai: "w2", gloss: "g2" },
				],
			},
			{
				thai: `thai-${id}-1`,
				romanization: `rom-${id}-1`,
				english: `eng-${id}-1`,
			},
		],
		cards: {
			recognition: {
				question: `Q recognition ${id}`,
				correctAnswer: `A recognition ${id}`,
				distractors: ["d1", "d2", "d3"],
			},
			application: {
				question: `Q application ${id}`,
				correctExample: 0,
				incorrectExamples: [
					{
						words: [
							{ thai: "w2", gloss: "g2" },
							{ thai: "w1", gloss: "g1" },
						],
					},
					{
						words: [
							{ thai: "w1", gloss: "g1" },
							{ thai: "w2", gloss: "g2" },
						],
					},
					{
						words: [
							{ thai: "w2", gloss: "g2" },
							{ thai: "w1", gloss: "g1" },
						],
					},
				],
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
		const wordThai = `${wordClass}-word-${i}`;
		state.vocabCards[`vocab:${wordThai}:thaiToEnglish`] = {
			id: `vocab:${wordThai}:thaiToEnglish`,
			wordThai,
			property: "thaiToEnglish",
			question: wordThai,
			correctAnswer: `meaning-${i}`,
			choices: [`meaning-${i}`, "wrong1", "wrong2", "wrong3"],
			srs: {
				easeFactor: 2.0,
				interval: 4320,
				repetitions: 6,
				learningStep: null,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: new Date().toISOString(),
				lapseCount: 0,
			},
		};
	}
	storage.save(state);
}

function makeVocabEntries(wordClass: string, count: number): VocabEntry[] {
	return Array.from({ length: count }, (_, i) => ({
		thai: `${wordClass}-word-${i}`,
		english: `meaning-${i}`,
		romanization: `rom-${i}`,
		word_class: wordClass,
		rank: null,
		frequency: 0,
		mnemonic: null,
		characters: [],
		syllables: [],
		toneRules: [],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
	}));
}

describe("GrammarService", () => {
	describe("getUnlockedGrammarPoints", () => {
		it("returns empty when no vocab cards exist", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: { n: 2 },
			});
			const vocabData = makeVocabEntries("n", 5);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				undefined,
				vocabData,
			);

			expect(service.getUnlockedGrammarPoints()).toEqual([]);
		});

		it("unlocks grammar point when prerequisites are met", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: { n: 2 },
			});
			const vocabData = makeVocabEntries("n", 3);
			seedGraduatedVocabCards(storage, "n", 3);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				undefined,
				vocabData,
			);

			const unlocked = service.getUnlockedGrammarPoints();
			expect(unlocked).toHaveLength(1);
			expect(unlocked[0]?.id).toBe("g1");
		});

		it("applies sequential gating — g2 requires g1 cards to exist", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: { n: 2 },
			});
			const g2 = makeGrammarEntry("g2", 2, {
				minVocabByClass: { n: 2 },
			});
			const vocabData = makeVocabEntries("n", 5);
			seedGraduatedVocabCards(storage, "n", 5);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1, g2],
				undefined,
				vocabData,
			);

			const unlocked = service.getUnlockedGrammarPoints();
			expect(unlocked).toHaveLength(1);
			expect(unlocked[0]?.id).toBe("g1");
		});

		it("unlocks g2 after g1 cards exist in storage", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: { n: 2 },
			});
			const g2 = makeGrammarEntry("g2", 2, {
				minVocabByClass: { n: 2 },
			});
			const vocabData = makeVocabEntries("n", 5);
			seedGraduatedVocabCards(storage, "n", 5);

			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1, g2],
				undefined,
				vocabData,
			);

			// Start lesson for g1 to create grammar cards
			service.startLesson();

			const unlocked = service.getUnlockedGrammarPoints();
			expect(unlocked.map((e) => e.id)).toContain("g2");
		});

		it("checks minTotalVocab prerequisite", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: {},
				minTotalVocab: 10,
			});
			const vocabData = [
				...makeVocabEntries("n", 3),
				...makeVocabEntries("v", 3),
			];
			seedGraduatedVocabCards(storage, "n", 3);
			seedGraduatedVocabCards(storage, "v", 3);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				undefined,
				vocabData,
			);

			expect(service.getUnlockedGrammarPoints()).toEqual([]);

			// Add more vocab to meet the threshold
			const moreNounData = Array.from({ length: 4 }, (_, i) => ({
				thai: `n2-word-${i}`,
				english: `meaning-${i}`,
				romanization: `rom-${i}`,
				word_class: "n",
				rank: null,
				frequency: 0,
				mnemonic: null,
				characters: [] as string[],
				syllables: [] as VocabEntry["syllables"],
				toneRules: [] as string[],
				thai_audio_file: null,
				english_audio_file: null,
				image_file: null,
				samples: [] as VocabEntry["samples"],
				source: "test",
			}));
			const state = storage.load();
			for (let i = 0; i < 4; i++) {
				const wordThai = `n2-word-${i}`;
				state.vocabCards[`vocab:${wordThai}:thaiToEnglish`] = {
					id: `vocab:${wordThai}:thaiToEnglish`,
					wordThai,
					property: "thaiToEnglish",
					question: wordThai,
					correctAnswer: `meaning-${i}`,
					choices: [`meaning-${i}`, "wrong1", "wrong2", "wrong3"],
					srs: {
						easeFactor: 2.0,
						interval: 4320,
						repetitions: 6,
						learningStep: null,
						nextReviewDate: new Date().toISOString(),
						lastReviewDate: new Date().toISOString(),
						lapseCount: 0,
					},
				};
			}
			storage.save(state);

			const fullVocabData = [...vocabData, ...moreNounData];
			const service2 = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				undefined,
				fullVocabData,
			);
			expect(service2.getUnlockedGrammarPoints()).toHaveLength(1);
		});
	});

	describe("getUnlearnedGrammarPoints", () => {
		it("returns unlocked grammar points that have no cards", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, { minVocabByClass: {} });
			const service = new GrammarService(new StorageCardRepository(storage), [
				g1,
			]);

			const unlearned = service.getUnlearnedGrammarPoints();
			expect(unlearned).toHaveLength(1);
			expect(unlearned[0]?.id).toBe("g1");
		});

		it("excludes grammar points that already have cards", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, { minVocabByClass: {} });
			const service = new GrammarService(new StorageCardRepository(storage), [
				g1,
			]);

			service.startLesson();

			expect(service.getUnlearnedGrammarPoints()).toHaveLength(0);
		});
	});

	describe("getNextLesson", () => {
		it("returns null when nothing is unlocked", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: { n: 5 },
			});
			const vocabData = makeVocabEntries("n", 5);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				undefined,
				vocabData,
			);

			expect(service.getNextLesson()).toBeNull();
		});

		it("returns a batch of up to 3 grammar points", () => {
			const storage = new InMemoryStorage();
			const entries = [
				makeGrammarEntry("g1", 1, { minVocabByClass: {} }),
				makeGrammarEntry("g2", 1, { minVocabByClass: {} }),
				makeGrammarEntry("g3", 1, { minVocabByClass: {} }),
				makeGrammarEntry("g4", 1, { minVocabByClass: {} }),
			];
			const service = new GrammarService(
				new StorageCardRepository(storage),
				entries,
			);

			const lesson = service.getNextLesson();
			expect(lesson).not.toBeNull();
			expect(lesson?.grammarPoints).toHaveLength(3);
		});

		it("returns null when at apprentice limit", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, { minVocabByClass: {} });
			const apprentice = new ApprenticeService(
				new StorageCardRepository(storage),
				0,
			);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				apprentice,
			);

			expect(service.getNextLesson()).toBeNull();
		});
	});

	describe("startLesson", () => {
		it("generates cards and saves to storage", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, { minVocabByClass: {} });
			const service = new GrammarService(new StorageCardRepository(storage), [
				g1,
			]);

			const cards = service.startLesson();
			expect(cards).not.toBeNull();
			expect(cards).toHaveLength(2);

			const state = storage.load();
			expect(Object.keys(state.grammarCards)).toHaveLength(2);
			expect(state.grammarCards["grammar:g1:recognition"]).toBeDefined();
			expect(state.grammarCards["grammar:g1:application"]).toBeDefined();
		});

		it("returns null when nothing to learn", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, {
				minVocabByClass: { n: 5 },
			});
			const vocabData = makeVocabEntries("n", 5);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				undefined,
				vocabData,
			);

			expect(service.startLesson()).toBeNull();
		});

		it("returns null at apprentice limit", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, { minVocabByClass: {} });
			const apprentice = new ApprenticeService(
				new StorageCardRepository(storage),
				0,
			);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				[g1],
				apprentice,
			);

			expect(service.startLesson()).toBeNull();
		});
	});

	describe("getUnlockedCount", () => {
		it("returns number of unlocked grammar points", () => {
			const storage = new InMemoryStorage();
			const entries = [
				makeGrammarEntry("g1", 1, { minVocabByClass: {} }),
				makeGrammarEntry("g2", 1, { minVocabByClass: {} }),
				makeGrammarEntry("g3", 2, { minVocabByClass: { n: 99 } }),
			];
			const vocabData = makeVocabEntries("n", 99);
			const service = new GrammarService(
				new StorageCardRepository(storage),
				entries,
				undefined,
				vocabData,
			);

			expect(service.getUnlockedCount()).toBe(2);
		});
	});

	describe("getLearnedCount", () => {
		it("returns number of distinct grammar IDs with cards", () => {
			const storage = new InMemoryStorage();
			const g1 = makeGrammarEntry("g1", 1, { minVocabByClass: {} });
			const g2 = makeGrammarEntry("g2", 1, { minVocabByClass: {} });
			const service = new GrammarService(new StorageCardRepository(storage), [
				g1,
				g2,
			]);

			expect(service.getLearnedCount()).toBe(0);

			service.startLesson();

			expect(service.getLearnedCount()).toBe(2);
		});
	});
});
