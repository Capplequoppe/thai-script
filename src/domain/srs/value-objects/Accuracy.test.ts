import { describe, expect, it } from "vitest";
import { Accuracy } from "./Accuracy";

describe("Accuracy", () => {
	describe("fromCounts", () => {
		it("calculates percentage from correct and total", () => {
			const accuracy = Accuracy.fromCounts(8, 10);
			expect(accuracy.percentage).toBe(80);
		});

		it("returns 0 when total is 0", () => {
			const accuracy = Accuracy.fromCounts(0, 0);
			expect(accuracy.percentage).toBe(0);
		});

		it("returns 100 for perfect score", () => {
			const accuracy = Accuracy.fromCounts(10, 10);
			expect(accuracy.percentage).toBe(100);
		});

		it("returns 0 for no correct answers", () => {
			const accuracy = Accuracy.fromCounts(0, 10);
			expect(accuracy.percentage).toBe(0);
		});

		it("rounds to nearest integer", () => {
			// 1/3 = 33.333... → 33
			expect(Accuracy.fromCounts(1, 3).percentage).toBe(33);
			// 2/3 = 66.666... → 67
			expect(Accuracy.fromCounts(2, 3).percentage).toBe(67);
		});
	});
});
