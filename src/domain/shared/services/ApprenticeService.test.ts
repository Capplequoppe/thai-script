import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { GrammarReviewCard } from "../../grammar/entities/GrammarReviewCard";
import type { CardRepository } from "../../ports/CardRepository";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import { SentenceReviewCard } from "../../sentence/entities/SentenceReviewCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import {
	ApprenticeService,
	MAX_APPRENTICE_ITEMS,
	MAX_SCRIPT_APPRENTICE_ITEMS,
	MAX_SENTENCE_APPRENTICE_ITEMS,
} from "./ApprenticeService";

function learningSchedule(): SrsSchedule {
	return SrsSchedule.initial();
}

function graduatedSchedule(): SrsSchedule {
	return SrsSchedule.fromDTO({
		easeFactor: 2.5,
		interval: 4320,
		repetitions: 5,
		learningStep: null,
		nextReviewDate: new Date().toISOString(),
		lastReviewDate: new Date().toISOString(),
		lapseCount: 0,
	});
}

function makeScriptCard(id: string, inLearning: boolean): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		"test",
		"test",
		["test"],
		inLearning ? learningSchedule() : graduatedSchedule(),
		"ก",
		"recognition",
		1,
	);
}

function makeVocabCard(id: string, inLearning: boolean): VocabCard {
	return new VocabCard(
		id,
		"test",
		"test",
		["test"],
		inLearning ? learningSchedule() : graduatedSchedule(),
		"มา",
		"thaiToEnglish",
	);
}

function makeSentenceCard(
	id: string,
	sentenceId: string,
	inLearning: boolean,
): SentenceReviewCard {
	return new SentenceReviewCard(
		id,
		"test",
		"test",
		["test"],
		inLearning ? learningSchedule() : graduatedSchedule(),
		sentenceId,
		"readingComprehension",
	);
}

function makeGrammarCard(id: string, inLearning: boolean): GrammarReviewCard {
	return new GrammarReviewCard(
		id,
		"test",
		"test",
		["test"],
		inLearning ? learningSchedule() : graduatedSchedule(),
		"svo-basic",
		"recognition",
	);
}

describe("ApprenticeService", () => {
	let storage: InMemoryStorage;
	let cardRepo: CardRepository;
	let service: ApprenticeService;

	beforeEach(() => {
		storage = new InMemoryStorage();
		cardRepo = new StorageCardRepository(storage);
		service = new ApprenticeService(cardRepo);
	});

	describe("getApprenticeCount", () => {
		it("counts cards with learningStep !== null across both pools", () => {
			cardRepo.save(makeScriptCard("s1", true));
			cardRepo.save(makeScriptCard("s2", false));
			cardRepo.save(makeVocabCard("v1", true));

			expect(service.getApprenticeCount()).toBe(2);
		});

		it("returns 0 when no cards exist", () => {
			expect(service.getApprenticeCount()).toBe(0);
		});
	});

	describe("canStartLesson", () => {
		it("returns true when count is below limit", () => {
			expect(service.canStartLesson()).toBe(true);
		});

		it("returns false when count is at limit", () => {
			for (let i = 0; i < MAX_APPRENTICE_ITEMS; i++) {
				cardRepo.save(makeScriptCard(`s${i}`, true));
			}

			expect(service.canStartLesson()).toBe(false);
		});

		it("returns false when count exceeds limit", () => {
			for (let i = 0; i < MAX_APPRENTICE_ITEMS + 5; i++) {
				cardRepo.save(makeScriptCard(`s${i}`, true));
			}

			expect(service.canStartLesson()).toBe(false);
		});

		describe("pool-specific limits", () => {
			it("uses script-specific limit of 35 for script pool", () => {
				for (let i = 0; i < MAX_SCRIPT_APPRENTICE_ITEMS; i++) {
					cardRepo.save(makeScriptCard(`s${i}`, true));
				}
				expect(service.canStartLesson("script")).toBe(false);
			});

			it("allows script when below 35 even if combined count is high", () => {
				for (let i = 0; i < MAX_SCRIPT_APPRENTICE_ITEMS - 1; i++) {
					cardRepo.save(makeScriptCard(`s${i}`, true));
				}
				expect(service.canStartLesson("script")).toBe(true);
			});

			it("falls back to combined limit for unspecified pools", () => {
				for (let i = 0; i < MAX_APPRENTICE_ITEMS; i++) {
					cardRepo.save(makeScriptCard(`s${i}`, true));
				}
				expect(service.canStartLesson("grammar")).toBe(false);
			});
		});

		describe("sentence-specific limit", () => {
			it("uses sentence-specific limit of 60 distinct sentences", () => {
				for (let i = 0; i < MAX_SENTENCE_APPRENTICE_ITEMS; i++) {
					cardRepo.save(makeSentenceCard(`sc${i}`, `sentence${i}`, true));
				}
				expect(service.canStartLesson("sentence")).toBe(false);
			});

			it("allows sentence lessons when below 60 distinct sentences", () => {
				for (let i = 0; i < MAX_SENTENCE_APPRENTICE_ITEMS - 1; i++) {
					cardRepo.save(makeSentenceCard(`sc${i}`, `sentence${i}`, true));
				}
				expect(service.canStartLesson("sentence")).toBe(true);
			});

			it("counts multiple cards for the same sentence as one toward the cap", () => {
				for (let i = 0; i < MAX_SENTENCE_APPRENTICE_ITEMS; i++) {
					// 3 cards per sentence, same sentenceId — still only 60 distinct sentences
					cardRepo.save(makeSentenceCard(`sc${i}a`, `sentence${i}`, true));
					cardRepo.save(makeSentenceCard(`sc${i}b`, `sentence${i}`, true));
					cardRepo.save(makeSentenceCard(`sc${i}c`, `sentence${i}`, true));
				}
				expect(service.canStartLesson("sentence")).toBe(false);
				expect(service.getSentenceApprenticeCount()).toBe(
					MAX_SENTENCE_APPRENTICE_ITEMS,
				);
			});

			it("does not count graduated sentence cards toward the cap", () => {
				for (let i = 0; i < MAX_SENTENCE_APPRENTICE_ITEMS; i++) {
					cardRepo.save(makeSentenceCard(`sc${i}`, `sentence${i}`, false));
				}
				expect(service.canStartLesson("sentence")).toBe(true);
			});
		});

		describe("sentence cards excluded from the shared vocab/grammar limit", () => {
			it("does not count sentence cards toward the combined limit for vocab", () => {
				for (let i = 0; i < MAX_APPRENTICE_ITEMS; i++) {
					cardRepo.save(makeSentenceCard(`sc${i}`, `sentence${i}`, true));
				}
				expect(service.canStartLesson("vocab")).toBe(true);
				expect(service.canStartLesson()).toBe(true);
			});

			it("still blocks vocab/grammar once non-sentence cards hit the combined limit", () => {
				for (let i = 0; i < MAX_APPRENTICE_ITEMS; i++) {
					cardRepo.save(makeVocabCard(`v${i}`, true));
				}
				for (let i = 0; i < 10; i++) {
					cardRepo.save(makeSentenceCard(`sc${i}`, `sentence${i}`, true));
				}
				expect(service.canStartLesson("grammar")).toBe(false);
			});
		});
	});

	describe("getApprenticeCountForPool", () => {
		it("returns count for a specific pool", () => {
			cardRepo.save(makeScriptCard("s1", true));
			cardRepo.save(makeScriptCard("s2", false));
			cardRepo.save(makeVocabCard("v1", true));

			expect(service.getApprenticeCountForPool("script")).toBe(1);
			expect(service.getApprenticeCountForPool("vocab")).toBe(1);
			expect(service.getApprenticeCountForPool("grammar")).toBe(0);
		});
	});

	describe("custom limit", () => {
		it("uses a custom limit", () => {
			const customService = new ApprenticeService(cardRepo, 2);

			cardRepo.save(makeScriptCard("s1", true));
			cardRepo.save(makeScriptCard("s2", true));

			expect(customService.canStartLesson()).toBe(false);
		});
	});

	describe("getApprenticeStats", () => {
		it("returns correct breakdown by pool", () => {
			cardRepo.save(makeScriptCard("s1", true));
			cardRepo.save(makeScriptCard("s2", false));
			cardRepo.save(makeVocabCard("v1", true));
			cardRepo.save(makeVocabCard("v2", true));

			const stats = service.getApprenticeStats();
			expect(stats.byPool.script).toBe(1);
			expect(stats.byPool.vocab).toBe(2);
			expect(stats.byPool.grammar).toBe(0);
			expect(stats.total).toBe(3);
			expect(stats.limit).toBe(MAX_APPRENTICE_ITEMS);
			expect(stats.isAtLimit).toBe(false);
		});

		it("counts grammar cards in apprentice stats", () => {
			cardRepo.save(makeGrammarCard("g1", true));
			cardRepo.save(makeGrammarCard("g2", false));

			const stats = service.getApprenticeStats();
			expect(stats.byPool.grammar).toBe(1);
			expect(stats.total).toBe(1);
		});

		it("includes grammar cards in total apprentice count", () => {
			cardRepo.save(makeScriptCard("s1", true));
			cardRepo.save(makeGrammarCard("g1", true));

			expect(service.getApprenticeCount()).toBe(2);
			const stats = service.getApprenticeStats();
			expect(stats.byPool.script).toBe(1);
			expect(stats.byPool.grammar).toBe(1);
			expect(stats.total).toBe(2);
		});

		it("reports isAtLimit when at the limit", () => {
			const customService = new ApprenticeService(cardRepo, 1);
			cardRepo.save(makeScriptCard("s1", true));

			const stats = customService.getApprenticeStats();
			expect(stats.isAtLimit).toBe(true);
		});

		it("does not count sentence cards toward isAtLimit", () => {
			const customService = new ApprenticeService(cardRepo, 1);
			cardRepo.save(makeSentenceCard("sc1", "sentence1", true));
			cardRepo.save(makeSentenceCard("sc2", "sentence2", true));

			const stats = customService.getApprenticeStats();
			expect(stats.total).toBe(2);
			expect(stats.isAtLimit).toBe(false);
		});

		it("includes sentence cards in total but reports isAtLimit off the non-sentence sum", () => {
			const customService = new ApprenticeService(cardRepo, 1);
			cardRepo.save(makeVocabCard("v1", true));
			cardRepo.save(makeSentenceCard("sc1", "sentence1", true));

			const stats = customService.getApprenticeStats();
			expect(stats.total).toBe(2);
			expect(stats.isAtLimit).toBe(true);
		});
	});
});
