import {
	consonants,
	type ThaiSymbolClass,
	toneMarkRules,
	toneRules,
} from "../../script/data/symbols";
import type { SyllableInfo, VocabEntry } from "../types";
import { toneSyllableInfosOf } from "./toneSyllables";

/**
 * Why a syllable takes the tone it does, in the learner's own terms.
 *
 * The word card already showed *that* a syllable is low class, dead, and high
 * tone. It never said those three facts are one rule with a name — that low
 * class plus a dead syllable plus a short vowel *is* high tone, and that this
 * is the rule taught in lesson 4. A learner looking at the card could read the
 * answer off it without ever seeing the derivation they are being asked to
 * perform from memory.
 *
 * The rule is derived rather than stored. `VocabEntry.toneRules` carries the
 * ids a word depends on, but deduplicated across the whole word — ขนาด lists
 * `high-dead-short` and `high-dead-long` without saying which syllable is
 * which. Per-syllable attribution has to be recomputed, and recomputing it
 * from the same tables the lessons teach from is what keeps the explanation
 * and the curriculum from drifting apart.
 */

/** Finals that leave a syllable open in the ear: the sonorants and offglides. */
const LIVE_FINALS = new Set(
	consonants
		.filter((consonant) =>
			["m", "n", "ng", "y", "w", "i", "o"].includes(
				consonant.finalSound.split(/[ (/]/)[0],
			),
		)
		.map((consonant) => consonant.character),
);

/** Every letter that can stand as a consonant, for rejecting stray finals. */
const CONSONANT_CHARS = new Set(consonants.map((c) => c.character));

const SHORT_SIGNS = ["ะ", "ั", "ิ", "ึ", "ุ", "็"];

/** Short vowels that nevertheless end live — the taught exceptions. */
const LIVE_OPEN_SHORT = ["ำ", "ไ", "ใ"];

export type SyllableShape = "live" | "dead-short" | "dead-long";

/**
 * A syllable's shape for tone purposes.
 *
 * The subtlety is the syllable with no vowel written at all — ลด, พบ, ยก. It
 * carries the implicit short vowel of a closed syllable (/o/), so it is
 * dead-**short** and therefore high, not falling. Reading "no short sign" as
 * "long" is a defect this project has now fixed twice, once here and once in
 * `scripts/enrich-vocabulary.py`, having first shipped it on both sides at
 * once — where the two agreed and so looked correct.
 */
export function syllableShapeOf(
	syllable: Pick<SyllableInfo, "vowel" | "finalConsonant">,
): SyllableShape | undefined {
	const vowel = syllable.vowel ?? "";
	const short = SHORT_SIGNS.some((sign) => vowel.includes(sign));
	const final = syllable.finalConsonant ?? "";
	// A stored final of อ is the vowel's prop (มือ, คือ, เสือ), not a stop, and
	// anything that is not a consonant at all (a stray mark, a space) closes
	// nothing.
	const finalChars = [...final].filter(
		(ch) => ch !== "อ" && CONSONANT_CHARS.has(ch),
	);

	if (finalChars.length > 0) {
		if (finalChars.some((ch) => LIVE_FINALS.has(ch))) return "live";
		if (short) return "dead-short";
		return vowel ? "dead-long" : "dead-short";
	}
	if (LIVE_OPEN_SHORT.some((sign) => vowel.includes(sign))) return "live";
	// เ-า is live for tone purposes, the taught exception.
	if (vowel.includes("เ") && vowel.includes("า") && !short) return "live";
	// Nothing written at all, and nothing closing it: a bare consonant
	// standing as its own syllable — the ข of ขนาด, the ต of ตลอด. It carries
	// the implicit short /a/, so it is open *and* short, which is dead-short.
	// This is the same defect as the closed case two branches up, in the one
	// shape that branch does not reach: "no vowel written" was being read as
	// "long vowel" here too, which made ข live and so rising instead of low.
	if (!vowel) return "dead-short";
	return short ? "dead-short" : "live";
}

export interface ToneExplanation {
	/** The rule id in `symbols.ts`, so a caller can link to the lesson. */
	readonly ruleId: string;
	/** "Low class + dead syllable + short vowel = high tone", as taught. */
	readonly description: string;
	/** The tone the rule gives, which should match the stored one. */
	readonly tone: string;
	/** Which lesson teaches it. */
	readonly lesson: number;
	/**
	 * True when the stored tone is not what this rule produces.
	 *
	 * Shown rather than hidden: a word whose tone the rules do not reach is
	 * exactly the word a learner will try to derive and fail on, and telling
	 * them "this one is an exception" is the honest answer. `toneStatus`
	 * carries the same judgement for the word as a whole.
	 */
	readonly disagreesWithStored: boolean;
}

/** The corpus's `toneMark` ids to the names `toneMarkRules` and the lessons use. */
export const MARK_LABEL: Record<string, string> = {
	mayek: "mai ek",
	maytho: "mai tho",
	maytri: "mai tri",
	mayjattawa: "mai chattawa",
};

/**
 * The rule that explains one syllable's tone, or `undefined` when the tables
 * do not reach it — an unclassified initial, or a mark-and-class pair Thai
 * never writes.
 */
export function toneExplanationFor(
	syllable: Pick<
		SyllableInfo,
		"vowel" | "finalConsonant" | "consonantClass" | "toneMark" | "tone"
	>,
): ToneExplanation | undefined {
	const consonantClass = syllable.consonantClass as ThaiSymbolClass | null;
	if (!consonantClass) return undefined;

	// A tone mark overrides the spelling rule entirely — that is the whole
	// point of writing one — so it is the explanation when present.
	if (syllable.toneMark) {
		const label = MARK_LABEL[syllable.toneMark] ?? syllable.toneMark;
		const rule = toneMarkRules.find(
			(candidate) =>
				candidate.toneMarkName === label &&
				candidate.consonantClass === consonantClass,
		);
		if (!rule) return undefined;
		return {
			ruleId: `${consonantClass}-${label.replace(/\s+/g, "-")}`,
			description: `${consonantClass} class + ${label} = ${rule.resultingTone} tone.`,
			tone: rule.resultingTone,
			lesson: rule.lesson,
			disagreesWithStored: Boolean(
				syllable.tone && syllable.tone !== rule.resultingTone,
			),
		};
	}

	const shape = syllableShapeOf(syllable);
	if (!shape) return undefined;
	const rule = toneRules.find(
		(candidate) =>
			candidate.consonantClass === consonantClass &&
			candidate.syllableType === shape,
	);
	if (!rule) return undefined;
	return {
		ruleId: rule.id,
		description: rule.description,
		tone: rule.resultingTone,
		lesson: rule.lesson,
		disagreesWithStored: Boolean(
			syllable.tone && syllable.tone !== rule.resultingTone,
		),
	};
}

/**
 * One explanation per syllable a tone card grades, in that card's order.
 *
 * Built on `toneSyllableInfosOf` rather than `entry.syllables` so the result
 * lines up index-for-index with `toneSyllablesOf` — the list the card was
 * built from — even for a word where some syllable's tone was never
 * determined. See that function for why the alignment has to be structural
 * rather than assumed.
 *
 * An entry is `undefined` where the tables do not reach the syllable at all;
 * a syllable the rules reach but disagree with is returned with
 * `disagreesWithStored` set, because "no taught rule predicts this one" is
 * the honest thing to show a learner who just derived it correctly and was
 * marked wrong.
 */
export function toneExplanationsOf(
	entry: VocabEntry,
): (ToneExplanation | undefined)[] {
	return toneSyllableInfosOf(entry).map((syllable) =>
		toneExplanationFor(syllable),
	);
}
