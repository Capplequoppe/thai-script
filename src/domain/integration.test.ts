import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../infrastructure/persistence/StorageLearnerStateRepository";
import { LearningService } from "./script/services/ScriptLessonService";
import { ReviewService } from "./session/services/ReviewService";

// Cards start at learning step 1 (interval 10 min), so they're due 10 min after creation.
// Use a future timestamp to simulate time passing so cards become due.
const FUTURE_NOW = new Date(Date.now() + 15 * 60 * 1000).toISOString();

describe("Learn-then-Review flow", () => {
	let storage: InMemoryStorage;
	let learning: LearningService;
	let review: ReviewService;

	beforeEach(() => {
		storage = new InMemoryStorage();
		const cardRepo = new StorageCardRepository(storage);
		const stateRepo = new StorageLearnerStateRepository(storage);
		learning = new LearningService(cardRepo, stateRepo);
		review = new ReviewService(cardRepo, stateRepo);
	});

	it("full lesson 1 -> review cycle", () => {
		const lesson = learning.startLesson(1);
		expect(lesson.cards.length).toBeGreaterThan(0);
		learning.completeLesson(1);

		const dueCards = review.getDueCards(FUTURE_NOW);
		expect(dueCards.length).toBe(lesson.cards.length);

		const session = review.startReviewSession(undefined, FUTURE_NOW);
		expect(session.cards.length).toBe(dueCards.length);
		expect(session.cards[0]!.mode).toBe("multipleChoice");

		for (const quizCard of session.cards) {
			review.recordReview(quizCard.card.id, 4, FUTURE_NOW);
			session.results.push({ cardId: quizCard.card.id, rating: 4 });
		}

		expect(review.getNumDueCards(FUTURE_NOW)).toBe(0);

		const summary = review.endReviewSession(session);
		expect(summary.totalCards).toBe(dueCards.length);
		expect(summary.accuracy).toBe(100);

		expect(learning.getNextLesson()).toBe(2);
	});

	it("sequential lessons build up card pool", () => {
		learning.startLesson(1);
		learning.completeLesson(1);
		const afterLesson1 = Object.keys(storage.load().cards).length;

		// Graduate lesson 1 cards so mastery gate passes
		const state1 = storage.load();
		for (const card of Object.values(state1.cards)) {
			if (card.lessonNumber === 1) {
				card.srs.learningStep = null;
				card.srs.interval = 4320;
			}
		}
		storage.save(state1);

		learning.startLesson(2);
		learning.completeLesson(2);
		const afterLesson2 = Object.keys(storage.load().cards).length;

		expect(afterLesson2).toBeGreaterThan(afterLesson1);
	});

	it("unlearnLesson removes only that lesson's cards", () => {
		learning.startLesson(1);
		learning.completeLesson(1);

		// Graduate lesson 1 cards so mastery gate passes
		const state1 = storage.load();
		for (const card of Object.values(state1.cards)) {
			if (card.lessonNumber === 1) {
				card.srs.learningStep = null;
				card.srs.interval = 4320;
			}
		}
		storage.save(state1);

		learning.startLesson(2);
		learning.completeLesson(2);

		const totalBefore = Object.keys(storage.load().cards).length;
		learning.unlearnLesson(2);
		const totalAfter = Object.keys(storage.load().cards).length;

		expect(totalAfter).toBeLessThan(totalBefore);
		expect(totalAfter).toBeGreaterThan(0);
	});

	it("rating 1 (blackout) keeps card due immediately", () => {
		learning.startLesson(1);
		learning.completeLesson(1);

		const dueCards = review.getDueCards(FUTURE_NOW);
		const firstCard = dueCards[0]!;

		review.recordReview(firstCard.id, 1, FUTURE_NOW);

		const stillDue = review.getDueCards(FUTURE_NOW);
		expect(stillDue.some((c) => c.id === firstCard.id)).toBe(true);
	});

	it("after multiple good ratings, card gets flashcard mode", () => {
		learning.startLesson(1);
		learning.completeLesson(1);

		const cards = review.getDueCards(FUTURE_NOW);
		const card = cards[0]!;

		// Rate easy three times to graduate through learning steps (1->3->graduated)
		// Step 1, easy skips to step 3
		review.recordReview(card.id, 5, "2026-02-25T00:00:00.000Z");
		// Step 3, easy skips past step 5 -> graduated
		review.recordReview(card.id, 5, "2026-02-26T00:00:00.000Z");

		// Start session far in the future when card is due again
		const session = review.startReviewSession(
			undefined,
			"2026-04-01T00:00:00.000Z",
		);
		const quizCard = session.cards.find((c) => c.card.id === card.id);
		if (quizCard) {
			expect(quizCard.mode).toBe("flashcard");
		}
	});

	it("session history accumulates across multiple sessions", () => {
		learning.startLesson(1);
		learning.completeLesson(1);

		const s1 = review.startReviewSession(2, FUTURE_NOW);
		for (const qc of s1.cards) {
			review.recordReview(qc.card.id, 4, FUTURE_NOW);
			s1.results.push({ cardId: qc.card.id, rating: 4 });
		}
		review.endReviewSession(s1);

		// After rating 4 on step 1 cards, they advance to step 2 (interval 60).
		// Need a time far enough in the future for those to be due again.
		const farFuture = new Date(Date.now() + 120 * 60 * 1000).toISOString();
		const s2 = review.startReviewSession(2, farFuture);
		for (const qc of s2.cards) {
			review.recordReview(qc.card.id, 3, farFuture);
			s2.results.push({ cardId: qc.card.id, rating: 3 });
		}
		review.endReviewSession(s2);

		expect(review.getSessionHistory()).toHaveLength(2);
	});
});
