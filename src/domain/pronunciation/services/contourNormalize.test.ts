import { describe, expect, it } from "vitest";
import { normalizeContour } from "./contourNormalize";
import type { PitchSample } from "./pitchContour";

function samplesFrom(hzValues: readonly (number | null)[]): PitchSample[] {
	return hzValues.map((hz, i) => ({ timeSec: i * 0.05, hz }));
}

describe("normalizeContour", () => {
	it("returns null when there is no voiced signal", () => {
		expect(normalizeContour(samplesFrom([null, null, null]))).toBeNull();
	});

	it("returns null when there are too few voiced samples", () => {
		expect(normalizeContour(samplesFrom([120, null, null]))).toBeNull();
	});

	it("centers a flat contour at zero semitones", () => {
		const contour = normalizeContour(samplesFrom([150, 150, 150, 150, 150]));

		expect(contour).not.toBeNull();
		for (const value of contour!) {
			expect(value).toBeCloseTo(0, 5);
		}
	});

	it("produces a fixed-length contour regardless of input length", () => {
		const short = normalizeContour(samplesFrom([100, 110, 120, 130, 140]));
		const long = normalizeContour(
			samplesFrom(Array.from({ length: 50 }, (_, i) => 100 + i)),
		);

		expect(short).not.toBeNull();
		expect(long).not.toBeNull();
		expect(short!.length).toBe(long!.length);
	});

	it("is invariant to absolute pitch register (speaker independence)", () => {
		const low = normalizeContour(samplesFrom([100, 110, 120, 130, 140]));
		const high = normalizeContour(samplesFrom([200, 220, 240, 260, 280]));

		expect(low).not.toBeNull();
		expect(high).not.toBeNull();
		for (let i = 0; i < low!.length; i++) {
			expect(low![i]).toBeCloseTo(high![i]!, 1);
		}
	});

	it("reflects a rising shape as increasing semitone values", () => {
		const contour = normalizeContour(samplesFrom([100, 120, 140, 160, 180]));

		expect(contour).not.toBeNull();
		expect(contour![contour!.length - 1]!).toBeGreaterThan(contour![0]!);
	});

	it("ignores unvoiced gaps by interpolating across them", () => {
		const contour = normalizeContour(
			samplesFrom([100, null, null, 100, 200, null, 200]),
		);

		expect(contour).not.toBeNull();
		expect(contour!.length).toBeGreaterThan(0);
	});
});
