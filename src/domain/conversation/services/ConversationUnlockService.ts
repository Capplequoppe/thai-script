/**
 * Whether conversation practice is unlocked for a learner, given their
 * current known-vocabulary and learned-grammar counts.
 *
 * Pure and dependency-free on purpose — both call sites (`Dashboard`,
 * `ConversationPracticePage`) already have these two counts on hand via
 * `AppContextValue.vocab`/`AppContextValue.lesson` (see CONTEXT.md: no new
 * `AppContextValue` member is needed), so this function never reaches into
 * storage or a service itself.
 *
 * Thresholds are gating-by-content-richness only (CONTEXT.md: a vocabulary
 * threshold tuned to fix live-generation compliance was measured not to
 * work and is not what this is for) — a learner needs enough known words
 * and grammar points for the pre-generated content bank to have anything
 * meaningful to draw from.
 */

/** Minimum distinct known vocabulary words required to unlock. */
export const MIN_VOCAB_COUNT = 200;

/** Minimum learned grammar points required to unlock. */
export const MIN_GRAMMAR_POINTS = 5;

export interface ConversationUnlockStatus {
	unlocked: boolean;
	/** How many more words are needed, 0 once the threshold is met. */
	vocabNeeded: number;
	/** How many more grammar points are needed, 0 once the threshold is met. */
	grammarNeeded: number;
}

/**
 * Both thresholds are inclusive — a learner at exactly `MIN_VOCAB_COUNT`
 * words and `MIN_GRAMMAR_POINTS` grammar points is unlocked, not one word
 * or one grammar point short of it.
 */
export function checkConversationUnlock(
	learnedVocabCount: number,
	learnedGrammarCount: number,
): ConversationUnlockStatus {
	const vocabNeeded = Math.max(0, MIN_VOCAB_COUNT - learnedVocabCount);
	const grammarNeeded = Math.max(0, MIN_GRAMMAR_POINTS - learnedGrammarCount);
	return {
		unlocked: vocabNeeded === 0 && grammarNeeded === 0,
		vocabNeeded,
		grammarNeeded,
	};
}
