import { beforeEach, describe, expect, it } from "vitest";
import { LearningService } from "./learning-service";
import { ReviewService } from "./review-service";
import { InMemoryStorage } from "./storage";
import type { VocabularyCard } from "./vocabulary-types";
import { DEFAULT_SRS_DATA } from "./types";

// Cards start at learning step 1 (interval 10 min), so they're due 10 min after creation.
// Use a future timestamp to simulate time passing so cards become due.
const FUTURE_NOW = new Date(Date.now() + 15 * 60 * 1000).toISOString();

describe("ReviewService", () => {
	let reviewService: ReviewService;
	let learningService: LearningService;
	let storage: InMemoryStorage;

	beforeEach(() => {
		storage = new InMemoryStorage();
		learningService = new LearningService(storage);
		reviewService = new ReviewService(storage);
		// Complete lesson 1 so there are cards to review
		learningService.startLesson(1);
		learningService.completeLesson(1);
	});

	describe("getDueCards", () => {
		it("returns cards that are due for review", () => {
			const due = reviewService.getDueCards(FUTURE_NOW);
			expect(due.length).toBeGreaterThan(0);
		});

		it("returns no cards when none are due", () => {
			const due = reviewService.getDueCards(FUTURE_NOW);
			for (const card of due) {
				reviewService.recordReview(card.id, 5, FUTURE_NOW);
			}
			const dueAfter = reviewService.getDueCards(FUTURE_NOW);
			expect(dueAfter).toHaveLength(0);
		});
	});

	describe("recordReview", () => {
		it("updates the card SRS data", () => {
			const due = reviewService.getDueCards(FUTURE_NOW);
			const card = due[0]!;
			// Card is at step 1; rating 4 advances to step 2 (interval 60)
			reviewService.recordReview(card.id, 4, FUTURE_NOW);

			const state = storage.load();
			const updated = state.cards[card.id]!;
			expect(updated.srs.repetitions).toBe(1);
			expect(updated.srs.interval).toBe(60);
		});

		it("rating 1 keeps card due immediately", () => {
			const due = reviewService.getDueCards(FUTURE_NOW);
			const card = due[0]!;
			reviewService.recordReview(card.id, 1, FUTURE_NOW);

			const state = storage.load();
			const updated = state.cards[card.id]!;
			expect(updated.srs.interval).toBe(0);
		});

		it("throws for unknown card ID", () => {
			expect(() => reviewService.recordReview("nonexistent", 4)).toThrow(
				"Card not found",
			);
		});

		it("card graduates after completing all learning steps", () => {
			const due = reviewService.getDueCards(FUTURE_NOW);
			const card = due[0]!;
			// Starts at step 1 (from createSrsData), so 4 reviews to graduate:
			reviewService.recordReview(card.id, 4, FUTURE_NOW); // step 1 -> 2
			reviewService.recordReview(card.id, 4, FUTURE_NOW); // step 2 -> 3
			reviewService.recordReview(card.id, 4, FUTURE_NOW); // step 3 -> 4
			reviewService.recordReview(card.id, 4, FUTURE_NOW); // step 4 -> graduated
			const state = storage.load();
			const graduated = state.cards[card.id]!;
			expect(graduated.srs.learningStep).toBeNull();
			expect(graduated.srs.interval).toBe(4320);
		});
	});

	describe("getNumDueCards", () => {
		it("returns count of due cards", () => {
			const count = reviewService.getNumDueCards(FUTURE_NOW);
			expect(count).toBeGreaterThan(0);
		});
	});

	describe("startReviewSession", () => {
		it("creates a session with due cards", () => {
			const session = reviewService.startReviewSession(undefined, FUTURE_NOW);
			expect(session.id).toBeTruthy();
			expect(session.cards.length).toBeGreaterThan(0);
			expect(session.startedAt).toBeTruthy();
		});

		it("limits session to maxCards", () => {
			const session = reviewService.startReviewSession(3, FUTURE_NOW);
			expect(session.cards.length).toBeLessThanOrEqual(3);
		});

		it("new cards get multipleChoice mode", () => {
			const session = reviewService.startReviewSession(undefined, FUTURE_NOW);
			expect(session.cards[0]!.mode).toBe("multipleChoice");
		});
	});

	describe("endReviewSession", () => {
		it("returns session summary with accuracy", () => {
			const session = reviewService.startReviewSession(undefined, FUTURE_NOW);
			// Record some results
			for (const qc of session.cards.slice(0, 3)) {
				session.results.push({ cardId: qc.card.id, rating: 4 });
			}
			const summary = reviewService.endReviewSession(session);
			expect(summary.totalCards).toBe(3);
			expect(summary.accuracy).toBe(100);
			expect(summary.type).toBe("review");
		});

		it("persists summary to session history", () => {
			const session = reviewService.startReviewSession(undefined, FUTURE_NOW);
			reviewService.endReviewSession(session);
			const history = reviewService.getSessionHistory();
			expect(history).toHaveLength(1);
		});
	});

	describe("getNextReviewDate", () => {
		it("returns earliest next review date", () => {
			const date = reviewService.getNextReviewDate();
			expect(date).toBeInstanceOf(Date);
		});

		it("returns null when no cards exist", () => {
			const emptyStorage = new InMemoryStorage();
			const emptyReview = new ReviewService(emptyStorage);
			expect(emptyReview.getNextReviewDate()).toBeNull();
		});
	});

	describe("vocab pool", () => {
		function seedVocabCards(store: InMemoryStorage): void {
			const state = store.load();
			const now = new Date().toISOString();
			const vocabCard: VocabularyCard = {
				id: "vocab-1",
				question: "What does สวัสดี mean?",
				correctAnswer: "hello",
				choices: ["hello", "goodbye", "thanks", "sorry"],
				srs: { ...DEFAULT_SRS_DATA, nextReviewDate: now },
				wordThai: "สวัสดี",
				property: "thaiToEnglish",
			};
			state.vocabCards[vocabCard.id] = vocabCard;
			store.save(state);
		}

		it("getDueCards returns vocab cards when pool is vocab", () => {
			seedVocabCards(storage);
			const due = reviewService.getDueCards(FUTURE_NOW, "vocab");
			expect(due.length).toBe(1);
			expect(due[0]!.id).toBe("vocab-1");
		});

		it("getDueCards with default pool does not return vocab cards", () => {
			seedVocabCards(storage);
			const due = reviewService.getDueCards(FUTURE_NOW);
			for (const card of due) {
				expect(card.id).not.toBe("vocab-1");
			}
		});

		it("recordReview updates vocab card SRS data", () => {
			seedVocabCards(storage);
			reviewService.recordReview("vocab-1", 4, FUTURE_NOW, undefined, "vocab");

			const state = storage.load();
			const updated = state.vocabCards["vocab-1"]!;
			expect(updated.srs.repetitions).toBe(1);
			expect(updated.srs.interval).toBe(60);
		});

		it("recordReview throws for vocab card when using script pool", () => {
			seedVocabCards(storage);
			expect(() => reviewService.recordReview("vocab-1", 4, FUTURE_NOW)).toThrow(
				"Card not found",
			);
		});

		it("endReviewSession sets type to vocab-review for vocab pool", () => {
			seedVocabCards(storage);
			const session = reviewService.startReviewSession(undefined, FUTURE_NOW, "vocab");
			session.results.push({ cardId: "vocab-1", rating: 4 });
			const summary = reviewService.endReviewSession(session, undefined, "vocab");
			expect(summary.type).toBe("vocab-review");
		});

		it("getNextReviewDate works with vocab pool", () => {
			seedVocabCards(storage);
			const date = reviewService.getNextReviewDate("vocab");
			expect(date).toBeInstanceOf(Date);
		});

		it("getNextReviewDate returns null for empty vocab pool", () => {
			const date = reviewService.getNextReviewDate("vocab");
			expect(date).toBeNull();
		});
	});
});
