import type { RecallRating } from "./types";

/**
 * Maps a graded answer to an SRS rating on correctness alone.
 *
 * Response time is deliberately *not* an input. It used to split a correct
 * answer into HARD (3) / GOOD (4) / EASY (5) on a 2 s / 5 s threshold, which
 * was calibrated for recognising a single glyph and then applied unchanged to
 * building a whole sentence — work no one, native speaker included, finishes
 * in five seconds. The result was that almost every sentence answer graded as
 * HARD, and HARD in the learning phase holds a card on its current step
 * (`SrsSchedule.handleLearningPhase`), so correctly-answered cards came back
 * ten minutes later and a cleared backlog immediately refilled itself.
 *
 * Thinking time is not recall failure. A card the learner got right advances.
 */
export function ratingFromCorrectness(correct: boolean): RecallRating {
	return correct ? 4 : 2;
}

/**
 * Whether a self-chosen rating counts as having recalled the card.
 *
 * The inverse direction of `ratingFromCorrectness`, needed where the learner
 * grades themselves — the tone analyzer, whose pitch score is a hint rather
 * than a verdict — but the surrounding flow counts correct answers. Three is
 * the threshold the review summary already treats as a pass, kept in one
 * place so the two cannot drift.
 */
export function isCorrectRating(rating: RecallRating): boolean {
	return rating >= 3;
}
