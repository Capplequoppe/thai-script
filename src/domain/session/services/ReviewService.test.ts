import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import type { GrammarCard } from "../../grammar/types";
import { LearningService } from "../../script/services/ScriptLessonService";
import { DEFAULT_SRS_DATA } from "../../shared/types";
import type { VocabularyCard } from "../../vocabulary/types";
import { ReviewService } from "./ReviewService";

// Cards start at learning step 1 (interval 10 min), so they're due 10 min after creation.
// Use a future timestamp to simulate time passing so cards become due.
const FUTURE_NOW = new Date(Date.now() + 15 * 60 * 1000).toISOString();

describe("ReviewService", () => {
	let reviewService: ReviewService;
	let learningService: LearningService;
	let storage: InMemoryStorage;

	beforeEach(() => {
		storage = new InMemoryStorage();
		const cardRepo = new StorageCardRepository(storage);
		const stateRepo = new StorageLearnerStateRepository(storage);
		learningService = new LearningService(cardRepo, stateRepo);
		reviewService = new ReviewService(cardRepo, stateRepo);
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
			const emptyCardRepo = new StorageCardRepository(emptyStorage);
			const emptyStateRepo = new StorageLearnerStateRepository(emptyStorage);
			const emptyReview = new ReviewService(emptyCardRepo, emptyStateRepo);
			expect(emptyReview.getNextReviewDate()).toBeNull();
		});
	});

	describe("getReviewForecast", () => {
		it("returns all zeros for empty state", () => {
			const emptyStorage = new InMemoryStorage();
			const emptyCardRepo = new StorageCardRepository(emptyStorage);
			const emptyStateRepo = new StorageLearnerStateRepository(emptyStorage);
			const emptyReview = new ReviewService(emptyCardRepo, emptyStateRepo);
			const forecast = emptyReview.getReviewForecast();
			expect(forecast).toEqual({
				dueNow: 0,
				nextHour: 0,
				next24Hours: 0,
				next3Days: 0,
				next7Days: 0,
			});
		});

		it("correctly buckets cards by time window", () => {
			const now = "2025-01-01T12:00:00.000Z";
			const state = storage.load();
			const cards = Object.values(state.cards);

			// Set card review dates at different time windows
			const cardIds = cards.map((c) => c.id);

			// Due now (past)
			state.cards[cardIds[0]!]!.srs.nextReviewDate = "2025-01-01T11:00:00.000Z";
			// Due in 30 min (within 1 hour)
			state.cards[cardIds[1]!]!.srs.nextReviewDate = "2025-01-01T12:30:00.000Z";
			// Due in 12 hours (within 24 hours)
			state.cards[cardIds[2]!]!.srs.nextReviewDate = "2025-01-02T00:00:00.000Z";
			// Due in 2 days (within 3 days)
			state.cards[cardIds[3]!]!.srs.nextReviewDate = "2025-01-03T12:00:00.000Z";
			// Due in 5 days (within 7 days)
			state.cards[cardIds[4]!]!.srs.nextReviewDate = "2025-01-06T12:00:00.000Z";
			// Set remaining cards far in the future (beyond 7 days)
			for (let i = 5; i < cardIds.length; i++) {
				state.cards[cardIds[i]!]!.srs.nextReviewDate =
					"2025-02-01T00:00:00.000Z";
			}
			storage.save(state);

			const forecast = reviewService.getReviewForecast(now);
			expect(forecast.dueNow).toBe(1);
			expect(forecast.nextHour).toBe(2);
			expect(forecast.next24Hours).toBe(3);
			expect(forecast.next3Days).toBe(4);
			expect(forecast.next7Days).toBe(5);
		});

		it("cumulative counting (dueNow <= nextHour <= next24Hours <= next3Days <= next7Days)", () => {
			const forecast = reviewService.getReviewForecast(FUTURE_NOW);
			expect(forecast.dueNow).toBeLessThanOrEqual(forecast.nextHour);
			expect(forecast.nextHour).toBeLessThanOrEqual(forecast.next24Hours);
			expect(forecast.next24Hours).toBeLessThanOrEqual(forecast.next3Days);
			expect(forecast.next3Days).toBeLessThanOrEqual(forecast.next7Days);
		});

		it("burned cards are excluded from forecast", () => {
			const state = storage.load();
			const cards = Object.values(state.cards);
			// Burn all cards by setting them to graduated with very high interval
			for (const card of cards) {
				card.srs.learningStep = null;
				card.srs.interval = 120_960; // ENLIGHTENED_THRESHOLD_MINUTES (burned)
				card.srs.nextReviewDate = "2025-01-01T00:00:00.000Z";
			}
			storage.save(state);

			const forecast = reviewService.getReviewForecast(
				"2025-06-01T00:00:00.000Z",
			);
			expect(forecast).toEqual({
				dueNow: 0,
				nextHour: 0,
				next24Hours: 0,
				next3Days: 0,
				next7Days: 0,
			});
		});
	});

	describe("getCriticalItems", () => {
		it("sorted by ease factor ascending", () => {
			const state = storage.load();
			const cards = Object.values(state.cards);
			// Give cards different ease factors and mark as reviewed
			cards[0]!.srs.easeFactor = 2.5;
			cards[0]!.srs.repetitions = 3;
			cards[1]!.srs.easeFactor = 1.5;
			cards[1]!.srs.repetitions = 3;
			cards[2]!.srs.easeFactor = 1.8;
			cards[2]!.srs.repetitions = 3;
			storage.save(state);

			const items = reviewService.getCriticalItems();
			for (let i = 1; i < items.length; i++) {
				expect(items[i]!.easeFactor).toBeGreaterThanOrEqual(
					items[i - 1]!.easeFactor,
				);
			}
		});

		it("respects limit parameter", () => {
			const state = storage.load();
			// Mark all cards as reviewed
			for (const card of Object.values(state.cards)) {
				card.srs.repetitions = 1;
			}
			storage.save(state);

			const items = reviewService.getCriticalItems("script", 3);
			expect(items.length).toBeLessThanOrEqual(3);
		});

		it("excludes unreviewed cards (repetitions === 0)", () => {
			// All cards start with repetitions 0, so nothing should be returned
			const items = reviewService.getCriticalItems();
			expect(items).toHaveLength(0);
		});

		it("returns correct shape with lapseCount", () => {
			const state = storage.load();
			const card = Object.values(state.cards)[0]!;
			card.srs.repetitions = 5;
			card.srs.lapseCount = 3;
			storage.save(state);

			const items = reviewService.getCriticalItems();
			expect(items.length).toBeGreaterThan(0);
			const item = items[0]!;
			expect(item).toHaveProperty("id");
			expect(item).toHaveProperty("question");
			expect(item).toHaveProperty("correctAnswer");
			expect(item).toHaveProperty("easeFactor");
			expect(item).toHaveProperty("lapseCount");
			expect(item).toHaveProperty("interval");
			expect(item.lapseCount).toBe(3);
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
			expect(() =>
				reviewService.recordReview("vocab-1", 4, FUTURE_NOW),
			).toThrow("Card not found");
		});

		it("endReviewSession sets type to vocab-review for vocab pool", () => {
			seedVocabCards(storage);
			const session = reviewService.startReviewSession(
				undefined,
				FUTURE_NOW,
				"vocab",
			);
			session.results.push({ cardId: "vocab-1", rating: 4 });
			const summary = reviewService.endReviewSession(
				session,
				undefined,
				"vocab",
			);
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

	describe("grammar pool", () => {
		const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

		function makeGrammarCard(id: string, nextReviewDate: string): GrammarCard {
			return {
				id,
				grammarId: id.split(":")[1] ?? id,
				property: "recognition",
				question: "Test question",
				correctAnswer: "Test answer",
				choices: ["Test answer", "Wrong 1", "Wrong 2", "Wrong 3"],
				srs: {
					easeFactor: 2.0,
					interval: 10,
					repetitions: 0,
					learningStep: 1,
					nextReviewDate,
					lastReviewDate: null,
					lapseCount: 0,
				},
			};
		}

		function seedGrammarCards(store: InMemoryStorage): void {
			const state = store.load();
			state.grammarCards["grammar:g1:recognition"] = makeGrammarCard(
				"grammar:g1:recognition",
				pastDate,
			);
			store.save(state);
		}

		it("getDueCards returns grammar cards when pool is grammar", () => {
			seedGrammarCards(storage);
			const due = reviewService.getDueCards(FUTURE_NOW, "grammar");
			expect(due.length).toBe(1);
			expect(due[0]!.id).toBe("grammar:g1:recognition");
		});

		it("getDueCards with default pool does not return grammar cards", () => {
			seedGrammarCards(storage);
			const due = reviewService.getDueCards(FUTURE_NOW);
			for (const card of due) {
				expect(card.id).not.toBe("grammar:g1:recognition");
			}
		});

		it("recordReview updates grammar card SRS data", () => {
			seedGrammarCards(storage);
			reviewService.recordReview(
				"grammar:g1:recognition",
				4,
				FUTURE_NOW,
				undefined,
				"grammar",
			);

			const state = storage.load();
			const updated = state.grammarCards["grammar:g1:recognition"]!;
			expect(updated.srs.repetitions).toBe(1);
			expect(updated.srs.interval).toBe(60);
		});

		it("endReviewSession sets type to grammar-review for grammar pool", () => {
			seedGrammarCards(storage);
			const session = reviewService.startReviewSession(
				undefined,
				FUTURE_NOW,
				"grammar",
			);
			session.results.push({
				cardId: "grammar:g1:recognition",
				rating: 4,
			});
			const summary = reviewService.endReviewSession(
				session,
				undefined,
				"grammar",
			);
			expect(summary.type).toBe("grammar-review");
		});
	});
});
