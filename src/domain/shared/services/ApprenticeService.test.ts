import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { GrammarReviewCard } from "../../grammar/entities/GrammarReviewCard";
import type { CardRepository } from "../../ports/CardRepository";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import { ApprenticeService, MAX_APPRENTICE_ITEMS } from "./ApprenticeService";

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
	});
});
