import type { VocabularyCard } from "../types";

const TONE_PROPERTY = "toneIdentification";

/**
 * Rewrites the answer on already-persisted tone-identification cards whose
 * stored `correctAnswer` is now known to be wrong.
 *
 * `reconcileGeneratedCards` refuses to touch `correctAnswer`, and rightly so:
 * every generator reshuffles `choices` with `Math.random()` on each call, so
 * overwriting persisted content wholesale would churn learned cards on nearly
 * every boot. That rule assumes the persisted answer is the trustworthy one.
 *
 * For tone cards it was not. Their answer came from `vocabulary.json`'s
 * `syllables[].tone`, which is wrong for 1070 of the words that carry a tone
 * card — a learner answering ทุก as high, which is correct, was marked wrong.
 * Leaving those in place would mean the fix only ever reached new learners,
 * and every existing one kept being failed for right answers.
 *
 * So this is deliberately narrow: tone cards only, answer and syllables only,
 * and only when the two actually differ. SRS state, choices and question text
 * are untouched, so a card keeps its whole review history and simply starts
 * being marked correctly.
 *
 * It does not remove tone cards for words the generator now declines to quiz
 * (those whose syllable split is unreliable). Deleting a learner's card is a
 * different kind of decision from correcting one, and nothing here is
 * equipped to make it.
 */
export function repairToneAnswers(
	persisted: readonly VocabularyCard[],
	generated: readonly VocabularyCard[],
): VocabularyCard[] {
	const generatedById = new Map(
		generated
			.filter((card) => card.property === TONE_PROPERTY)
			.map((card) => [card.id, card]),
	);

	const toSave: VocabularyCard[] = [];
	for (const card of persisted) {
		if (card.property !== TONE_PROPERTY) continue;
		const fresh = generatedById.get(card.id);
		if (!fresh || fresh.correctAnswer === card.correctAnswer) continue;
		toSave.push({
			...card,
			correctAnswer: fresh.correctAnswer,
			syllables: fresh.syllables,
		});
	}
	return toSave;
}
