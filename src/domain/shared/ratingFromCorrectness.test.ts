import { describe, expect, it } from "vitest";
import { ratingFromCorrectness } from "./ratingFromCorrectness";
import type { RecallRating } from "./types";

describe("ratingFromCorrectness", () => {
	it("returns 4 (Good) when correct", () => {
		expect(ratingFromCorrectness(true)).toBe(4);
	});

	it("returns 2 (Wrong) when incorrect", () => {
		expect(ratingFromCorrectness(false)).toBe(2);
	});

	it("returns a valid RecallRating type", () => {
		const result: RecallRating = ratingFromCorrectness(true);
		expect([1, 2, 3, 4, 5]).toContain(result);
	});
});
