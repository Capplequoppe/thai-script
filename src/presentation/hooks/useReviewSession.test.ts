// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveReviewSession } from "../../domain/session/services/ReviewService";
import type { RecallRating } from "../../domain/shared/types";
import { useReviewSession } from "./useReviewSession";

function makeSession(cardCount = 2): ActiveReviewSession {
	return {
		id: "session-1",
		startedAt: new Date().toISOString(),
		results: [],
		cards: Array.from({ length: cardCount }, (_, i) => ({
			card: {
				id: `card-${i}`,
				question: `Q${i}`,
				correctAnswer: `A${i}`,
				choices: [`A${i}`, "wrong"],
				schedule: {
					stage: { name: "Apprentice" },
				},
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
			mode: "multipleChoice" as const,
		})),
	};
}

describe("useReviewSession", () => {
	function setup(session?: ActiveReviewSession) {
		const mockSession = session ?? makeSession();
		const startSessionFn = vi.fn(() => mockSession);
		const recordReviewFn = vi.fn().mockReturnValue("Apprentice");
		const mockEndSession = vi.fn().mockReturnValue({
			sessionId: "s1",
			type: "review" as const,
			completedAt: new Date().toISOString(),
			durationMs: 1000,
			totalCards: 3,
			correctCount: 3,
			incorrectCount: 0,
			accuracy: 100,
			newCardsGraduated: 0,
		});
		const endSessionFn = mockEndSession;

		const result = renderHook(() =>
			useReviewSession(startSessionFn, recordReviewFn, endSessionFn),
		);

		return {
			...result,
			startSessionFn,
			recordReviewFn,
			endSessionFn,
			mockSession,
		};
	}

	it("has correct initial state", () => {
		const { result } = setup();

		expect(result.current.session).toBeNull();
		expect(result.current.cardIdx).toBe(0);
		expect(result.current.currentCard).toBeNull();
	});

	it("startReview sets session and resets cardIdx", () => {
		const { result, startSessionFn, mockSession } = setup();

		act(() => {
			result.current.startReview(10);
		});

		expect(startSessionFn).toHaveBeenCalledWith(10);
		expect(result.current.session).toBe(mockSession);
		expect(result.current.cardIdx).toBe(0);
		expect(result.current.currentCard).toBe(mockSession.cards[0]);
	});

	it("handleReviewAdvance records review and advances cardIdx", () => {
		const { result, recordReviewFn, mockSession } = setup();

		act(() => {
			result.current.startReview();
		});

		act(() => {
			result.current.handleReviewAdvance(4 as RecallRating);
		});

		expect(recordReviewFn).toHaveBeenCalledWith("card-0", 4);
		expect(mockSession.results).toEqual([{ cardId: "card-0", rating: 4 }]);
		expect(result.current.cardIdx).toBe(1);
		expect(result.current.currentCard).toBe(mockSession.cards[1]);
	});

	it("handleReviewAdvance returns completion result with results on last card", () => {
		const { result, endSessionFn } = setup();

		act(() => {
			result.current.startReview();
		});

		// Advance past first card
		act(() => {
			result.current.handleReviewAdvance(4 as RecallRating);
		});

		// Advance past last card
		let returnValue:
			| {
					status: "complete";
					results: Array<{
						cardId: string;
						rating: RecallRating;
						beforeStage: string;
						afterStage: string;
					}>;
					summary: import("../../domain/shared/types").SessionSummary;
			  }
			| undefined;
		act(() => {
			returnValue = result.current.handleReviewAdvance(3 as RecallRating);
		});

		expect(returnValue?.status).toBe("complete");
		expect(returnValue?.results).toEqual([
			{
				cardId: "card-0",
				rating: 4,
				beforeStage: "Apprentice",
				afterStage: "Apprentice",
			},
			{
				cardId: "card-1",
				rating: 3,
				beforeStage: "Apprentice",
				afterStage: "Apprentice",
			},
		]);
		expect(endSessionFn).toHaveBeenCalled();
		expect(result.current.session).toBeNull();
	});

	it("handleMcAnswer converts true to rating 4", () => {
		const { result, recordReviewFn } = setup();

		act(() => {
			result.current.startReview();
		});

		act(() => {
			result.current.handleMcAnswer(true);
		});

		expect(recordReviewFn).toHaveBeenCalledWith("card-0", 4);
	});

	it("handleMcAnswer converts false to rating 2", () => {
		const { result, recordReviewFn } = setup();

		act(() => {
			result.current.startReview();
		});

		act(() => {
			result.current.handleMcAnswer(false);
		});

		expect(recordReviewFn).toHaveBeenCalledWith("card-0", 2);
	});

	it("handleReviewAdvance is a no-op when session is null", () => {
		const { result, recordReviewFn } = setup();

		act(() => {
			result.current.handleReviewAdvance(4 as RecallRating);
		});

		expect(recordReviewFn).not.toHaveBeenCalled();
	});

	it("startReview with no arguments calls startSessionFn with undefined", () => {
		const { result, startSessionFn } = setup();

		act(() => {
			result.current.startReview();
		});

		expect(startSessionFn).toHaveBeenCalledWith(undefined);
	});
});
