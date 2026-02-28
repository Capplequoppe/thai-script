import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import { ApprenticeService } from "../../shared/services/ApprenticeService";
import type { SrsData } from "../../shared/types";
import type { VocabEntry } from "../types";
import { VocabularyService } from "./VocabularyLessonService";

function makeEntry(overrides: Partial<VocabEntry> = {}): VocabEntry {
	return {
		thai: "มา",
		romanization: "maa",
		word_class: "verb",
		english: "to come",
		rank: 1,
		frequency: 100000,
		mnemonic: null,
		characters: ["ม", "า"],
		syllables: [],
		toneRules: ["low-live"],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
		...overrides,
	};
}

// Lesson 1 provides consonants ม, น and vowel า.
// Lesson 2 provides consonants ง, ย, ว and tone rule "low-live".
// A word using ม + า with tone rule "low-live" requires lessons 1 and 2.

describe("VocabularyService", () => {
	let storage: InMemoryStorage;
	let cardRepo: StorageCardRepository;
	let stateRepo: StorageLearnerStateRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		cardRepo = new StorageCardRepository(storage);
		stateRepo = new StorageLearnerStateRepository(storage);
	});

	it("returns no unlocked words when no lessons are completed", () => {
		const vocabulary = [makeEntry()];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		expect(service.getUnlockedWords()).toHaveLength(0);
	});

	it("unlocks words when all characters and tone rules are mastered", () => {
		const vocabulary = [makeEntry()];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		const unlocked = service.getUnlockedWords();
		expect(unlocked).toHaveLength(1);
		expect(unlocked[0]?.thai).toBe("มา");
	});

	it("does not unlock words when only characters are mastered but tone rules are missing", () => {
		const vocabulary = [makeEntry()];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1]; // Has ม, า but not tone rule "low-live" (lesson 2)
		storage.save(state);

		expect(service.getUnlockedWords()).toHaveLength(0);
	});

	it("returns unlearned words sorted by rank", () => {
		const vocabulary = [
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 50,
				english: "rice field",
			}),
			makeEntry({
				thai: "มา",
				characters: ["ม", "า"],
				rank: 10,
				english: "to come",
			}),
			makeEntry({
				thai: "นาน",
				characters: ["น", "า"],
				rank: 30,
				english: "long time",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		const unlearned = service.getUnlearnedWords();
		expect(unlearned.map((w) => w.rank)).toEqual([10, 30, 50]);
	});

	it("getNextLesson returns a batch of up to 5 words", () => {
		const vocabulary = Array.from({ length: 8 }, (_, i) =>
			makeEntry({
				thai: `มา${i}`,
				english: `word-${i}`,
				rank: i + 1,
			}),
		);
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		const lesson = service.getNextLesson();
		expect(lesson).not.toBeNull();
		expect(lesson?.words).toHaveLength(5);
	});

	it("getNextLesson excludes already-learned words", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 2,
				english: "rice field",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		state.vocabCards["vocab:มา:thaiToEnglish"] = {
			id: "vocab:มา:thaiToEnglish",
			wordThai: "มา",
			property: "thaiToEnglish",
			question: "What does this word mean?",
			correctAnswer: "to come",
			choices: ["to come"],
			srs: {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
			},
		};
		storage.save(state);

		const lesson = service.getNextLesson();
		expect(lesson).not.toBeNull();
		expect(lesson?.words).toHaveLength(1);
		expect(lesson?.words[0]?.thai).toBe("นา");
	});

	it("getNextLesson returns null when no unlearned words are available", () => {
		const vocabulary = [makeEntry()];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		state.vocabCards["vocab:มา:thaiToEnglish"] = {
			id: "vocab:มา:thaiToEnglish",
			wordThai: "มา",
			property: "thaiToEnglish",
			question: "What does this word mean?",
			correctAnswer: "to come",
			choices: ["to come"],
			srs: {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
			},
		};
		storage.save(state);

		expect(service.getNextLesson()).toBeNull();
	});

	it("startLesson generates cards and saves them to storage", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 2,
				english: "rice field",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		const cards = service.startLesson();

		// Each word without audio produces 2 cards (thaiToEnglish + englishToThai)
		expect(cards).toHaveLength(4);

		const savedState = storage.load();
		expect(Object.keys(savedState.vocabCards)).toHaveLength(4);
		expect(savedState.vocabCards["vocab:มา:thaiToEnglish"]).toBeDefined();
		expect(savedState.vocabCards["vocab:นา:englishToThai"]).toBeDefined();
	});

	it("startLesson throws when no vocabulary words are available", () => {
		const service = new VocabularyService(cardRepo, stateRepo, []);

		expect(() => service.startLesson()).toThrow(
			"No vocabulary words available to learn",
		);
	});

	it("getUnlockedCount returns count of all unlocked words", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 2,
				english: "rice field",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		expect(service.getUnlockedCount()).toBe(2);
	});

	it("excludes words outside the rank window even when character mastery qualifies them", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 30,
				english: "rice field",
			}),
			makeEntry({
				thai: "นาน",
				characters: ["น", "า"],
				rank: 60,
				english: "long time",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		// All 3 words pass mastery filter. First unlearned rank is 1, window is 1–50.
		// Rank 60 is outside the window.
		const unlocked = service.getUnlockedWords();
		expect(unlocked.map((w) => w.thai).sort()).toEqual(["นา", "มา"]);
	});

	it("slides the rank window forward as lower-rank words are learned", () => {
		const vocabulary = Array.from({ length: 6 }, (_, i) =>
			makeEntry({
				thai: `มา${i}`,
				english: `word-${i}`,
				rank: (i + 1) * 10, // ranks 10, 20, 30, 40, 50, 60
			}),
		);
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		// Learn the first word (rank 10) so the window starts at rank 20 → 20–69
		state.vocabCards["vocab:มา0:thaiToEnglish"] = {
			id: "vocab:มา0:thaiToEnglish",
			wordThai: "มา0",
			property: "thaiToEnglish",
			question: "What does this word mean?",
			correctAnswer: "word-0",
			choices: ["word-0"],
			srs: {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
			},
		};
		storage.save(state);

		const unlocked = service.getUnlockedWords();
		// Learned word (rank 10) always included; window 20–69 includes ranks 20,30,40,50,60
		expect(unlocked).toHaveLength(6);
	});

	it("excludes null-rank words from the rank window", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: null,
				english: "rice field",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		const unlocked = service.getUnlockedWords();
		expect(unlocked).toHaveLength(1);
		expect(unlocked[0]?.thai).toBe("มา");
	});

	it("includes learned words with null rank in unlocked set", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: null, english: "to come" }),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		state.vocabCards["vocab:มา:thaiToEnglish"] = {
			id: "vocab:มา:thaiToEnglish",
			wordThai: "มา",
			property: "thaiToEnglish",
			question: "What does this word mean?",
			correctAnswer: "to come",
			choices: ["to come"],
			srs: {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
			},
		};
		storage.save(state);

		const unlocked = service.getUnlockedWords();
		expect(unlocked).toHaveLength(1);
		expect(unlocked[0]?.thai).toBe("มา");
	});

	it("getLearnedCount returns count of words with generated cards", () => {
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 2,
				english: "rice field",
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		expect(service.getLearnedCount()).toBe(0);

		service.startLesson();

		expect(service.getLearnedCount()).toBe(2);
	});

	describe("apprentice gating", () => {
		function makeSrsData(overrides: Partial<SrsData> = {}): SrsData {
			return {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
				lapseCount: 0,
				...overrides,
			};
		}

		it("getNextLesson returns null when at apprentice limit", () => {
			const apprenticeService = new ApprenticeService(cardRepo, 1);
			const vocabulary = [makeEntry()];

			const state = storage.load();
			state.completedLessons = [1, 2];
			state.cards.s1 = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			storage.save(state);

			const service = new VocabularyService(
				cardRepo,
				stateRepo,
				vocabulary,
				apprenticeService,
			);
			expect(service.getNextLesson()).toBeNull();
		});

		it("startLesson returns null when at apprentice limit", () => {
			const apprenticeService = new ApprenticeService(cardRepo, 1);
			const vocabulary = [makeEntry()];

			const state = storage.load();
			state.completedLessons = [1, 2];
			state.cards.s1 = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			storage.save(state);

			const service = new VocabularyService(
				cardRepo,
				stateRepo,
				vocabulary,
				apprenticeService,
			);
			expect(service.startLesson()).toBeNull();
		});

		it("works normally without ApprenticeService", () => {
			const vocabulary = [makeEntry()];
			const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

			const state = storage.load();
			state.completedLessons = [1, 2];
			storage.save(state);

			const lesson = service.getNextLesson();
			expect(lesson).not.toBeNull();
			expect(lesson?.words).toHaveLength(1);
		});
	});
});
