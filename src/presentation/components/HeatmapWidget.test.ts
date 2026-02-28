import { describe, expect, it } from "vitest";
import { buildHeatmapGrid } from "./organisms/HeatmapWidget";

describe("buildHeatmapGrid", () => {
	it("returns 12 rows of 7 days each", () => {
		const grid = buildHeatmapGrid([]);
		expect(grid).toHaveLength(12);
		for (const row of grid) {
			expect(row).toHaveLength(7);
		}
	});

	it("last cell (row 11, col 6) is today", () => {
		const grid = buildHeatmapGrid([]);
		const todayCell = grid[11][6];
		expect(todayCell.isToday).toBe(true);
	});

	it("counts sessions on the correct date", () => {
		const today = new Date();
		today.setHours(12, 0, 0, 0);
		const sessions = [
			{ completedAt: today.toISOString(), totalCards: 15 },
			{ completedAt: today.toISOString(), totalCards: 8 },
		];
		const grid = buildHeatmapGrid(sessions);
		const todayCell = grid[11][6];
		expect(todayCell.count).toBe(23);
	});

	it("intensity is 0 for empty cells", () => {
		const grid = buildHeatmapGrid([]);
		expect(grid[0][0].intensity).toBe(0);
	});

	it("intensity is 1 for cells with 1-4 cards", () => {
		const today = new Date();
		today.setHours(12, 0, 0, 0);
		const sessions = [{ completedAt: today.toISOString(), totalCards: 3 }];
		const grid = buildHeatmapGrid(sessions);
		expect(grid[11][6].intensity).toBe(1);
	});

	it("intensity is 2 for cells with 5-19 cards", () => {
		const today = new Date();
		today.setHours(12, 0, 0, 0);
		const sessions = [{ completedAt: today.toISOString(), totalCards: 10 }];
		const grid = buildHeatmapGrid(sessions);
		expect(grid[11][6].intensity).toBe(2);
	});

	it("intensity is 3 for cells with >= 20 cards", () => {
		const today = new Date();
		today.setHours(12, 0, 0, 0);
		const sessions = [{ completedAt: today.toISOString(), totalCards: 25 }];
		const grid = buildHeatmapGrid(sessions);
		expect(grid[11][6].intensity).toBe(3);
	});

	it("ignores sessions without completedAt", () => {
		const sessions = [{ completedAt: undefined, totalCards: 10 }];
		const grid = buildHeatmapGrid(sessions);
		expect(grid[11][6].count).toBe(0);
	});
});
