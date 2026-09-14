import type { SyllableInfo, VocabEntry } from "../types";

/** One syllable with a determinable tone — the shape a tone-identification card or game item carries. */
export interface ToneSyllable {
	readonly text: string;
	readonly tone: string;
}

/**
 * A word's syllables filtered to the ones this app is willing to ask about.
 *
 * This is the one gate on every tone question in the app: it decides both
 * whether `VocabCardGenerator` emits a `toneIdentification` card and what
 * the game's `ToneGameItemSource` can draw. Returning `[]` removes the word
 * from tone practice entirely, while leaving it in reading, meaning and
 * audio exercises untouched.
 *
 * Only `verified` words pass. A word whose tones the taught rules do not
 * reproduce would be asking the learner for an answer they have been given
 * no way to derive — which is the specific failure this gate exists to
 * prevent: applying the rule you were taught, correctly, and being marked
 * wrong. See `ToneStatus` for what the three states mean and
 * `scripts/enrich-vocabulary.py` for how they are decided.
 *
 * The `tone !== null` filter below is kept on top of that: a syllable whose
 * tone could not be determined at all never becomes a question, verified
 * word or not.
 */
export function toneSyllablesOf(entry: VocabEntry): ToneSyllable[] {
	if (entry.toneStatus !== "verified") return [];
	return entry.syllables
		.filter(
			(s): s is SyllableInfo & { tone: string } =>
				s.tone !== null && s.tone !== "",
		)
		.map((s) => ({ text: s.text, tone: s.tone }));
}
