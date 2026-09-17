import type { SyllableInfo, VocabEntry, VocabProperty } from "../types";

/**
 * Anchored to the typed `VocabProperty` union rather than written inline,
 * because `VocabCard.property` is untyped `string` — renaming the property
 * would otherwise leave this matching a name nothing generates.
 */
const TONE_PROPERTY: VocabProperty = "toneIdentification";

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
	return toneSyllableInfosOf(entry).map((s) => ({
		text: s.text,
		tone: s.tone,
	}));
}

/**
 * The same syllables `toneSyllablesOf` asks about, but undiminished.
 *
 * `ToneSyllable` is a two-field projection, which is all a card needs to
 * grade an answer — but not enough to say *why* the answer is what it is:
 * the rule needs the initial's class, the vowel, the final and any tone
 * mark. Anything explaining a graded syllable has to start here.
 *
 * The filtering lives in this function rather than in `toneSyllablesOf` so
 * that the two lists are the same list, in the same order, by construction.
 * Aligning an explanation against a card's `syllables` by index is only
 * sound because of that: a word whose first syllable has no determinable
 * tone is graded on its *second*, and an explanation derived from the
 * unfiltered `entry.syllables[0]` would describe a syllable the learner was
 * never asked about — while looking entirely plausible.
 */
export function toneSyllableInfosOf(
	entry: VocabEntry,
): (SyllableInfo & { tone: string })[] {
	if (entry.toneStatus !== "verified") return [];
	return entry.syllables.filter(
		(s): s is SyllableInfo & { tone: string } =>
			s.tone !== null && s.tone !== "",
	);
}

/**
 * The Thai word a tone-identification card id names, or `null` when the id
 * is not one.
 *
 * The id is the only field on a `toneIdentification` card that is safe to
 * read generically: `syllables` can be `undefined` on cards persisted
 * before that field existed, and `promptWord` is flagged unsafe elsewhere
 * (see `plans/practice-mode-expansion/CONTEXT.md`). Everything else about
 * the word comes from the matching `VocabEntry`.
 */
export function thaiWordFromToneCardId(id: string): string | null {
	const parts = id.split(":");
	if (parts.length !== 3) return null;
	const [prefix, thai, property] = parts;
	if (prefix !== "vocab" || !thai || property !== TONE_PROPERTY) return null;
	return thai;
}
