import { describe, expect, it } from "vitest";
import { RecallRating } from "./RecallRating";

describe("RecallRating", () => {
	describe("static instances", () => {
		it("AGAIN has value 1", () => {
			expect(RecallRating.AGAIN.value).toBe(1);
		});

		it("WRONG has value 2", () => {
			expect(RecallRating.WRONG.value).toBe(2);
		});

		it("HARD has value 3", () => {
			expect(RecallRating.HARD.value).toBe(3);
		});

		it("GOOD has value 4", () => {
			expect(RecallRating.GOOD.value).toBe(4);
		});

		it("EASY has value 5", () => {
			expect(RecallRating.EASY.value).toBe(5);
		});
	});

	describe("fromRaw", () => {
		it("returns AGAIN for 1", () => {
			expect(RecallRating.fromRaw(1)).toBe(RecallRating.AGAIN);
		});

		it("returns WRONG for 2", () => {
			expect(RecallRating.fromRaw(2)).toBe(RecallRating.WRONG);
		});

		it("returns HARD for 3", () => {
			expect(RecallRating.fromRaw(3)).toBe(RecallRating.HARD);
		});

		it("returns GOOD for 4", () => {
			expect(RecallRating.fromRaw(4)).toBe(RecallRating.GOOD);
		});

		it("returns EASY for 5", () => {
			expect(RecallRating.fromRaw(5)).toBe(RecallRating.EASY);
		});

		it("returns the same reference as the static instance", () => {
			expect(RecallRating.fromRaw(1) === RecallRating.AGAIN).toBe(true);
			expect(RecallRating.fromRaw(2) === RecallRating.WRONG).toBe(true);
			expect(RecallRating.fromRaw(3) === RecallRating.HARD).toBe(true);
			expect(RecallRating.fromRaw(4) === RecallRating.GOOD).toBe(true);
			expect(RecallRating.fromRaw(5) === RecallRating.EASY).toBe(true);
		});
	});

	describe("fromCorrectness", () => {
		it("returns GOOD for true", () => {
			expect(RecallRating.fromCorrectness(true)).toBe(RecallRating.GOOD);
		});

		it("returns WRONG for false", () => {
			expect(RecallRating.fromCorrectness(false)).toBe(RecallRating.WRONG);
		});
	});

	describe("isCorrect", () => {
		it("returns false for AGAIN (1)", () => {
			expect(RecallRating.AGAIN.isCorrect).toBe(false);
		});

		it("returns false for WRONG (2)", () => {
			expect(RecallRating.WRONG.isCorrect).toBe(false);
		});

		it("returns true for HARD (3)", () => {
			expect(RecallRating.HARD.isCorrect).toBe(true);
		});

		it("returns true for GOOD (4)", () => {
			expect(RecallRating.GOOD.isCorrect).toBe(true);
		});

		it("returns true for EASY (5)", () => {
			expect(RecallRating.EASY.isCorrect).toBe(true);
		});
	});

	describe("isLapse", () => {
		it("returns true for AGAIN (1)", () => {
			expect(RecallRating.AGAIN.isLapse).toBe(true);
		});

		it("returns true for WRONG (2)", () => {
			expect(RecallRating.WRONG.isLapse).toBe(true);
		});

		it("returns false for HARD (3)", () => {
			expect(RecallRating.HARD.isLapse).toBe(false);
		});

		it("returns false for GOOD (4)", () => {
			expect(RecallRating.GOOD.isLapse).toBe(false);
		});

		it("returns false for EASY (5)", () => {
			expect(RecallRating.EASY.isLapse).toBe(false);
		});
	});
});
