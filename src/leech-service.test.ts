import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_LEECH_THRESHOLD, LeechService } from "./leech-service";
import { InMemoryStorage } from "./storage";
import type { SrsCard, SrsData } from "./types";

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

function makeSrsCard(id: string, overrides: Partial<SrsData> = {}): SrsCard {
	return {
		id,
		question: "test",
		correctAnswer: "test",
		choices: ["test"],
		srs: makeSrsData(overrides),
	};
}

describe("LeechService", () => {
	let storage: InMemoryStorage;
	let service: LeechService;

	beforeEach(() => {
		storage = new InMemoryStorage();
		service = new LeechService(storage);
	});

	describe("isLeech", () => {
		it("returns false when lapseCount is below threshold", () => {
			const card = makeSrsCard("c1", { lapseCount: 3 });
			expect(service.isLeech(card)).toBe(false);
		});

		it("returns true when lapseCount equals threshold", () => {
			const card = makeSrsCard("c1", {
				lapseCount: DEFAULT_LEECH_THRESHOLD,
			});
			expect(service.isLeech(card)).toBe(true);
		});

		it("returns true when lapseCount exceeds threshold", () => {
			const card = makeSrsCard("c1", {
				lapseCount: DEFAULT_LEECH_THRESHOLD + 5,
			});
			expect(service.isLeech(card)).toBe(true);
		});

		it("treats undefined lapseCount as 0", () => {
			const card = makeSrsCard("c1");
			card.srs.lapseCount = undefined;
			expect(service.isLeech(card)).toBe(false);
		});
	});

	describe("getLeechCards", () => {
		it("filters script cards when pool is script", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.cards["s2"] = {
				id: "s2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 1 }),
				symbolCharacter: "ข",
				property: "recognition",
				lessonNumber: 1,
			};
			state.vocabCards["v1"] = {
				id: "v1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				wordThai: "มา",
				property: "thaiToEnglish",
			};
			storage.save(state);

			const leeches = service.getLeechCards("script");
			expect(leeches).toHaveLength(1);
			expect(leeches[0]!.id).toBe("s1");
		});

		it("filters vocab cards when pool is vocab", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.vocabCards["v1"] = {
				id: "v1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				wordThai: "มา",
				property: "thaiToEnglish",
			};
			storage.save(state);

			const leeches = service.getLeechCards("vocab");
			expect(leeches).toHaveLength(1);
			expect(leeches[0]!.id).toBe("v1");
		});

		it("returns cards from both pools when pool is undefined", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.vocabCards["v1"] = {
				id: "v1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				wordThai: "มา",
				property: "thaiToEnglish",
			};
			storage.save(state);

			const leeches = service.getLeechCards();
			expect(leeches).toHaveLength(2);
		});
	});

	describe("getLeechCount", () => {
		it("returns the correct count", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 10 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.cards["s2"] = {
				id: "s2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ lapseCount: 1 }),
				symbolCharacter: "ข",
				property: "recognition",
				lessonNumber: 1,
			};
			storage.save(state);

			expect(service.getLeechCount("script")).toBe(1);
		});
	});

	describe("custom threshold", () => {
		it("uses a custom threshold", () => {
			const customService = new LeechService(storage, 3);
			const card = makeSrsCard("c1", { lapseCount: 3 });
			expect(customService.isLeech(card)).toBe(true);
		});
	});
});
