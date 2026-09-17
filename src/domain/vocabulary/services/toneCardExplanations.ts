import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import { type ToneExplanation, toneExplanationsOf } from "./toneExplanation";
import { thaiWordFromToneCardId } from "./toneSyllables";

/**
 * Built on first use rather than at module load: this module is imported by
 * a quiz component, and a learner who never opens a tone question should not
 * pay to index 5,500 words. `VocabMnemonic` reads the corpus the same way.
 *
 * Keyed on `thai`, which the corpus does not guarantee is unique — the last
 * row for a spelling wins, exactly as `ToneGameItemSource` resolves it. That
 * is safe here for the same reason it is safe there: a tone card's id is
 * `vocab:{thai}:toneIdentification`, so two rows sharing a spelling already
 * share one card, and two rows sharing a spelling share its tones.
 */
let byThai: Map<string, VocabEntry> | null = null;

/**
 * The rule behind each syllable of a tone card, in the order the card grades
 * them, or `[]` when the card is not a tone card or its word has left the
 * corpus.
 *
 * Resolved from the card **id**, never from `promptWord` or the card's own
 * `syllables`: a persisted card predates both the current tones and, in some
 * cases, the `syllables` field itself, and an explanation derived from a
 * stale copy would confidently describe the wrong derivation. The id is the
 * one field that cannot go stale, because it is what identifies the card.
 */
export function toneExplanationsForCard(
	cardId: string,
): (ToneExplanation | undefined)[] {
	const thai = thaiWordFromToneCardId(cardId);
	if (!thai) return [];

	if (!byThai) {
		byThai = new Map(
			(vocabularyData as unknown as VocabEntry[]).map((entry) => [
				entry.thai,
				entry,
			]),
		);
	}

	const entry = byThai.get(thai);
	return entry ? toneExplanationsOf(entry) : [];
}
