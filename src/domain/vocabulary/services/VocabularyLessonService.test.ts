import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
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

	it("generateLessonCards returns cards without saving; commitLessonCards persists them", () => {
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

		const cards = service.generateLessonCards();

		// Each word without audio produces 2 cards (thaiToEnglish + englishToThai)
		expect(cards).toHaveLength(4);

		// Cards are NOT yet saved
		const midState = storage.load();
		expect(Object.keys(midState.vocabCards)).toHaveLength(0);

		// Commit saves them
		if (!cards) throw new Error("Expected cards");
		service.commitLessonCards(cards);

		const savedState = storage.load();
		expect(Object.keys(savedState.vocabCards)).toHaveLength(4);
		expect(savedState.vocabCards["vocab:มา:thaiToEnglish"]).toBeDefined();
		expect(savedState.vocabCards["vocab:นา:englishToThai"]).toBeDefined();
	});

	it("generateLessonCards throws when no vocabulary words are available", () => {
		const service = new VocabularyService(cardRepo, stateRepo, []);

		expect(() => service.generateLessonCards()).toThrow(
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

		const cards = service.generateLessonCards();
		if (!cards) throw new Error("Expected cards");
		service.commitLessonCards(cards);

		expect(service.getLearnedCount()).toBe(2);
	});

	it("getLearnedEntries returns full VocabEntry for learned words sorted by rank", () => {
		// Vocabulary declared in reverse rank order so the .sort() is actually exercised.
		const vocabulary = [
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				rank: 2,
				english: "rice field",
			}),
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		expect(service.getLearnedEntries()).toHaveLength(0); // none learned yet

		const cards = service.generateLessonCards();
		if (!cards) throw new Error("Expected cards");
		service.commitLessonCards(cards);

		const entries = service.getLearnedEntries();
		expect(entries).toHaveLength(2);
		// rank 1 must come first regardless of declaration order
		expect(entries[0]?.thai).toBe("มา");
		expect(entries[1]?.thai).toBe("นา");
	});

	it("getLearnedEntries sorts null-rank entries after ranked entries", () => {
		// Seed cards for both words directly so we can test sort behaviour for a
		// null-rank entry without going through the unlock/lesson pipeline (which
		// excludes null-rank words from the rank window by design).
		const vocabulary = [
			makeEntry({ thai: "มา", rank: 1, english: "to come" }),
			makeEntry({
				thai: "นา",
				characters: ["น", "า"],
				english: "rice field",
				rank: undefined,
			}),
		];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

		const state = storage.load();
		state.completedLessons = [1, 2];
		const baseSrs = {
			easeFactor: 2.0,
			interval: 10,
			repetitions: 0,
			learningStep: 1,
			nextReviewDate: new Date().toISOString(),
			lastReviewDate: null,
		};
		state.vocabCards["vocab:มา:thaiToEnglish"] = {
			id: "vocab:มา:thaiToEnglish",
			wordThai: "มา",
			property: "thaiToEnglish",
			question: "What does this word mean?",
			correctAnswer: "to come",
			choices: ["to come"],
			srs: baseSrs,
		};
		state.vocabCards["vocab:นา:thaiToEnglish"] = {
			id: "vocab:นา:thaiToEnglish",
			wordThai: "นา",
			property: "thaiToEnglish",
			question: "What does this word mean?",
			correctAnswer: "rice field",
			choices: ["rice field"],
			srs: baseSrs,
		};
		storage.save(state);

		const entries = service.getLearnedEntries();
		expect(entries).toHaveLength(2);
		// ranked entry (rank 1) must sort before the null-rank entry
		expect(entries[0]?.thai).toBe("มา");
		expect(entries[1]?.thai).toBe("นา");
	});

	it("getLearnedEntries returns empty array when no cards exist", () => {
		const vocabulary = [makeEntry()];
		const service = new VocabularyService(cardRepo, stateRepo, vocabulary);
		expect(service.getLearnedEntries()).toHaveLength(0);
	});

	describe("apprentice word gating", () => {
		function makeLearningVocabCard(
			wordThai: string,
			cardSuffix: string,
		): object {
			return {
				id: `vocab:${wordThai}:${cardSuffix}`,
				wordThai,
				property: cardSuffix,
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: {
					easeFactor: 2.0,
					interval: 10,
					repetitions: 0,
					learningStep: 1,
					nextReviewDate: new Date().toISOString(),
					lastReviewDate: null,
					lapseCount: 0,
				},
			};
		}

		it("getNextLesson returns null when 20 distinct vocab words are at apprentice stage", () => {
			const state = storage.load();
			state.completedLessons = [1, 2];
			// Add 20 distinct words in apprentice stage
			for (let i = 0; i < 20; i++) {
				const word = `word${i}`;
				state.vocabCards[`vocab:${word}:thaiToEnglish`] = makeLearningVocabCard(
					word,
					"thaiToEnglish",
				) as SrsData;
			}
			storage.save(state);

			const vocabulary = [makeEntry()];
			const service = new VocabularyService(cardRepo, stateRepo, vocabulary);
			expect(service.getNextLesson()).toBeNull();
		});

		it("generateLessonCards returns null when 20 distinct vocab words are at apprentice stage", () => {
			const state = storage.load();
			state.completedLessons = [1, 2];
			for (let i = 0; i < 20; i++) {
				const word = `word${i}`;
				state.vocabCards[`vocab:${word}:thaiToEnglish`] = makeLearningVocabCard(
					word,
					"thaiToEnglish",
				) as SrsData;
			}
			storage.save(state);

			const vocabulary = [makeEntry()];
			const service = new VocabularyService(cardRepo, stateRepo, vocabulary);
			expect(service.generateLessonCards()).toBeNull();
		});

		it("counts distinct words, not cards — multiple cards per word do not inflate the count", () => {
			const state = storage.load();
			state.completedLessons = [1, 2];
			// Add 19 words with 2 cards each = 38 cards but only 19 distinct words
			for (let i = 0; i < 19; i++) {
				const word = `word${i}`;
				state.vocabCards[`vocab:${word}:thaiToEnglish`] = makeLearningVocabCard(
					word,
					"thaiToEnglish",
				) as SrsData;
				state.vocabCards[`vocab:${word}:englishToThai`] = makeLearningVocabCard(
					word,
					"englishToThai",
				) as SrsData;
			}
			storage.save(state);

			const vocabulary = [makeEntry()];
			const service = new VocabularyService(cardRepo, stateRepo, vocabulary);
			// Only 19 distinct words — should still be allowed
			expect(service.getNextLesson()).not.toBeNull();
		});

		it("allows new lessons when fewer than 20 words are at apprentice stage", () => {
			const state = storage.load();
			state.completedLessons = [1, 2];
			for (let i = 0; i < 5; i++) {
				const word = `word${i}`;
				state.vocabCards[`vocab:${word}:thaiToEnglish`] = makeLearningVocabCard(
					word,
					"thaiToEnglish",
				) as SrsData;
			}
			storage.save(state);

			const vocabulary = [makeEntry()];
			const service = new VocabularyService(cardRepo, stateRepo, vocabulary);
			expect(service.getNextLesson()).not.toBeNull();
		});
	});
});
