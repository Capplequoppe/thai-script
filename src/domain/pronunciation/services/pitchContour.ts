import { PitchDetector } from "pitchy";

/** One pitch reading at a point in time. `hz` is `null` for an unvoiced or silent frame. */
export interface PitchSample {
	readonly timeSec: number;
	readonly hz: number | null;
}

const DEFAULT_WINDOW_SIZE = 2048;
const DEFAULT_HOP_SIZE = 512;

/**
 * A window is silent (rather than merely quiet) below this RMS amplitude.
 * Skipped before calling into `pitchy` — its NSDF computation degenerates on
 * an all-zero (or near-zero) window, which a recording's leading/trailing
 * silence produces routinely.
 */
const SILENCE_RMS_THRESHOLD = 0.005;

function rms(window: Float32Array): number {
	let sumSquares = 0;
	for (const value of window) sumSquares += value * value;
	return Math.sqrt(sumSquares / window.length);
}

/**
 * Slides a fixed-size window over `samples` using the McLeod Pitch Method
 * (via `pitchy`) to produce one pitch reading per window, centered on the
 * window's midpoint. A window below `SILENCE_RMS_THRESHOLD`, or one `pitchy`
 * reports as unclear (`clarity` below its own default threshold, surfaced as
 * `hz === 0`), becomes a `null` reading rather than a spurious pitch.
 */
export function extractPitchContour(
	samples: Float32Array,
	sampleRate: number,
	windowSize: number = DEFAULT_WINDOW_SIZE,
	hopSize: number = DEFAULT_HOP_SIZE,
): PitchSample[] {
	if (samples.length === 0) return [];

	const effectiveWindowSize = Math.min(windowSize, samples.length);
	const detector = PitchDetector.forFloat32Array(effectiveWindowSize);
	const readings: PitchSample[] = [];

	for (
		let start = 0;
		start + effectiveWindowSize <= samples.length;
		start += hopSize
	) {
		const window = samples.subarray(start, start + effectiveWindowSize);
		const timeSec = (start + effectiveWindowSize / 2) / sampleRate;

		if (rms(window) < SILENCE_RMS_THRESHOLD) {
			readings.push({ timeSec, hz: null });
			continue;
		}

		const [hz] = detector.findPitch(window, sampleRate);
		readings.push({ timeSec, hz: hz > 0 ? hz : null });
	}

	return readings;
}
