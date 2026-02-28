import type { RecallRating } from "./types";

export function ratingFromCorrectness(correct: boolean): RecallRating {
	return correct ? 4 : 2;
}
