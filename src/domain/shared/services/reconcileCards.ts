import type { SrsCard } from "../types";

/**
 * Diffs a freshly-generated card set for entries the learner has already
 * started against what's currently persisted, returning only the DTOs that
 * need writing back — additive only, and deliberately narrow:
 *
 * - A generated id absent from `persisted` is a genuinely new review item
 *   (e.g. a card type that only became eligible once audio/distractor data
 *   landed) — returned as-is, with whatever fresh `srs` the generator gave
 *   it.
 * - A generated id already present in `persisted` is returned ONLY when the
 *   persisted card is missing `audioUrl` or `consonantClass` and the
 *   generated one has it, in which case just that field is copied onto the
 *   *persisted* DTO — `srs`, `question` and `choices` always come from
 *   what's persisted, never the freshly generated card. Every generator
 *   shuffles `choices` with `Math.random()` on each call, so a full
 *   overwrite would rewrite already-learned cards' choices on nearly every
 *   boot for no actual content change.
 * - **One exception, for `syllables`.** A vocab `toneIdentification` card's
 *   `syllables` and `correctAnswer` are a pure function of the word's tones
 *   — no shuffling, nothing derived from the learner — so unlike `choices`
 *   they cannot churn, and a stale copy is simply wrong. The tones in
 *   `vocabulary.json` were wrong for ~14% of syllables until
 *   `scripts/enrich-vocabulary.py` was fixed (see its docstring), and a
 *   learner who generated their cards before that fix has the old answer
 *   baked into `correctAnswer` — `ToneQuiz` would go on marking the correct
 *   tone wrong forever. So when the generated `syllables` differ from the
 *   persisted ones, both fields are taken from the generated card. `srs` is
 *   still the learner's.
 * - A persisted id absent from `generated` is left alone — this never
 *   deletes anything.
 */
export function reconcileGeneratedCards<T extends SrsCard>(
	persisted: readonly T[],
	generated: readonly T[],
): T[] {
	const persistedById = new Map(persisted.map((card) => [card.id, card]));
	const toSave: T[] = [];

	for (const card of generated) {
		const existing = persistedById.get(card.id);
		if (!existing) {
			toSave.push(card);
			continue;
		}

		const patch: Partial<T> = {};
		if (!existing.audioUrl && card.audioUrl) {
			patch.audioUrl = card.audioUrl;
		}
		// See the `syllables` exception in this function's doc comment.
		const existingSyllables = (existing as Record<string, unknown>).syllables;
		const generatedSyllables = (card as Record<string, unknown>).syllables;
		if (
			generatedSyllables !== undefined &&
			JSON.stringify(existingSyllables) !== JSON.stringify(generatedSyllables)
		) {
			(patch as Record<string, unknown>).syllables = generatedSyllables;
			(patch as Record<string, unknown>).correctAnswer = card.correctAnswer;
		}
		const existingClass = (existing as Record<string, unknown>).consonantClass;
		const generatedClass = (card as Record<string, unknown>).consonantClass;
		if (!existingClass && generatedClass) {
			(patch as Record<string, unknown>).consonantClass = generatedClass;
		}

		if (Object.keys(patch).length > 0) {
			toSave.push({ ...existing, ...patch });
		}
	}

	return toSave;
}
