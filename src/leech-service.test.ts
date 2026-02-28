import { beforeEach, describe, expect, it } from "vitest";
import { ScriptPropertyCard } from "./domain/script/entities/ScriptPropertyCard";
import { SrsSchedule } from "./domain/srs/value-objects/SrsSchedule";
import { VocabCard } from "./domain/vocabulary/entities/VocabCard";
import { StorageCardRepository } from "./infrastructure/persistence/StorageCardRepository";
import { DEFAULT_LEECH_THRESHOLD, LeechService } from "./leech-service";
import { InMemoryStorage } from "./storage";

function makeSchedule(lapseCount: number): SrsSchedule {
	return SrsSchedule.fromDTO({
		easeFactor: 2.0,
		interval: 10,
		repetitions: 0,
		learningStep: 1,
		nextReviewDate: new Date().toISOString(),
		lastReviewDate: null,
		lapseCount,
	});
}

function makeScriptCard(id: string, lapseCount: number): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		"test",
		"test",
		["test"],
		makeSchedule(lapseCount),
		"ก",
		"recognition",
		1,
	);
}

function makeVocabCard(id: string, lapseCount: number): VocabCard {
	return new VocabCard(
		id,
		"test",
		"test",
		["test"],
		makeSchedule(lapseCount),
		"มา",
		"thaiToEnglish",
	);
}

describe("LeechService", () => {
	let storage: InMemoryStorage;
	let service: LeechService;
	let cardRepo: StorageCardRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		cardRepo = new StorageCardRepository(storage);
		service = new LeechService(cardRepo);
	});

	describe("isLeech", () => {
		it("returns false when lapseCount is below threshold", () => {
			const card = makeScriptCard("c1", 3);
			expect(service.isLeech(card)).toBe(false);
		});

		it("returns true when lapseCount equals threshold", () => {
			const card = makeScriptCard("c1", DEFAULT_LEECH_THRESHOLD);
			expect(service.isLeech(card)).toBe(true);
		});

		it("returns true when lapseCount exceeds threshold", () => {
			const card = makeScriptCard("c1", DEFAULT_LEECH_THRESHOLD + 5);
			expect(service.isLeech(card)).toBe(true);
		});

		it("treats zero lapseCount as not leech", () => {
			const card = makeScriptCard("c1", 0);
			expect(service.isLeech(card)).toBe(false);
		});
	});

	describe("getLeechCards", () => {
		it("filters script cards when pool is script", () => {
			cardRepo.save(makeScriptCard("s1", 10));
			cardRepo.save(makeScriptCard("s2", 1));
			cardRepo.save(makeVocabCard("v1", 10));

			const leeches = service.getLeechCards("script");
			expect(leeches).toHaveLength(1);
			expect(leeches[0]?.id).toBe("s1");
		});

		it("filters vocab cards when pool is vocab", () => {
			cardRepo.save(makeScriptCard("s1", 10));
			cardRepo.save(makeVocabCard("v1", 10));

			const leeches = service.getLeechCards("vocab");
			expect(leeches).toHaveLength(1);
			expect(leeches[0]?.id).toBe("v1");
		});

		it("returns cards from all pools when pool is undefined", () => {
			cardRepo.save(makeScriptCard("s1", 10));
			cardRepo.save(makeVocabCard("v1", 10));

			const leeches = service.getLeechCards();
			expect(leeches).toHaveLength(2);
		});
	});

	describe("getLeechCount", () => {
		it("returns the correct count", () => {
			cardRepo.save(makeScriptCard("s1", 10));
			cardRepo.save(makeScriptCard("s2", 1));

			expect(service.getLeechCount("script")).toBe(1);
		});
	});

	describe("custom threshold", () => {
		it("uses a custom threshold", () => {
			const customService = new LeechService(cardRepo, 3);
			const card = makeScriptCard("c1", 3);
			expect(customService.isLeech(card)).toBe(true);
		});
	});
});
