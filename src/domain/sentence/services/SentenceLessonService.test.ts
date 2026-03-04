import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import { ApprenticeService } from "../../shared/services/ApprenticeService";
import { VocabularyService } from "../../vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../vocabulary/types";
import type { SentenceEntry } from "../types";
import { SentenceService } from "./SentenceLessonService";

function makeSentenceEntry(
	id: string,
	words: string[],
	difficulty = 1,
): SentenceEntry {
	return {
		id,
		thai: words.join(" "),
		romanization: `rom-${id}`,
		english: `English for ${id}`,
		words,
		difficulty,
		thai_audio_file: null,
		cards: {
			readingComprehension: {
				distractors: ["wrong1", "wrong2", "wrong3"],
			},
		},
	};
}

function makeVocabEntry(thai: string): VocabEntry {
	return {
		thai,
		english: `meaning-${thai}`,
		romanization: `rom-${thai}`,
		word_class: "v",
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
	};
}

function seedVocabCards(storage: InMemoryStorage, words: string[]): void {
	const state = storage.load();
	for (const promptWord of words) {
		state.vocabCards[`vocab:${promptWord}:thaiToEnglish`] = {
			id: `vocab:${promptWord}:thaiToEnglish`,
			promptWord,
			property: "thaiToEnglish",
			question: promptWord,
			correctAnswer: `meaning-${promptWord}`,
			choices: [`meaning-${promptWord}`, "wrong1", "wrong2", "wrong3"],
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

function createService(
	storage: InMemoryStorage,
	sentences: SentenceEntry[],
	vocabEntries: VocabEntry[],
	apprentice?: ApprenticeService,
): SentenceService {
	const cardRepo = new StorageCardRepository(storage);
	const stateRepo = new StorageLearnerStateRepository(storage);
	const vocabService = new VocabularyService(cardRepo, stateRepo, vocabEntries);
	return new SentenceService(cardRepo, sentences, vocabService, apprentice);
}

describe("SentenceService", () => {
	describe("getUnlockedSentences", () => {
		it("returns empty when no vocab cards exist", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา", "กิน"]);
			const vocabEntries = [makeVocabEntry("มา"), makeVocabEntry("กิน")];
			const service = createService(storage, [s1], vocabEntries);

			expect(service.getUnlockedSentences()).toEqual([]);
		});

		it("unlocks sentence when all words are learned", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา", "กิน"]);
			const vocabEntries = [makeVocabEntry("มา"), makeVocabEntry("กิน")];
			seedVocabCards(storage, ["มา", "กิน"]);
			const service = createService(storage, [s1], vocabEntries);

			const unlocked = service.getUnlockedSentences();
			expect(unlocked).toHaveLength(1);
			expect(unlocked[0]?.id).toBe("s1");
		});

		it("does not unlock sentence when some words are missing", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา", "กิน", "กัน"]);
			const vocabEntries = [
				makeVocabEntry("มา"),
				makeVocabEntry("กิน"),
				makeVocabEntry("กัน"),
			];
			seedVocabCards(storage, ["มา", "กิน"]); // missing กัน
			const service = createService(storage, [s1], vocabEntries);

			expect(service.getUnlockedSentences()).toEqual([]);
		});

		it("sorts unlocked sentences by difficulty", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา"], 3);
			const s2 = makeSentenceEntry("s2", ["มา"], 1);
			const s3 = makeSentenceEntry("s3", ["มา"], 2);
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, [s1, s2, s3], vocabEntries);

			const unlocked = service.getUnlockedSentences();
			expect(unlocked.map((s) => s.id)).toEqual(["s2", "s3", "s1"]);
		});
	});

	describe("getUnlearnedSentences", () => {
		it("returns unlocked sentences that have no cards", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา"]);
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, [s1], vocabEntries);

			expect(service.getUnlearnedSentences()).toHaveLength(1);
		});

		it("excludes sentences that already have cards", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา"]);
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, [s1], vocabEntries);

			service.startLesson();

			expect(service.getUnlearnedSentences()).toHaveLength(0);
		});
	});

	describe("getNextLesson", () => {
		it("returns null when nothing is unlocked", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา", "กิน"]);
			const vocabEntries = [makeVocabEntry("มา"), makeVocabEntry("กิน")];
			const service = createService(storage, [s1], vocabEntries);

			expect(service.getNextLesson()).toBeNull();
		});

		it("returns a batch of up to 3 sentences", () => {
			const storage = new InMemoryStorage();
			const sentences = [
				makeSentenceEntry("s1", ["มา"], 1),
				makeSentenceEntry("s2", ["มา"], 2),
				makeSentenceEntry("s3", ["มา"], 3),
				makeSentenceEntry("s4", ["มา"], 4),
			];
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, sentences, vocabEntries);

			const lesson = service.getNextLesson();
			expect(lesson).not.toBeNull();
			expect(lesson?.sentences).toHaveLength(3);
		});

		it("returns null when at apprentice limit", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา"]);
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const cardRepo = new StorageCardRepository(storage);
			const apprentice = new ApprenticeService(cardRepo, 0);
			const service = createService(storage, [s1], vocabEntries, apprentice);

			expect(service.getNextLesson()).toBeNull();
		});
	});

	describe("startLesson", () => {
		it("generates cards and saves to storage", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา"]);
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, [s1], vocabEntries);

			const cards = service.startLesson();
			expect(cards).not.toBeNull();
			expect(cards).toHaveLength(1); // reading comprehension only (no audio)

			const state = storage.load();
			expect(Object.keys(state.sentenceCards)).toHaveLength(1);
			expect(
				state.sentenceCards["sentence:s1:readingComprehension"],
			).toBeDefined();
		});

		it("returns null when nothing to learn", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา", "กิน"]);
			const vocabEntries = [makeVocabEntry("มา"), makeVocabEntry("กิน")];
			const service = createService(storage, [s1], vocabEntries);

			expect(service.startLesson()).toBeNull();
		});
	});

	describe("getUnlockedCount", () => {
		it("returns number of unlocked sentences", () => {
			const storage = new InMemoryStorage();
			const sentences = [
				makeSentenceEntry("s1", ["มา"]),
				makeSentenceEntry("s2", ["มา"]),
				makeSentenceEntry("s3", ["กิน"]), // not unlocked — กิน not learned
			];
			const vocabEntries = [makeVocabEntry("มา"), makeVocabEntry("กิน")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, sentences, vocabEntries);

			expect(service.getUnlockedCount()).toBe(2);
		});
	});

	describe("getLearnedCount", () => {
		it("returns number of distinct sentence IDs with cards", () => {
			const storage = new InMemoryStorage();
			const s1 = makeSentenceEntry("s1", ["มา"]);
			const s2 = makeSentenceEntry("s2", ["มา"]);
			const vocabEntries = [makeVocabEntry("มา")];
			seedVocabCards(storage, ["มา"]);
			const service = createService(storage, [s1, s2], vocabEntries);

			expect(service.getLearnedCount()).toBe(0);

			service.startLesson();

			expect(service.getLearnedCount()).toBe(2);
		});
	});
});
