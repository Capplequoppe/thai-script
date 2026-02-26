import { describe, expect, it } from "vitest";
import { calculateNextReview, createSrsData, isDue } from "./srs";
import type { SrsData } from "./types";

describe("createSrsData", () => {
	it("returns default SRS data with current date", () => {
		const srs = createSrsData();
		expect(srs.easeFactor).toBe(2.5);
		expect(srs.interval).toBe(0);
		expect(srs.repetitions).toBe(0);
		expect(srs.lastReviewDate).toBeNull();
	});

	it("accepts a custom date", () => {
		const now = "2026-02-25T12:00:00.000Z";
		const srs = createSrsData(now);
		expect(srs.nextReviewDate).toBe(now);
	});
});

describe("calculateNextReview", () => {
	const now = "2026-02-25T12:00:00.000Z";

	it("rating 1 (blackout): resets reps, interval 0 (same session)", () => {
		const srs = createSrsData();
		const result = calculateNextReview(srs, 1, now);
		expect(result.repetitions).toBe(0);
		expect(result.interval).toBe(0);
		expect(result.nextReviewDate).toBe(now);
		expect(result.easeFactor).toBeLessThan(2.5);
	});

	it("rating 2 (wrong): resets reps, interval 1 day", () => {
		const srs = createSrsData();
		const result = calculateNextReview(srs, 2, now);
		expect(result.repetitions).toBe(0);
		expect(result.interval).toBe(1);
		expect(result.easeFactor).toBeLessThan(2.5);
	});

	it("rating 3 (hard): keeps reps, slow growth, EF decreases", () => {
		const srs: SrsData = { ...createSrsData(), repetitions: 2, interval: 6 };
		const result = calculateNextReview(srs, 3, now);
		expect(result.repetitions).toBe(3);
		expect(result.interval).toBeGreaterThan(6);
		expect(result.interval).toBeLessThan(6 * 2.5);
		expect(result.easeFactor).toBeLessThan(srs.easeFactor);
	});

	it("rating 4 (good): standard SM-2 progression", () => {
		const srs = createSrsData();
		const r1 = calculateNextReview(srs, 4, now);
		expect(r1.repetitions).toBe(1);
		expect(r1.interval).toBe(1);

		const r2 = calculateNextReview(r1, 4, now);
		expect(r2.repetitions).toBe(2);
		expect(r2.interval).toBe(6);

		const r3 = calculateNextReview(r2, 4, now);
		expect(r3.repetitions).toBe(3);
		expect(r3.interval).toBeGreaterThanOrEqual(Math.floor(6 * 2.5));
	});

	it("rating 5 (easy): interval bonus, EF increases", () => {
		const srs: SrsData = { ...createSrsData(), repetitions: 2, interval: 6 };
		const result = calculateNextReview(srs, 5, now);
		expect(result.repetitions).toBe(3);
		expect(result.interval).toBeGreaterThan(6 * 2.5);
		expect(result.easeFactor).toBeGreaterThan(srs.easeFactor);
	});

	it("ease factor never drops below 1.3", () => {
		let srs = createSrsData();
		for (let i = 0; i < 20; i++) {
			srs = calculateNextReview(srs, 1, now);
		}
		expect(srs.easeFactor).toBeGreaterThanOrEqual(1.3);
	});

	it("sets lastReviewDate to now", () => {
		const srs = createSrsData();
		const result = calculateNextReview(srs, 4, now);
		expect(result.lastReviewDate).toBe(now);
	});

	it("ease factor capped at 3.0 for rating 5", () => {
		let srs: SrsData = {
			...createSrsData(),
			easeFactor: 2.95,
			repetitions: 2,
			interval: 6,
		};
		srs = calculateNextReview(srs, 5, now);
		expect(srs.easeFactor).toBeLessThanOrEqual(3.0);
	});
});

describe("isDue", () => {
	it("returns true when nextReviewDate is in the past", () => {
		const srs = createSrsData();
		srs.nextReviewDate = "2026-02-24T00:00:00.000Z";
		expect(isDue(srs, "2026-02-25T00:00:00.000Z")).toBe(true);
	});

	it("returns true when nextReviewDate is now", () => {
		const n = "2026-02-25T12:00:00.000Z";
		const srs = createSrsData();
		srs.nextReviewDate = n;
		expect(isDue(srs, n)).toBe(true);
	});

	it("returns false when nextReviewDate is in the future", () => {
		const srs = createSrsData();
		srs.nextReviewDate = "2026-02-26T00:00:00.000Z";
		expect(isDue(srs, "2026-02-25T00:00:00.000Z")).toBe(false);
	});
});
