import type { SyllableInfo } from "../types";

/**
 * Deciding a syllable's tone from the two things `vocabulary.json` records
 * about it, because neither is trustworthy on its own.
 *
 * `syllables[].tone` disagrees with the romanization on roughly half the
 * corpus. The fault is systematic: for a low-class initial in a dead syllable
 * it appears to apply the long-vowel branch of the rule unconditionally, so
 * ทุก, รับ, วัด, รถ and ~450 others come out "falling" when a short vowel
 * makes them high. It also records some dead syllables as `live` (และ), which
 * is why deriving the tone from that field's own live/dead flag does not
 * rescue it either.
 *
 * The romanization's combining diacritics are right far more often, but not
 * always: ข้าว is stored `khàao`, low, when ข is a high-class initial under
 * mai tho — which is falling.
 *
 * What is never ambiguous is a *written tone mark* plus the initial's
 * consonant class. That pair determines the tone outright, with no dependence
 * on vowel length or the live/dead classification. So: the mark decides when
 * there is one, and the romanization decides when there is not.
 */

const TONE_BY_DIACRITIC: Record<string, string> = {
	"̀": "low", // à
	"́": "high", // á
	"̂": "falling", // â
	"̌": "rising", // ǎ
};

/** A space or any flavour of hyphen — the corpus uses both as separators. */
const SYLLABLE_SEPARATOR = /[\s-‐-―]+/;

/**
 * One tone per syllable of a romanization; an unmarked syllable is mid.
 *
 * Splitting on whitespace alone is wrong: the corpus writes both "sà wàt diː"
 * and "khàawp-khun", and treating the hyphenated form as a single syllable
 * loses every tone after the first.
 */
export function tonesFromRomanization(romanization: string): string[] {
	return romanization
		.trim()
		.split(SYLLABLE_SEPARATOR)
		.filter((syllable) => syllable.length > 0)
		.map((syllable) => {
			for (const character of syllable.normalize("NFD")) {
				const tone = TONE_BY_DIACRITIC[character];
				if (tone !== undefined) return tone;
			}
			return "mid";
		});
}

/**
 * The tone a written tone mark forces, or null when the syllable carries none.
 *
 * Mai ek and mai tho pair with the initial's class; mai tri and mai chattawa
 * name their tone directly.
 */
export function toneFromMark(syllable: SyllableInfo): string | null {
	const { toneMark, consonantClass } = syllable;
	if (toneMark === "maytri") return "high";
	if (toneMark === "mayjattawa") return "rising";
	if (consonantClass === null) return null;
	if (toneMark === "mayek") return consonantClass === "low" ? "falling" : "low";
	if (toneMark === "maytho")
		return consonantClass === "low" ? "high" : "falling";
	return null;
}
