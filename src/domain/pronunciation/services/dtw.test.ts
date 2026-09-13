import { describe, expect, it } from "vitest";
import { dtwScore } from "./dtw";

describe("dtwScore", () => {
	it("scores an identical contour as a perfect match", () => {
		const contour = [0, 1, 2, 3, 2, 1, 0];

		const { distance, score } = dtwScore(contour, contour);

		expect(distance).toBeCloseTo(0, 5);
		expect(score).toBeCloseTo(100, 5);
	});

	it("scores a wildly different shape near zero", () => {
		const rising = [-6, -4, -2, 0, 2, 4, 6];
		const falling = [6, 4, 2, 0, -2, -4, -6];

		const { score } = dtwScore(rising, falling);

		expect(score).toBeLessThan(20);
	});

	it("is tolerant of time-warping (stretched but same shape)", () => {
		const original = [0, 2, 4, 6, 4, 2, 0];
		const stretched = [0, 0, 2, 2, 4, 4, 6, 6, 4, 4, 2, 2, 0, 0];

		const { score } = dtwScore(original, stretched);

		expect(score).toBeGreaterThan(90);
	});

	it("scores a moderate offset between the two extremes", () => {
		const a = [0, 0, 0, 0];
		const b = [3, 3, 3, 3];

		const { score } = dtwScore(a, b);

		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(100);
	});

	it("handles empty input without throwing", () => {
		expect(dtwScore([], [1, 2, 3])).toEqual({ distance: Infinity, score: 0 });
		expect(dtwScore([1, 2, 3], [])).toEqual({ distance: Infinity, score: 0 });
	});
});
