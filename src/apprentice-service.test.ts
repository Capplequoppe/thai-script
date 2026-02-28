import { beforeEach, describe, expect, it } from "vitest";
import { ApprenticeService, MAX_APPRENTICE_ITEMS } from "./apprentice-service";
import { InMemoryStorage } from "./storage";
import type { SrsData } from "./types";

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

describe("ApprenticeService", () => {
	let storage: InMemoryStorage;
	let service: ApprenticeService;

	beforeEach(() => {
		storage = new InMemoryStorage();
		service = new ApprenticeService(storage);
	});

	describe("getApprenticeCount", () => {
		it("counts cards with learningStep !== null across both pools", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.cards["s2"] = {
				id: "s2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: null }),
				symbolCharacter: "ข",
				property: "recognition",
				lessonNumber: 1,
			};
			state.vocabCards["v1"] = {
				id: "v1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 2 }),
				wordThai: "มา",
				property: "thaiToEnglish",
			};
			storage.save(state);

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
			const state = storage.load();
			for (let i = 0; i < MAX_APPRENTICE_ITEMS; i++) {
				state.cards[`s${i}`] = {
					id: `s${i}`,
					question: "test",
					correctAnswer: "test",
					choices: ["test"],
					srs: makeSrsData({ learningStep: 1 }),
					symbolCharacter: "ก",
					property: "recognition",
					lessonNumber: 1,
				};
			}
			storage.save(state);

			expect(service.canStartLesson()).toBe(false);
		});

		it("returns false when count exceeds limit", () => {
			const state = storage.load();
			for (let i = 0; i < MAX_APPRENTICE_ITEMS + 5; i++) {
				state.cards[`s${i}`] = {
					id: `s${i}`,
					question: "test",
					correctAnswer: "test",
					choices: ["test"],
					srs: makeSrsData({ learningStep: 1 }),
					symbolCharacter: "ก",
					property: "recognition",
					lessonNumber: 1,
				};
			}
			storage.save(state);

			expect(service.canStartLesson()).toBe(false);
		});
	});

	describe("custom limit", () => {
		it("uses a custom limit", () => {
			const customService = new ApprenticeService(storage, 2);

			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.cards["s2"] = {
				id: "s2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ข",
				property: "recognition",
				lessonNumber: 1,
			};
			storage.save(state);

			expect(customService.canStartLesson()).toBe(false);
		});
	});

	describe("getApprenticeStats", () => {
		it("returns correct breakdown by pool", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.cards["s2"] = {
				id: "s2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: null }),
				symbolCharacter: "ข",
				property: "recognition",
				lessonNumber: 1,
			};
			state.vocabCards["v1"] = {
				id: "v1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 2 }),
				wordThai: "มา",
				property: "thaiToEnglish",
			};
			state.vocabCards["v2"] = {
				id: "v2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 3 }),
				wordThai: "นา",
				property: "thaiToEnglish",
			};
			storage.save(state);

			const stats = service.getApprenticeStats();
			expect(stats.script).toBe(1);
			expect(stats.vocab).toBe(2);
			expect(stats.grammar).toBe(0);
			expect(stats.count).toBe(3);
			expect(stats.limit).toBe(MAX_APPRENTICE_ITEMS);
			expect(stats.isAtLimit).toBe(false);
		});

		it("counts grammar cards in apprentice stats", () => {
			const state = storage.load();
			state.grammarCards["g1"] = {
				id: "g1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				grammarId: "svo-basic",
				property: "recognition",
			};
			state.grammarCards["g2"] = {
				id: "g2",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: null }),
				grammarId: "svo-basic",
				property: "application",
			};
			storage.save(state);

			const stats = service.getApprenticeStats();
			expect(stats.grammar).toBe(1);
			expect(stats.count).toBe(1);
		});

		it("includes grammar cards in total apprentice count", () => {
			const state = storage.load();
			state.cards["s1"] = {
				id: "s1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 1 }),
				symbolCharacter: "ก",
				property: "recognition",
				lessonNumber: 1,
			};
			state.grammarCards["g1"] = {
				id: "g1",
				question: "test",
				correctAnswer: "test",
				choices: ["test"],
				srs: makeSrsData({ learningStep: 2 }),
				grammarId: "svo-basic",
				property: "recognition",
			};
			storage.save(state);

			expect(service.getApprenticeCount()).toBe(2);
			const stats = service.getApprenticeStats();
			expect(stats.script).toBe(1);
			expect(stats.grammar).toBe(1);
			expect(stats.count).toBe(2);
		});

		it("reports isAtLimit when at the limit", () => {
			const customService = new ApprenticeService(storage, 1);
			const state = storage.load();
			state.cards["s1"] = {
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

			const stats = customService.getApprenticeStats();
			expect(stats.isAtLimit).toBe(true);
		});
	});
});
