import { describe, it, expect, beforeEach } from "vitest";
import { ReviewService } from "./review-service";
import { LearningService } from "./learning-service";
import { InMemoryStorage } from "./storage";

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
      const due = reviewService.getDueCards();
      expect(due.length).toBeGreaterThan(0);
    });

    it("returns no cards when none are due", () => {
      const due = reviewService.getDueCards();
      for (const card of due) {
        reviewService.recordReview(card.id, 5);
      }
      const dueAfter = reviewService.getDueCards();
      expect(dueAfter).toHaveLength(0);
    });
  });

  describe("recordReview", () => {
    it("updates the card SRS data", () => {
      const due = reviewService.getDueCards();
      const card = due[0]!;
      reviewService.recordReview(card.id, 4);

      const state = storage.load();
      const updated = state.cards[card.id]!;
      expect(updated.srs.repetitions).toBe(1);
      expect(updated.srs.interval).toBe(1);
    });

    it("rating 1 keeps card due immediately", () => {
      const due = reviewService.getDueCards();
      const card = due[0]!;
      reviewService.recordReview(card.id, 1);

      const state = storage.load();
      const updated = state.cards[card.id]!;
      expect(updated.srs.interval).toBe(0);
    });

    it("throws for unknown card ID", () => {
      expect(() => reviewService.recordReview("nonexistent", 4)).toThrow("Card not found");
    });
  });

  describe("getNumDueCards", () => {
    it("returns count of due cards", () => {
      const count = reviewService.getNumDueCards();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe("startReviewSession", () => {
    it("creates a session with due cards", () => {
      const session = reviewService.startReviewSession();
      expect(session.id).toBeTruthy();
      expect(session.cards.length).toBeGreaterThan(0);
      expect(session.startedAt).toBeTruthy();
    });

    it("limits session to maxCards", () => {
      const session = reviewService.startReviewSession(3);
      expect(session.cards.length).toBeLessThanOrEqual(3);
    });

    it("new cards get multipleChoice mode", () => {
      const session = reviewService.startReviewSession();
      expect(session.cards[0]!.mode).toBe("multipleChoice");
    });
  });

  describe("endReviewSession", () => {
    it("returns session summary with accuracy", () => {
      const session = reviewService.startReviewSession();
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
      const session = reviewService.startReviewSession();
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
});
