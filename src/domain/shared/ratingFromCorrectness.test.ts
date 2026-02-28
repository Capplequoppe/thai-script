import { describe, expect, it } from "vitest";
import { ratingFromCorrectness } from "./ratingFromCorrectness";
import type { RecallRating } from "./types";

describe("ratingFromCorrectness", () => {
	it("returns 4 (Good) when correct is true", () => {
		expect(ratingFromCorrectness(true)).toBe(4);
	});

	it("returns 2 (Wrong) when correct is false", () => {
		expect(ratingFromCorrectness(false)).toBe(2);
	});

	it("returns a valid RecallRating", () => {
		const result: RecallRating = ratingFromCorrectness(true);
		expect(result).toBe(4);

		const result2: RecallRating = ratingFromCorrectness(false);
		expect(result2).toBe(2);
	});
});
