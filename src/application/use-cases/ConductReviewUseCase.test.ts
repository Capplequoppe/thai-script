import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationPort } from "../../domain/ports/NotificationPort";
import type {
	ActiveReviewSession,
	CriticalItem,
	ReviewForecast,
	ReviewService,
} from "../../domain/session/services/ReviewService";
import type { SessionSummary } from "../../domain/shared/types";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import { ConductReviewUseCase } from "./ConductReviewUseCase";

function createMockReviewService(): {
	[K in keyof ReviewService]: ReturnType<typeof vi.fn>;
} {
	return {
		getDueCards: vi.fn().mockReturnValue([]),
		getNumDueCards: vi.fn().mockReturnValue(0),
		recordReview: vi.fn(),
		startReviewSession: vi.fn().mockReturnValue({
			id: "session-1",
			cards: [],
			startedAt: new Date().toISOString(),
			results: [],
		}),
		endReviewSession: vi.fn().mockReturnValue({
			sessionId: "session-1",
			completedAt: new Date().toISOString(),
			type: "review",
			durationMs: 1000,
			totalCards: 5,
			correctCount: 4,
			incorrectCount: 1,
			accuracy: 80,
			newCardsGraduated: 0,
		} satisfies SessionSummary),
		getNextReviewDate: vi.fn().mockReturnValue(null),
		getSessionHistory: vi.fn().mockReturnValue([]),
		getReviewForecast: vi.fn().mockReturnValue({
			dueNow: 0,
			nextHour: 0,
			next24Hours: 0,
			next3Days: 0,
			next7Days: 0,
		} satisfies ReviewForecast),
		getCriticalItems: vi.fn().mockReturnValue([]),
		resurrectCard: vi.fn(),
	};
}

function createMockNotificationPort(): {
	[K in keyof NotificationPort]: ReturnType<typeof vi.fn> | string | boolean;
} {
	return {
		permission: "denied" as NotificationPermission,
		isSupported: false,
		scheduleNext: vi.fn(),
		cancel: vi.fn(),
		requestPermission: vi.fn(),
	};
}

describe("ConductReviewUseCase", () => {
	let useCase: ConductReviewUseCase;
	let mockReviewService: ReturnType<typeof createMockReviewService>;
	let mockNotificationPort: ReturnType<typeof createMockNotificationPort>;

	beforeEach(() => {
		mockReviewService = createMockReviewService();
		mockNotificationPort = createMockNotificationPort();
		useCase = new ConductReviewUseCase(
			mockReviewService as unknown as ReviewService,
			mockNotificationPort as unknown as NotificationPort,
		);
	});

	describe("getDueCards", () => {
		it("delegates to review service with pool parameter", () => {
			const fakeCards = [{ id: "card-1" }] as unknown as ReviewableCard[];
			mockReviewService.getDueCards.mockReturnValue(fakeCards);

			const result = useCase.getDueCards("vocab");

			expect(mockReviewService.getDueCards).toHaveBeenCalledWith(
				undefined,
				"vocab",
			);
			expect(result).toBe(fakeCards);
		});

		it("passes undefined pool when not specified", () => {
			useCase.getDueCards();

			expect(mockReviewService.getDueCards).toHaveBeenCalledWith(
				undefined,
				undefined,
			);
		});
	});

	describe("getDueCount", () => {
		it("delegates to review service", () => {
			mockReviewService.getNumDueCards.mockReturnValue(5);

			expect(useCase.getDueCount("script")).toBe(5);
			expect(mockReviewService.getNumDueCards).toHaveBeenCalledWith(
				undefined,
				"script",
			);
		});
	});

	describe("recordReview", () => {
		it("delegates to review service with correct parameter order", () => {
			useCase.recordReview("card-1", 4, "vocab", {
				responseTimeMs: 500,
				averageResponseTimeMs: 600,
			});

			expect(mockReviewService.recordReview).toHaveBeenCalledWith(
				"card-1",
				4,
				undefined,
				{ responseTimeMs: 500, averageResponseTimeMs: 600 },
				"vocab",
			);
		});

		it("schedules notification when permission is granted and cards are due", () => {
			mockNotificationPort.permission = "granted";
			const futureDate = new Date(Date.now() + 60_000);
			mockReviewService.getNextReviewDate.mockReturnValue(futureDate);
			mockReviewService.getNumDueCards.mockReturnValue(3);

			useCase.recordReview("card-1", 4);

			expect(mockNotificationPort.scheduleNext).toHaveBeenCalledWith(
				futureDate,
				3,
			);
		});

		it("does not schedule notification when permission is denied", () => {
			mockNotificationPort.permission = "denied";

			useCase.recordReview("card-1", 4);

			expect(mockNotificationPort.scheduleNext).not.toHaveBeenCalled();
		});

		it("cancels notification when no next review date", () => {
			mockNotificationPort.permission = "granted";
			mockReviewService.getNextReviewDate.mockReturnValue(null);
			mockReviewService.getNumDueCards.mockReturnValue(0);

			useCase.recordReview("card-1", 4);

			expect(mockNotificationPort.cancel).toHaveBeenCalled();
		});

		it("schedules with count 1 when next date exists but no due cards", () => {
			mockNotificationPort.permission = "granted";
			const futureDate = new Date(Date.now() + 60_000);
			mockReviewService.getNextReviewDate.mockReturnValue(futureDate);
			mockReviewService.getNumDueCards.mockReturnValue(0);

			useCase.recordReview("card-1", 4);

			expect(mockNotificationPort.scheduleNext).toHaveBeenCalledWith(
				futureDate,
				1,
			);
		});
	});

	describe("startSession", () => {
		it("delegates to review service with pool and maxCards", () => {
			useCase.startSession("grammar", 10);

			expect(mockReviewService.startReviewSession).toHaveBeenCalledWith(
				10,
				undefined,
				"grammar",
			);
		});
	});

	describe("endSession", () => {
		it("delegates to review service and returns summary", () => {
			const session: ActiveReviewSession = {
				id: "s1",
				cards: [],
				startedAt: new Date().toISOString(),
				results: [],
			};

			const result = useCase.endSession(session, "script");

			expect(mockReviewService.endReviewSession).toHaveBeenCalledWith(
				session,
				undefined,
				"script",
			);
			expect(result).toEqual(
				expect.objectContaining({ sessionId: "session-1" }),
			);
		});

		it("schedules notification after ending session", () => {
			mockNotificationPort.permission = "granted";
			const futureDate = new Date(Date.now() + 60_000);
			mockReviewService.getNextReviewDate.mockReturnValue(futureDate);
			mockReviewService.getNumDueCards.mockReturnValue(2);

			const session: ActiveReviewSession = {
				id: "s1",
				cards: [],
				startedAt: new Date().toISOString(),
				results: [],
			};

			useCase.endSession(session);

			expect(mockNotificationPort.scheduleNext).toHaveBeenCalledWith(
				futureDate,
				2,
			);
		});
	});

	describe("getNextReviewDate", () => {
		it("delegates to review service", () => {
			const date = new Date();
			mockReviewService.getNextReviewDate.mockReturnValue(date);

			expect(useCase.getNextReviewDate("vocab")).toBe(date);
			expect(mockReviewService.getNextReviewDate).toHaveBeenCalledWith("vocab");
		});
	});

	describe("getSessionHistory", () => {
		it("delegates to review service", () => {
			const history: SessionSummary[] = [];
			mockReviewService.getSessionHistory.mockReturnValue(history);

			expect(useCase.getSessionHistory()).toBe(history);
		});
	});

	describe("getForecast", () => {
		it("delegates to review service", () => {
			const forecast: ReviewForecast = {
				dueNow: 1,
				nextHour: 2,
				next24Hours: 5,
				next3Days: 10,
				next7Days: 20,
			};
			mockReviewService.getReviewForecast.mockReturnValue(forecast);

			expect(useCase.getForecast("script")).toBe(forecast);
			expect(mockReviewService.getReviewForecast).toHaveBeenCalledWith(
				undefined,
				"script",
			);
		});
	});

	describe("getCriticalItems", () => {
		it("delegates to review service with pool and limit", () => {
			const items: CriticalItem[] = [];
			mockReviewService.getCriticalItems.mockReturnValue(items);

			expect(useCase.getCriticalItems("grammar", 5)).toBe(items);
			expect(mockReviewService.getCriticalItems).toHaveBeenCalledWith(
				"grammar",
				5,
			);
		});
	});

	describe("resurrectCard", () => {
		it("delegates to review service and schedules notification", () => {
			mockNotificationPort.permission = "granted";
			const futureDate = new Date(Date.now() + 60_000);
			mockReviewService.getNextReviewDate.mockReturnValue(futureDate);
			mockReviewService.getNumDueCards.mockReturnValue(1);

			useCase.resurrectCard("card-1", "vocab");

			expect(mockReviewService.resurrectCard).toHaveBeenCalledWith(
				"card-1",
				"vocab",
			);
			expect(mockNotificationPort.scheduleNext).toHaveBeenCalledWith(
				futureDate,
				1,
			);
		});
	});
});
