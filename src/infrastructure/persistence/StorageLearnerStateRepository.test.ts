import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../storage";
import type { SessionSummary } from "../../types";
import { StorageLearnerStateRepository } from "./StorageLearnerStateRepository";

function makeSummary(id: string): SessionSummary {
	return {
		sessionId: id,
		type: "review",
		durationMs: 60000,
		totalCards: 10,
		correctCount: 8,
		incorrectCount: 2,
		accuracy: 0.8,
		newCardsGraduated: 0,
	};
}

describe("StorageLearnerStateRepository", () => {
	let storage: InMemoryStorage;
	let repo: StorageLearnerStateRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repo = new StorageLearnerStateRepository(storage);
	});

	describe("completed lessons", () => {
		it("returns empty array initially", () => {
			expect(repo.getCompletedLessons()).toEqual([]);
		});

		it("adds a completed lesson", () => {
			repo.addCompletedLesson(1);
			expect(repo.getCompletedLessons()).toContain(1);
		});

		it("does not add duplicate lessons", () => {
			repo.addCompletedLesson(1);
			repo.addCompletedLesson(1);
			expect(repo.getCompletedLessons()).toEqual([1]);
		});

		it("adds multiple distinct lessons", () => {
			repo.addCompletedLesson(1);
			repo.addCompletedLesson(2);
			repo.addCompletedLesson(3);
			expect(repo.getCompletedLessons()).toEqual([1, 2, 3]);
		});

		it("removes a completed lesson", () => {
			repo.addCompletedLesson(1);
			repo.addCompletedLesson(2);
			repo.removeCompletedLesson(1);
			expect(repo.getCompletedLessons()).toEqual([2]);
		});

		it("does not throw when removing a nonexistent lesson", () => {
			expect(() => repo.removeCompletedLesson(99)).not.toThrow();
		});
	});

	describe("current lesson", () => {
		it("returns null initially", () => {
			expect(repo.getCurrentLesson()).toBeNull();
		});

		it("sets and gets current lesson", () => {
			repo.setCurrentLesson(5);
			expect(repo.getCurrentLesson()).toBe(5);
		});

		it("clears current lesson with null", () => {
			repo.setCurrentLesson(5);
			repo.setCurrentLesson(null);
			expect(repo.getCurrentLesson()).toBeNull();
		});
	});

	describe("session history", () => {
		it("returns empty array initially", () => {
			expect(repo.getSessionHistory()).toEqual([]);
		});

		it("adds a session summary", () => {
			const summary = makeSummary("s1");
			repo.addSession(summary);
			const history = repo.getSessionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].sessionId).toBe("s1");
		});

		it("preserves order of added sessions", () => {
			repo.addSession(makeSummary("s1"));
			repo.addSession(makeSummary("s2"));
			const history = repo.getSessionHistory();
			expect(history).toHaveLength(2);
			expect(history[0].sessionId).toBe("s1");
			expect(history[1].sessionId).toBe("s2");
		});
	});

	describe("reset", () => {
		it("clears all state", () => {
			repo.addCompletedLesson(1);
			repo.setCurrentLesson(5);
			repo.addSession(makeSummary("s1"));

			repo.reset();

			expect(repo.getCompletedLessons()).toEqual([]);
			expect(repo.getCurrentLesson()).toBeNull();
			expect(repo.getSessionHistory()).toEqual([]);
		});
	});

	describe("export and import", () => {
		it("exports data as JSON string", () => {
			repo.addCompletedLesson(1);
			const exported = repo.exportData();
			const parsed = JSON.parse(exported);
			expect(parsed.completedLessons).toContain(1);
		});

		it("imports data from JSON string", () => {
			repo.addCompletedLesson(1);
			const exported = repo.exportData();

			repo.reset();
			expect(repo.getCompletedLessons()).toEqual([]);

			repo.importData(exported);
			expect(repo.getCompletedLessons()).toContain(1);
		});
	});
});
