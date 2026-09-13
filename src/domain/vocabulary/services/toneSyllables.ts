import type { SyllableInfo, VocabEntry } from "../types";
import { toneFromMark, tonesFromRomanization } from "./resolveTone";

/** One syllable with a determinable tone — the shape a tone-identification card or game item carries. */
export interface ToneSyllable {
	readonly text: string;
	readonly tone: string;
}

/**
 * A word's syllables with their tones resolved, or an empty list when the
 * word cannot be quizzed honestly.
 *
 * Exported so `VocabCardGenerator.ts` and the game's `ToneGameItemSource`
 * (which must never read a card's own possibly-`undefined` `syllables` field)
 * share one definition instead of two copies that could drift apart. Because
 * the generator only emits a card when this returns something, returning
 * nothing is also how a word opts out of being asked about at all.
 *
 * Two corrections happen here, both against `syllables[].tone`, which is
 * wrong often enough that it cannot be read directly — see `resolveTone.ts`
 * for what is wrong with it and why the alternatives are trusted in the order
 * they are.
 *
 *  - **The tone is recomputed.** 1070 of the corpus's words were being marked
 *    with the wrong correct answer, so a learner answering ทุก as high — which
 *    is right — was told they had failed.
 *  - **Words whose syllable split is unreliable are dropped.** For 758 words
 *    the stored syllable count disagrees with the romanization's, meaning the
 *    analyser failed to split a compound: สบาย is recorded as one syllable
 *    when it is sà-baai. Their syllable *text* is wrong too, and no amount of
 *    tone correction fixes a card that shows the wrong syllables. Asking
 *    nothing beats asking something false.
 */
export function toneSyllablesOf(entry: VocabEntry): ToneSyllable[] {
	const stored = entry.syllables.filter(
		(syllable): syllable is SyllableInfo & { tone: string } =>
			syllable.tone !== null && syllable.tone !== "",
	);
	if (stored.length === 0) return [];

	// Nothing to check against: keep what is stored rather than drop the card.
	// Every entry in the shipped corpus has a romanization, so this is about
	// tolerating a malformed entry, not about a case the data actually holds.
	if (!entry.romanization?.trim()) {
		return stored.map(({ text, tone }) => ({ text, tone }));
	}

	// Only a full-length agreement lets a romanization tone be matched to the
	// syllable it belongs to. A partial filter above would misalign them, so
	// compare against every syllable, not just the ones carrying a tone.
	const fromRomanization = tonesFromRomanization(entry.romanization);
	if (fromRomanization.length !== entry.syllables.length) return [];

	return entry.syllables.map((syllable, index) => ({
		text: syllable.text,
		tone:
			toneFromMark(syllable) ??
			fromRomanization[index] ??
			(syllable.tone as string),
	}));
}
