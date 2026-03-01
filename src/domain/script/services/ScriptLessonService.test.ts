import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import { ReviewService } from "../../session/services/ReviewService";
import {
	ApprenticeService,
	MAX_SCRIPT_APPRENTICE_ITEMS,
} from "../../shared/services/ApprenticeService";
import type { SrsData } from "../../shared/types";
import { LearningService } from "./ScriptLessonService";

describe("LearningService", () => {
	let service: LearningService;
	let storage: InMemoryStorage;
	let cardRepo: StorageCardRepository;
	let stateRepo: StorageLearnerStateRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		cardRepo = new StorageCardRepository(storage);
		stateRepo = new StorageLearnerStateRepository(storage);
		service = new LearningService(cardRepo, stateRepo);
	});

	describe("startLesson", () => {
		it("starts lesson 1 and generates cards", () => {
			const lesson = service.startLesson(1);
			expect(lesson).not.toBeNull();
			expect(lesson?.lessonNumber).toBe(1);
			expect(lesson?.cards.length).toBeGreaterThan(0);
		});

		it("persists cards to storage", () => {
			service.startLesson(1);
			const state = storage.load();
			expect(Object.keys(state.cards).length).toBeGreaterThan(0);
		});

		it("sets currentLesson in state", () => {
			service.startLesson(1);
			const state = storage.load();
			expect(state.currentLesson).toBe(1);
		});

		it("throws if lesson is already completed", () => {
			service.startLesson(1);
			service.completeLesson(1);
			expect(() => service.startLesson(1)).toThrow();
		});

		it("requires sequential lessons (cannot skip)", () => {
			expect(() => service.startLesson(3)).toThrow();
		});
	});

	describe("completeLesson", () => {
		it("marks lesson as completed", () => {
			service.startLesson(1);
			service.completeLesson(1);
			const state = storage.load();
			expect(state.completedLessons).toContain(1);
			expect(state.currentLesson).toBeNull();
		});
	});

	describe("unlearnLesson", () => {
		it("removes lesson and its cards from state", () => {
			service.startLesson(1);
			service.completeLesson(1);
			service.unlearnLesson(1);
			const state = storage.load();
			expect(state.completedLessons).not.toContain(1);
			const lesson1Cards = Object.values(state.cards).filter(
				(c) => c.lessonNumber === 1,
			);
			expect(lesson1Cards).toHaveLength(0);
		});
	});

	describe("getNextLesson", () => {
		it("returns 1 when no lessons completed", () => {
			expect(service.getNextLesson()).toBe(1);
		});

		it("returns 2 after lesson 1 completed", () => {
			service.startLesson(1);
			service.completeLesson(1);
			expect(service.getNextLesson()).toBe(2);
		});

		it("returns null after all 25 lessons completed", () => {
			const _reviewService = new ReviewService(cardRepo, stateRepo);
			for (let i = 1; i <= 25; i++) {
				service.startLesson(i);
				service.completeLesson(i);
				// Graduate all cards for this lesson so mastery gate passes
				const state = storage.load();
				for (const card of Object.values(state.cards)) {
					if (card.lessonNumber === i && card.srs.learningStep !== null) {
						card.srs.learningStep = null;
						card.srs.interval = 4320;
					}
				}
				storage.save(state);
			}
			expect(service.getNextLesson()).toBeNull();
		});
	});

	describe("getLessonSummary", () => {
		it("returns lesson with symbol info for a given lesson number", () => {
			const summary = service.getLessonSummary(1);
			expect(summary.lessonNumber).toBe(1);
			expect(summary.consonants.length).toBeGreaterThan(0);
		});
	});

	describe("mastery gating", () => {
		function graduateAllCards(
			store: InMemoryStorage,
			lessonNumber: number,
		): void {
			const state = store.load();
			for (const card of Object.values(state.cards)) {
				if (card.lessonNumber === lessonNumber) {
					card.srs.learningStep = null;
					card.srs.interval = 4320;
				}
			}
			store.save(state);
		}

		it("lesson 1 is always available via isNextLessonAvailable", () => {
			expect(service.isNextLessonAvailable()).toBe(true);
		});

		it("startLesson allows lesson 2 after completing lesson 1", () => {
			service.startLesson(1);
			service.completeLesson(1);
			expect(service.startLesson(2)).not.toBeNull();
		});

		it("getLessonMasteryProgress returns correct total/graduated/percentage", () => {
			service.startLesson(1);
			service.completeLesson(1);

			const beforeProgress = service.getLessonMasteryProgress(1);
			expect(beforeProgress.total).toBeGreaterThan(0);
			expect(beforeProgress.graduated).toBe(0);
			expect(beforeProgress.percentage).toBe(0);

			// Graduate all cards
			graduateAllCards(storage, 1);

			const afterProgress = service.getLessonMasteryProgress(1);
			expect(afterProgress.graduated).toBe(afterProgress.total);
			expect(afterProgress.percentage).toBe(1);
		});

		it("startLesson succeeds when previous lesson is mastered", () => {
			service.startLesson(1);
			service.completeLesson(1);
			graduateAllCards(storage, 1);

			const lesson2 = service.startLesson(2);
			expect(lesson2).not.toBeNull();
			expect(lesson2?.lessonNumber).toBe(2);
		});

		it("isNextLessonAvailable returns true after completing lessons", () => {
			service.startLesson(1);
			service.completeLesson(1);
			service.startLesson(2);
			service.completeLesson(2);
			service.startLesson(3);
			service.completeLesson(3);
			expect(service.isNextLessonAvailable()).toBe(true);
		});
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

		it("returns null when ApprenticeService says at script limit", () => {
			const apprenticeService = new ApprenticeService(cardRepo);

			const state = storage.load();
			// Fill up the script apprentice stage to MAX_SCRIPT_APPRENTICE_ITEMS
			for (let i = 0; i < MAX_SCRIPT_APPRENTICE_ITEMS; i++) {
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

			const gatedService = new LearningService(
				cardRepo,
				stateRepo,
				apprenticeService,
			);
			const result = gatedService.startLesson(1);
			expect(result).toBeNull();
		});

		it("works normally without ApprenticeService (backward compat)", () => {
			const result = service.startLesson(1);
			expect(result).not.toBeNull();
			expect(result?.lessonNumber).toBe(1);
		});
	});
});
