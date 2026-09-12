import { describe, expect, it } from "vitest";
import { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type { GrammarEntry } from "../../domain/grammar/types";
import { LearningService } from "../../domain/script/services/ScriptLessonService";
import { SentenceService } from "../../domain/sentence/services/SentenceLessonService";
import type { SentenceEntry } from "../../domain/sentence/types";
import { ApprenticeService } from "../../domain/shared/services/ApprenticeService";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";
import { StartLessonUseCase } from "./StartLessonUseCase";

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

function createUseCase(vocabulary: VocabEntry[]) {
	const storage = new InMemoryStorage();
	const cardRepo = new StorageCardRepository(storage);
	const stateRepo = new StorageLearnerStateRepository(storage);
	const apprenticeService = new ApprenticeService(cardRepo, 100, stateRepo);
	const scriptService = new LearningService(cardRepo, stateRepo, apprenticeService);
	const vocabService = new VocabularyService(
		cardRepo,
		stateRepo,
		vocabulary,
		apprenticeService,
	);
	const grammarService = new GrammarService(
		cardRepo,
		[] as GrammarEntry[],
		apprenticeService,
		vocabulary,
	);
	const sentenceService = new SentenceService(
		cardRepo,
		[] as SentenceEntry[],
		vocabService,
		apprenticeService,
	);
	const useCase = new StartLessonUseCase(
		scriptService,
		vocabService,
		grammarService,
		sentenceService,
	);
	return { useCase, storage, cardRepo };
}

describe("StartLessonUseCase.pullInVocabWord", () => {
	it("pulls in a mastered word and persists its cards", () => {
		const vocabulary = [makeEntry()];
		const { useCase, cardRepo, storage } = createUseCase(vocabulary);
		const state = storage.load();
		state.completedLessons = [1, 2];
		storage.save(state);

		expect(useCase.pullInVocabWord("มา")).toBe(true);
		expect(cardRepo.findAll("vocab").length).toBeGreaterThan(0);
	});

	it("returns false for a word whose script isn't mastered", () => {
		const vocabulary = [makeEntry()];
		const { useCase } = createUseCase(vocabulary);

		expect(useCase.pullInVocabWord("มา")).toBe(false);
	});
});
