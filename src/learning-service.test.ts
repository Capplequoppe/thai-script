import { beforeEach, describe, expect, it } from "vitest";
import { LearningService } from "./learning-service";
import { InMemoryStorage } from "./storage";

describe("LearningService", () => {
	let service: LearningService;
	let storage: InMemoryStorage;

	beforeEach(() => {
		storage = new InMemoryStorage();
		service = new LearningService(storage);
	});

	describe("startLesson", () => {
		it("starts lesson 1 and generates cards", () => {
			const lesson = service.startLesson(1);
			expect(lesson.lessonNumber).toBe(1);
			expect(lesson.cards.length).toBeGreaterThan(0);
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
			for (let i = 1; i <= 25; i++) {
				service.startLesson(i);
				service.completeLesson(i);
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
});
