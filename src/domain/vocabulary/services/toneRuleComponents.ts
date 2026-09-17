import type { ThaiSymbolClass } from "../../script/data/symbols";
import type { VocabEntry } from "../types";
import {
	MARK_LABEL,
	syllableShapeOf,
	toneExplanationFor,
} from "./toneExplanation";
import { toneSyllableInfosOf } from "./toneSyllables";

/**
 * Which second input the derivation takes for this syllable.
 *
 * Thai reads the tone from two things, and the first is always the initial's
 * class. The second depends on whether a tone mark is written: a mark
 * overrides the spelling rule outright, so a marked syllable's shape never
 * enters into it, and an unmarked one has no mark to name. Asking for both
 * would be asking for an input that does not exist.
 */
export type ToneRuleAxis = "mark" | "shape";

/** The three classes, in the order the lessons introduce them. */
export const CLASS_OPTIONS = ["mid", "high", "low"] as const;

/** The three shapes a learner has to tell apart to read an unmarked syllable. */
export const SHAPE_OPTIONS = ["live", "dead-short", "dead-long"] as const;

/** The four marks, in their conventional order. */
export const MARK_OPTIONS = [
	"mai ek",
	"mai tho",
	"mai tri",
	"mai chattawa",
] as const;

/** What a learner has to supply to derive one syllable's tone, and what it yields. */
export interface ToneRuleComponents {
	readonly text: string;
	/** Expected first input: the class of the initial consonant. */
	readonly consonantClass: ThaiSymbolClass;
	/** Which second input this syllable takes. */
	readonly axis: ToneRuleAxis;
	/** Expected second input — one of `MARK_OPTIONS` or `SHAPE_OPTIONS`. */
	readonly axisValue: string;
	/** The tone the two inputs produce, which is also the tone the word is said with. */
	readonly tone: string;
	/** The rule in prose, for showing once the answer is checked. */
	readonly description: string;
	/** Which lesson teaches it. */
	readonly lesson: number;
}

/**
 * The inputs to every syllable's tone rule, or `null` when the word cannot
 * honestly be asked this way.
 *
 * Deliberately a stricter gate than `toneSyllablesOf`. That one asks "is this
 * word's tone known", which is the right question for *naming* a tone. This
 * asks "does applying the taught rules to this word actually produce the tone
 * it is said with" — and on a handful of verified words it does not, because
 * อักษรนำ is resolved in the corpus but not in the rule tables. Asking a
 * learner to assemble a formula there would mean watching them pick the right
 * class, the right ending, and then be told the result is wrong: the exact
 * failure `toneSyllablesOf` exists to prevent, one level deeper.
 *
 * All-or-nothing per word rather than per syllable, because the card grades a
 * whole word and a partial card would have to explain which of its syllables
 * does not count.
 */
export function toneRuleComponentsOf(
	entry: VocabEntry,
): ToneRuleComponents[] | null {
	const syllables = toneSyllableInfosOf(entry);
	if (syllables.length === 0) return null;

	const components: ToneRuleComponents[] = [];
	for (const syllable of syllables) {
		const explanation = toneExplanationFor(syllable);
		if (!explanation || explanation.disagreesWithStored) return null;
		if (!syllable.consonantClass) return null;

		if (syllable.toneMark) {
			// Read from the same label map the explanation used, rather than
			// sniffed back out of its prose: the description is for the learner
			// and is free to be reworded.
			const mark = MARK_LABEL[syllable.toneMark];
			if (
				!mark ||
				!MARK_OPTIONS.includes(mark as (typeof MARK_OPTIONS)[number])
			) {
				return null;
			}
			components.push({
				text: syllable.text,
				consonantClass: syllable.consonantClass as ThaiSymbolClass,
				axis: "mark",
				axisValue: mark,
				tone: explanation.tone,
				description: explanation.description,
				lesson: explanation.lesson,
			});
			continue;
		}

		const shape = syllableShapeOf(syllable);
		if (!shape) return null;
		components.push({
			text: syllable.text,
			consonantClass: syllable.consonantClass as ThaiSymbolClass,
			axis: "shape",
			axisValue: shape,
			tone: explanation.tone,
			description: explanation.description,
			lesson: explanation.lesson,
		});
	}

	return components;
}
