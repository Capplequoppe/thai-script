import { describe, expect, it } from "vitest";
import { ratingFromCorrectness } from "./ratingFromCorrectness";
import type { RecallRating } from "./types";

describe("ratingFromCorrectness", () => {
	it("returns 4 (Good) when correct without timing", () => {
		expect(ratingFromCorrectness(true)).toBe(4);
	});

	it("returns 2 (Wrong) when incorrect without timing", () => {
		expect(ratingFromCorrectness(false)).toBe(2);
	});

	it("returns 5 (Easy) when correct and fast (<2000ms)", () => {
		expect(ratingFromCorrectness(true, 1500)).toBe(5);
	});

	it("returns 4 (Good) when correct and normal speed (2000-5000ms)", () => {
		expect(ratingFromCorrectness(true, 3000)).toBe(4);
	});

	it("returns 3 (Hard) when correct and slow (>5000ms)", () => {
		expect(ratingFromCorrectness(true, 6000)).toBe(3);
	});

	it("returns 2 (Wrong) when incorrect regardless of timing", () => {
		expect(ratingFromCorrectness(false, 500)).toBe(2);
		expect(ratingFromCorrectness(false, 3000)).toBe(2);
		expect(ratingFromCorrectness(false, 8000)).toBe(2);
	});

	it("returns a valid RecallRating", () => {
		const result: RecallRating = ratingFromCorrectness(true);
		expect(result).toBe(4);
	});
});
