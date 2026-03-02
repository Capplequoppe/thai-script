import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	ApprenticeService,
	ApprenticeStats,
} from "../../domain/shared/services/ApprenticeService";
import type { LeechService } from "../../domain/shared/services/LeechService";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { CardRepository } from "../ports/CardRepository";
import { QueryDashboardUseCase } from "./QueryDashboardUseCase";

function makeCard(
	id: string,
	stage: SrsStage,
): { id: string; stage: SrsStage } {
	return { id, stage };
}

function createMockCardRepo(): {
	[K in keyof CardRepository]: ReturnType<typeof vi.fn>;
} {
	return {
		findById: vi.fn().mockReturnValue(null),
		findDue: vi.fn().mockReturnValue([]),
		findAll: vi.fn().mockReturnValue([]),
		save: vi.fn(),
		saveAll: vi.fn(),
		remove: vi.fn(),
	};
}

function createMockApprenticeService(): {
	[K in keyof ApprenticeService]: ReturnType<typeof vi.fn>;
} {
	return {
		getApprenticeCount: vi.fn().mockReturnValue(0),
		canStartLesson: vi.fn().mockReturnValue(true),
		getApprenticeStats: vi.fn().mockReturnValue({
			total: 0,
			byPool: { script: 0, vocab: 0, grammar: 0 },
			limit: 100,
			isAtLimit: false,
		} satisfies ApprenticeStats),
	};
}

function createMockLeechService(): {
	[K in keyof LeechService]: ReturnType<typeof vi.fn>;
} {
	return {
		isLeech: vi.fn().mockReturnValue(false),
		getLeechCards: vi.fn().mockReturnValue([]),
		getLeechCount: vi.fn().mockReturnValue(0),
	};
}

describe("QueryDashboardUseCase", () => {
	let useCase: QueryDashboardUseCase;
	let mockCardRepo: ReturnType<typeof createMockCardRepo>;
	let mockApprenticeService: ReturnType<typeof createMockApprenticeService>;
	let mockLeechService: ReturnType<typeof createMockLeechService>;

	beforeEach(() => {
		mockCardRepo = createMockCardRepo();
		mockApprenticeService = createMockApprenticeService();
		mockLeechService = createMockLeechService();
		useCase = new QueryDashboardUseCase(
			mockCardRepo as unknown as CardRepository,
			mockApprenticeService as unknown as ApprenticeService,
			mockLeechService as unknown as LeechService,
		);
	});

	describe("getStageCounts", () => {
		it("counts cards by stage for a specific pool", () => {
			mockCardRepo.findAll.mockReturnValue([
				makeCard("c1", SrsStage.APPRENTICE),
				makeCard("c2", SrsStage.APPRENTICE),
				makeCard("c3", SrsStage.GURU),
				makeCard("c4", SrsStage.MASTER),
				makeCard("c5", SrsStage.ENLIGHTENED),
				makeCard("c6", SrsStage.BURNED),
			]);

			const counts = useCase.getStageCounts("script");

			expect(counts).toEqual({
				apprentice: 2,
				guru: 1,
				master: 1,
				enlightened: 1,
				burned: 1,
			});
			expect(mockCardRepo.findAll).toHaveBeenCalledWith("script");
		});

		it("aggregates counts across all pools when pool is undefined", () => {
			mockCardRepo.findAll
				.mockReturnValueOnce([makeCard("s1", SrsStage.APPRENTICE)])
				.mockReturnValueOnce([makeCard("v1", SrsStage.GURU)])
				.mockReturnValueOnce([makeCard("g1", SrsStage.MASTER)])
				.mockReturnValueOnce([makeCard("t1", SrsStage.ENLIGHTENED)]);

			const counts = useCase.getStageCounts();

			expect(counts).toEqual({
				apprentice: 1,
				guru: 1,
				master: 1,
				enlightened: 1,
				burned: 0,
			});
			expect(mockCardRepo.findAll).toHaveBeenCalledTimes(4);
		});

		it("returns all zeros when no cards exist", () => {
			mockCardRepo.findAll.mockReturnValue([]);

			const counts = useCase.getStageCounts("script");

			expect(counts).toEqual({
				apprentice: 0,
				guru: 0,
				master: 0,
				enlightened: 0,
				burned: 0,
			});
		});
	});

	describe("getLeechCards", () => {
		it("delegates to leech service", () => {
			const fakeCards = [{ id: "c1" }] as unknown as ReviewableCard[];
			mockLeechService.getLeechCards.mockReturnValue(fakeCards);

			const result = useCase.getLeechCards("vocab");

			expect(result).toBe(fakeCards);
			expect(mockLeechService.getLeechCards).toHaveBeenCalledWith("vocab");
		});
	});

	describe("getLeechCount", () => {
		it("delegates to leech service", () => {
			mockLeechService.getLeechCount.mockReturnValue(3);

			expect(useCase.getLeechCount("grammar")).toBe(3);
			expect(mockLeechService.getLeechCount).toHaveBeenCalledWith("grammar");
		});
	});

	describe("getApprenticeStats", () => {
		it("delegates to apprentice service", () => {
			const stats: ApprenticeStats = {
				total: 50,
				byPool: { script: 20, vocab: 20, grammar: 10 },
				limit: 100,
				isAtLimit: false,
			};
			mockApprenticeService.getApprenticeStats.mockReturnValue(stats);

			expect(useCase.getApprenticeStats()).toBe(stats);
		});
	});

	describe("canStartLesson", () => {
		it("returns true when apprentice service allows", () => {
			mockApprenticeService.canStartLesson.mockReturnValue(true);
			expect(useCase.canStartLesson()).toBe(true);
		});

		it("returns false when apprentice service disallows", () => {
			mockApprenticeService.canStartLesson.mockReturnValue(false);
			expect(useCase.canStartLesson()).toBe(false);
		});
	});
});
