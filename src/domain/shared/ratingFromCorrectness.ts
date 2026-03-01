import type { RecallRating } from "./types";

const FAST_THRESHOLD_MS = 2000;
const SLOW_THRESHOLD_MS = 5000;

export function ratingFromCorrectness(
	correct: boolean,
	responseTimeMs?: number,
): RecallRating {
	if (!correct) return 2;
	if (responseTimeMs === undefined) return 4;
	if (responseTimeMs < FAST_THRESHOLD_MS) return 5; // Fast → EASY
	if (responseTimeMs > SLOW_THRESHOLD_MS) return 3; // Slow → HARD
	return 4; // Normal → GOOD
}
