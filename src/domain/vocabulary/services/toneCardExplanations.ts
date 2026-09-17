import type { ToneGameItem } from "../../game/types";
import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry, VocabProperty } from "../types";
import { type ToneExplanation, toneExplanationsOf } from "./toneExplanation";
import {
	type ToneRuleComponents,
	toneRuleComponentsOf,
} from "./toneRuleComponents";
import { thaiWordFromToneCardId, toneSyllablesOf } from "./toneSyllables";

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
	const entry = entryForCard(cardId, "toneIdentification");
	return entry ? toneExplanationsOf(entry) : [];
}

/**
 * The inputs a `toneRule` card asks the learner to supply, or `null` when
 * the card's word is no longer derivable from the taught rules.
 *
 * `null` is not the same as "no card": the generator only emits a `toneRule`
 * card for a word that passes, so reaching `null` here means the corpus has
 * changed under a persisted card. Rendering nothing is the honest response —
 * far better than grading against components this build cannot reproduce.
 */
export function toneRuleComponentsForCard(
	cardId: string,
): ToneRuleComponents[] | null {
	const entry = entryForCard(cardId, "toneRule");
	return entry ? toneRuleComponentsOf(entry) : null;
}

/**
 * A `tonePronunciation` card's word as the game's own tone item, or `null`
 * when the corpus no longer has the word or its recording.
 *
 * The shape is the game's rather than a parallel one so the analyzer organism
 * stays single-implementation. `challengeDirection` has exactly one value —
 * tone practice is never a direction choice — so building the item here
 * invents nothing.
 */
export function toneItemForCard(cardId: string): ToneGameItem | null {
	const entry = entryForCard(cardId, "tonePronunciation");
	if (!entry?.thai_audio_file) return null;

	const syllables = toneSyllablesOf(entry);
	if (syllables.length === 0) return null;

	return {
		kind: "tone",
		thaiWord: entry.thai,
		syllables,
		audioUrl: entry.thai_audio_file,
		challengeDirection: "identification",
	};
}

/** The word behind a tone card of the given property, if the corpus still has it. */
function entryForCard(
	cardId: string,
	property: VocabProperty,
): VocabEntry | undefined {
	const thai = thaiWordFromToneCardId(cardId, property);
	if (!thai) return undefined;

	if (!byThai) {
		byThai = new Map(
			(vocabularyData as unknown as VocabEntry[]).map((entry) => [
				entry.thai,
				entry,
			]),
		);
	}

	return byThai.get(thai);
}
