import { describe, it, expect, beforeEach } from "vitest";
import { LearningService } from "./learning-service";
import { ReviewService } from "./review-service";
import { InMemoryStorage } from "./storage";

describe("Learn-then-Review flow", () => {
  let storage: InMemoryStorage;
  let learning: LearningService;
  let review: ReviewService;

  beforeEach(() => {
    storage = new InMemoryStorage();
    learning = new LearningService(storage);
    review = new ReviewService(storage);
  });

  it("full lesson 1 -> review cycle", () => {
    const lesson = learning.startLesson(1);
    expect(lesson.cards.length).toBeGreaterThan(0);
    learning.completeLesson(1);

    const dueCards = review.getDueCards();
    expect(dueCards.length).toBe(lesson.cards.length);

    const session = review.startReviewSession();
    expect(session.cards.length).toBe(dueCards.length);
    expect(session.cards[0]!.mode).toBe("multipleChoice");

    for (const quizCard of session.cards) {
      review.recordReview(quizCard.card.id, 4);
      session.results.push({ cardId: quizCard.card.id, rating: 4 });
    }

    expect(review.getNumDueCards()).toBe(0);

    const summary = review.endReviewSession(session);
    expect(summary.totalCards).toBe(dueCards.length);
    expect(summary.accuracy).toBe(100);

    expect(learning.getNextLesson()).toBe(2);
  });

  it("sequential lessons build up card pool", () => {
    learning.startLesson(1);
    learning.completeLesson(1);
    const afterLesson1 = Object.keys(storage.load().cards).length;

    learning.startLesson(2);
    learning.completeLesson(2);
    const afterLesson2 = Object.keys(storage.load().cards).length;

    expect(afterLesson2).toBeGreaterThan(afterLesson1);
  });

  it("unlearnLesson removes only that lesson's cards", () => {
    learning.startLesson(1);
    learning.completeLesson(1);
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

    const dueCards = review.getDueCards();
    const firstCard = dueCards[0]!;

    review.recordReview(firstCard.id, 1);

    const stillDue = review.getDueCards();
    expect(stillDue.some((c) => c.id === firstCard.id)).toBe(true);
  });

  it("after multiple good ratings, card gets flashcard mode", () => {
    learning.startLesson(1);
    learning.completeLesson(1);

    const cards = review.getDueCards();
    const card = cards[0]!;

    // Rate good twice (reps: 0->1->2)
    review.recordReview(card.id, 4, "2026-02-25T00:00:00.000Z");
    review.recordReview(card.id, 4, "2026-02-26T00:00:00.000Z");

    // Start session far in the future when card is due again
    const session = review.startReviewSession(undefined, "2026-04-01T00:00:00.000Z");
    const quizCard = session.cards.find((c) => c.card.id === card.id);
    if (quizCard) {
      expect(quizCard.mode).toBe("flashcard");
    }
  });

  it("session history accumulates across multiple sessions", () => {
    learning.startLesson(1);
    learning.completeLesson(1);

    const s1 = review.startReviewSession(2);
    for (const qc of s1.cards) {
      review.recordReview(qc.card.id, 4);
      s1.results.push({ cardId: qc.card.id, rating: 4 });
    }
    review.endReviewSession(s1);

    const s2 = review.startReviewSession(2);
    for (const qc of s2.cards) {
      review.recordReview(qc.card.id, 3);
      s2.results.push({ cardId: qc.card.id, rating: 3 });
    }
    review.endReviewSession(s2);

    expect(review.getSessionHistory()).toHaveLength(2);
  });
});
