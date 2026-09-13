import type { PitchSample } from "./pitchContour";

/**
 * A pitch contour resampled to a fixed number of points, each in semitones
 * relative to the contour's own median pitch. Two contours of this shape are
 * directly comparable regardless of the recordings' absolute pitch (speaker
 * register) or duration.
 */
export type NormalizedContour = readonly number[];

const CONTOUR_POINTS = 30;

/** Minimum voiced samples needed to trust a median/duration — below this the recording is too short or silent to normalize. */
const MIN_VOICED_SAMPLES = 3;

function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const midValue = sorted[mid] as number;
	return sorted.length % 2 === 0
		? (midValue + (sorted[mid - 1] as number)) / 2
		: midValue;
}

function interpolateAt(
	voiced: readonly { readonly timeSec: number; readonly semitone: number }[],
	timeSec: number,
): number {
	if (timeSec <= voiced[0]!.timeSec) return voiced[0]!.semitone;
	const last = voiced[voiced.length - 1]!;
	if (timeSec >= last.timeSec) return last.semitone;

	let i = 0;
	while (voiced[i + 1]!.timeSec < timeSec) i++;
	const before = voiced[i]!;
	const after = voiced[i + 1]!;
	const span = after.timeSec - before.timeSec;
	const t = span === 0 ? 0 : (timeSec - before.timeSec) / span;
	return before.semitone + t * (after.semitone - before.semitone);
}

/**
 * Trims unvoiced samples, converts each voiced reading to semitones relative
 * to the contour's own median pitch, then resamples onto `CONTOUR_POINTS`
 * evenly-spaced points across the voiced span via linear interpolation.
 * Returns `null` when there isn't enough voiced signal to normalize —
 * silence, or a recording too short to contain a syllable.
 */
export function normalizeContour(
	samples: readonly PitchSample[],
): NormalizedContour | null {
	const voicedHz = samples.filter(
		(s): s is { timeSec: number; hz: number } => s.hz !== null && s.hz > 0,
	);
	if (voicedHz.length < MIN_VOICED_SAMPLES) return null;

	const medianHz = median(voicedHz.map((s) => s.hz));
	if (medianHz <= 0) return null;

	const voiced = voicedHz.map((s) => ({
		timeSec: s.timeSec,
		semitone: 12 * Math.log2(s.hz / medianHz),
	}));

	const firstTime = voiced[0]!.timeSec;
	const lastTime = voiced[voiced.length - 1]!.timeSec;
	const duration = lastTime - firstTime;

	if (duration <= 0) {
		return Array.from({ length: CONTOUR_POINTS }, () => voiced[0]!.semitone);
	}

	return Array.from({ length: CONTOUR_POINTS }, (_, i) => {
		const t = firstTime + (duration * i) / (CONTOUR_POINTS - 1);
		return interpolateAt(voiced, t);
	});
}
