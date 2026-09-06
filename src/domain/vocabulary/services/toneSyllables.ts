import type { SyllableInfo, VocabEntry } from "../types";

/** One syllable with a determinable tone — the shape a tone-identification card or game item carries. */
export interface ToneSyllable {
	readonly text: string;
	readonly tone: string;
}

/**
 * A word's syllables filtered to the ones with a determinable tone,
 * mirroring the exact filter `VocabCardGenerator.ts` uses to decide
 * whether to generate a `toneIdentification` card at all. Exported so both
 * that generator and the game's `ToneGameItemSource` (which must never
 * read a card's own possibly-`undefined` `syllables` field) share one
 * definition instead of two copies that could drift apart.
 */
export function toneSyllablesOf(entry: VocabEntry): ToneSyllable[] {
	return entry.syllables
		.filter(
			(s): s is SyllableInfo & { tone: string } =>
				s.tone !== null && s.tone !== "",
		)
		.map((s) => ({ text: s.text, tone: s.tone }));
}
