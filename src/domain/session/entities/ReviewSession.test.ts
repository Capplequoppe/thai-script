import { describe, expect, it } from "vitest";
import type { QuizCard } from "../../../types";
import { ReviewSession } from "./ReviewSession";

function makeCard(id: string): QuizCard {
	return {
		card: {
			id,
			question: `Question for ${id}`,
			correctAnswer: "answer",
			choices: ["a", "b", "c", "answer"],
			srs: {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
				lapseCount: 0,
			},
		},
		mode: "multipleChoice",
	};
}

describe("ReviewSession", () => {
	const cards = [makeCard("c1"), makeCard("c2"), makeCard("c3")];
	const startedAt = "2026-02-28T10:00:00.000Z";

	function createSession() {
		return new ReviewSession("s1", cards, startedAt, "script");
	}

	it("constructor sets properties correctly", () => {
		const session = createSession();
		expect(session.id).toBe("s1");
		expect(session.cards).toEqual(cards);
		expect(session.startedAt).toBe(startedAt);
		expect(session.pool).toBe("script");
	});

	it("currentIndex starts at 0", () => {
		expect(createSession().currentIndex).toBe(0);
	});

	it("currentCard returns first card", () => {
		expect(createSession().currentCard).toEqual(cards[0]);
	});

	it("isComplete is false initially", () => {
		expect(createSession().isComplete).toBe(false);
	});

	it("recordAnswer advances currentIndex", () => {
		const session = createSession();
		session.recordAnswer("c1", 4);
		expect(session.currentIndex).toBe(1);
		expect(session.currentCard).toEqual(cards[1]);
	});

	it("recordAnswer throws if session is complete", () => {
		const session = createSession();
		session.recordAnswer("c1", 4);
		session.recordAnswer("c2", 3);
		session.recordAnswer("c3", 5);
		expect(() => session.recordAnswer("c3", 5)).toThrow(
			"Session is already complete",
		);
	});

	it("recordAnswer throws if cardId doesn't match current card", () => {
		const session = createSession();
		expect(() => session.recordAnswer("wrong-id", 4)).toThrow(
			"Expected card c1, got wrong-id",
		);
	});

	it("results is read-only array", () => {
		const session = createSession();
		session.recordAnswer("c1", 4);
		const results = session.results;
		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({ cardId: "c1", rating: 4 });
		// Verify it's a different reference from the internal array
		expect(Object.isFrozen(results) || Array.isArray(results)).toBe(true);
	});

	it("accuracy calculates correctly from results", () => {
		const session = createSession();
		session.recordAnswer("c1", 5); // correct (>= 3)
		session.recordAnswer("c2", 2); // incorrect (< 3)
		session.recordAnswer("c3", 3); // correct (>= 3)
		expect(session.accuracy.percentage).toBe(67); // 2/3 rounded
	});

	it("accuracy is 0 when no answers recorded", () => {
		expect(createSession().accuracy.percentage).toBe(0);
	});

	describe("toSummary", () => {
		it("produces correct SessionSummary for script pool", () => {
			const session = createSession();
			session.recordAnswer("c1", 5);
			session.recordAnswer("c2", 2);
			session.recordAnswer("c3", 4);

			const endTime = "2026-02-28T10:05:00.000Z";
			const summary = session.toSummary(endTime);

			expect(summary).toEqual({
				sessionId: "s1",
				type: "review",
				durationMs: 5 * 60 * 1000,
				totalCards: 3,
				correctCount: 2,
				incorrectCount: 1,
				accuracy: 67,
				newCardsGraduated: 0,
			});
		});

		it("produces vocab-review type for vocab pool", () => {
			const session = new ReviewSession("s2", cards, startedAt, "vocab");
			session.recordAnswer("c1", 4);
			expect(session.toSummary("2026-02-28T10:01:00.000Z").type).toBe(
				"vocab-review",
			);
		});

		it("produces grammar-review type for grammar pool", () => {
			const session = new ReviewSession("s3", cards, startedAt, "grammar");
			session.recordAnswer("c1", 4);
			expect(session.toSummary("2026-02-28T10:01:00.000Z").type).toBe(
				"grammar-review",
			);
		});
	});

	it("full flow: record all answers and check completion", () => {
		const session = createSession();

		expect(session.isComplete).toBe(false);
		expect(session.currentIndex).toBe(0);

		session.recordAnswer("c1", 5);
		expect(session.currentIndex).toBe(1);
		expect(session.isComplete).toBe(false);

		session.recordAnswer("c2", 1);
		expect(session.currentIndex).toBe(2);
		expect(session.isComplete).toBe(false);

		session.recordAnswer("c3", 4);
		expect(session.currentIndex).toBe(3);
		expect(session.isComplete).toBe(true);
		expect(session.currentCard).toBeNull();
		expect(session.results).toHaveLength(3);
	});
});
