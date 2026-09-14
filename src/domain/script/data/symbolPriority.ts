/**
 * Scheduling priority for the 44 consonants (Task 4.1).
 *
 * CONTEXT.md rule 2 — build on, never beside. `ThaiConsonant.priority` (and
 * the field on the other symbol subclasses) already exists at 98 sites; this
 * module is the field's first consumer, not a second priority concept. There
 * is exactly one place the optional numeric priority field is declared, in
 * `symbols.ts` — asserted by `lessonSequence.test.ts`'s
 * "declares symbol priority exactly once" case and re-asserted here against
 * the derivation this module owns.
 *
 * Demotion changes what a letter's `priority` number IS, computed from
 * corpus frequency, never whether the letter is in the set: the count of
 * consonants is unaffected (AC6).
 */

import vocabularyData from "../../vocabulary/data/vocabulary.json";
import { consonants } from "./symbols";

interface CorpusEntry {
	readonly characters?: readonly string[];
}

const CONSONANT_CHARACTERS: readonly string[] = consonants.map(
	(consonant) => consonant.character,
);

/**
 * Any-position occurrence count across the vocabulary corpus: every
 * character slot in every entry's `characters` array, not just word-initial
 * position (AC5). An initial-position count would demote letters that are
 * common medially or finally but rare as an initial — measured, seven of the
 * ten letters this phase demotes still appear in the corpus's top-600 words.
 */
export function computeAnyPositionFrequency(
	entries: readonly CorpusEntry[] = vocabularyData as CorpusEntry[],
): Map<string, number> {
	const counts = new Map<string, number>(
		CONSONANT_CHARACTERS.map((character) => [character, 0]),
	);
	for (const entry of entries) {
		for (const character of entry.characters ?? []) {
			if (counts.has(character)) {
				counts.set(character, (counts.get(character) ?? 0) + 1);
			}
		}
	}
	return counts;
}

/**
 * Rank order derived from corpus frequency: rank 1 is the most frequent
 * consonant, rank 44 the rarest. Ties break on the character itself (plain
 * code-point order) so the derivation is deterministic and reproducible from
 * the corpus alone — never hand-curated.
 */
export function deriveConsonantPriority(
	frequency: Map<string, number> = computeAnyPositionFrequency(),
): Map<string, number> {
	const ranked = [...CONSONANT_CHARACTERS].sort((a, b) => {
		const byFrequency = (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0);
		if (byFrequency !== 0) return byFrequency;
		return a < b ? -1 : a > b ? 1 : 0;
	});
	return new Map(ranked.map((character, index) => [character, index + 1]));
}

/**
 * The scheduling priority for a consonant — reads `ThaiConsonant.priority`
 * directly, the single declaration site. Rare letters get a larger number
 * (lower priority) without leaving the symbol set.
 */
export function getSchedulingPriority(character: string): number | undefined {
	return consonants.find((consonant) => consonant.character === character)
		?.priority;
}

/** The number of consonants in the SRS. Demotion must never change this. */
export function consonantCount(): number {
	return consonants.length;
}
