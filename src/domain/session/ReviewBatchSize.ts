/**
 * How many cards one sitting of review is allowed to be.
 *
 * A backlog is the normal state of a spaced-repetition course — miss a few
 * days and 200 vocabulary cards come due at once — and a single session of
 * 200 is the thing a learner bounces off. The queue is the same size either
 * way; what the batch changes is that finishing is reachable from where the
 * learner is standing, and the count they see going in is one they can say
 * yes to.
 *
 * Applies to every pool: script, vocabulary, grammar and sentences all run
 * through `ReviewService.startReviewSession`, which reads this whenever its
 * caller does not name a size of its own.
 */

/** Big enough to be worth sitting down for, small enough to finish. */
export const DEFAULT_REVIEW_BATCH_SIZE = 20;

export const MIN_REVIEW_BATCH_SIZE = 1;

/**
 * Past this a "batch" is no longer one — the cap exists so a typo in the
 * settings field cannot restore the unbounded session this replaced.
 */
export const MAX_REVIEW_BATCH_SIZE = 200;

export function isValidReviewBatchSize(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= MIN_REVIEW_BATCH_SIZE &&
		value <= MAX_REVIEW_BATCH_SIZE
	);
}
