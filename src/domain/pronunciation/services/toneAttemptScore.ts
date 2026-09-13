import { type NormalizedContour, normalizeContour } from "./contourNormalize";
import { dtwScore } from "./dtw";
import type { PitchSample } from "./pitchContour";

export type ToneAttemptLabel = "excellent" | "good" | "needsWork";

export interface ToneAttemptResult {
	readonly referenceContour: NormalizedContour;
	readonly attemptContour: NormalizedContour;
	readonly score: number;
	readonly label: ToneAttemptLabel;
}

function labelFor(score: number): ToneAttemptLabel {
	if (score >= 85) return "excellent";
	if (score >= 60) return "good";
	return "needsWork";
}

/**
 * Scores a learner's spoken attempt against a reference recording, purely by
 * pitch-contour shape (never by transcription — see the pronunciation
 * feature's design notes). Returns `null` when either recording has too
 * little voiced signal to normalize (silence, or cut off too short), which
 * the caller should surface as "couldn't hear you clearly" rather than a
 * low score.
 */
export function scoreToneAttempt(
	reference: readonly PitchSample[],
	attempt: readonly PitchSample[],
): ToneAttemptResult | null {
	const referenceContour = normalizeContour(reference);
	const attemptContour = normalizeContour(attempt);
	if (!referenceContour || !attemptContour) return null;

	const { score } = dtwScore(referenceContour, attemptContour);

	return {
		referenceContour,
		attemptContour,
		score,
		label: labelFor(score),
	};
}
