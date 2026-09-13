import { describe, expect, it } from "vitest";
import type { PitchSample } from "./pitchContour";
import { scoreToneAttempt } from "./toneAttemptScore";

function samplesFrom(hzValues: readonly number[]): PitchSample[] {
	return hzValues.map((hz, i) => ({ timeSec: i * 0.05, hz }));
}

describe("scoreToneAttempt", () => {
	it("returns null when the reference has no voiced signal", () => {
		const silence: PitchSample[] = Array.from({ length: 10 }, (_, i) => ({
			timeSec: i * 0.05,
			hz: null,
		}));

		expect(
			scoreToneAttempt(silence, samplesFrom([150, 150, 150, 150])),
		).toBeNull();
	});

	it("returns null when the attempt has no voiced signal", () => {
		const silence: PitchSample[] = Array.from({ length: 10 }, (_, i) => ({
			timeSec: i * 0.05,
			hz: null,
		}));

		expect(
			scoreToneAttempt(samplesFrom([150, 150, 150, 150]), silence),
		).toBeNull();
	});

	it("labels a matching rising tone as excellent", () => {
		const rising = samplesFrom([100, 120, 140, 160, 180, 200]);

		const result = scoreToneAttempt(rising, rising);

		expect(result).not.toBeNull();
		expect(result!.label).toBe("excellent");
		expect(result!.score).toBeGreaterThanOrEqual(85);
	});

	it("labels an opposite tone shape as needing work", () => {
		const rising = samplesFrom([100, 120, 140, 160, 180, 200]);
		const falling = samplesFrom([200, 180, 160, 140, 120, 100]);

		const result = scoreToneAttempt(rising, falling);

		expect(result).not.toBeNull();
		expect(result!.label).toBe("needsWork");
	});

	it("exposes both contours for plotting", () => {
		const contour = samplesFrom([150, 160, 170, 180, 190]);

		const result = scoreToneAttempt(contour, contour);

		expect(result!.referenceContour.length).toBe(result!.attemptContour.length);
		expect(result!.referenceContour.length).toBeGreaterThan(0);
	});
});
