import { describe, expect, it } from "vitest";
import { extractPitchContour } from "./pitchContour";

const SAMPLE_RATE = 16000;

function sineWave(hz: number, durationSec: number): Float32Array {
	const length = Math.floor(SAMPLE_RATE * durationSec);
	const wave = new Float32Array(length);
	for (let i = 0; i < length; i++) {
		wave[i] = Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE);
	}
	return wave;
}

describe("extractPitchContour", () => {
	it("detects the frequency of a pure sine wave", () => {
		const readings = extractPitchContour(sineWave(150, 1), SAMPLE_RATE);
		const voiced = readings.filter((r) => r.hz !== null);

		expect(voiced.length).toBeGreaterThan(0);
		for (const { hz } of voiced) {
			expect(hz).toBeGreaterThan(145);
			expect(hz).toBeLessThan(155);
		}
	});

	it("tracks a rising pitch across the recording", () => {
		const length = SAMPLE_RATE * 1;
		const wave = new Float32Array(length);
		let phase = 0;
		for (let i = 0; i < length; i++) {
			const hz = 150 + (100 * i) / length; // 150Hz -> 250Hz
			phase += (2 * Math.PI * hz) / SAMPLE_RATE;
			wave[i] = Math.sin(phase);
		}

		const readings = extractPitchContour(wave, SAMPLE_RATE);
		const voiced = readings.filter(
			(r): r is { timeSec: number; hz: number } => r.hz !== null,
		);

		expect(voiced.length).toBeGreaterThan(2);
		expect(voiced[voiced.length - 1]!.hz).toBeGreaterThan(voiced[0]!.hz);
	});

	it("reports silence as entirely unvoiced", () => {
		const readings = extractPitchContour(
			new Float32Array(SAMPLE_RATE),
			SAMPLE_RATE,
		);

		expect(readings.length).toBeGreaterThan(0);
		expect(readings.every((r) => r.hz === null)).toBe(true);
	});

	it("returns an empty contour for empty input", () => {
		expect(extractPitchContour(new Float32Array(0), SAMPLE_RATE)).toEqual([]);
	});
});
