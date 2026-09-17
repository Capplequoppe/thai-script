/**
 * The eight-cell tone-mark table as one checkable structure (Task 4.1).
 *
 * The source course spreads mid class (lessons 17-18), high class (21-22) and
 * low class (23-24) across six lessons with unrelated material between them.
 * The table is small enough to teach as one pattern: mid class takes all four
 * marks; high and low class take only mái-èek and mái-thoo; low class is the
 * odd one out, giving falling/high where high class gives low/falling.
 *
 * CONTEXT.md rule 2 — build on, never beside. `completeToneChart.withToneMark`
 * already carries this exact table, with `"N/A"` recording the four
 * combinations standard spelling never uses. This module reads that chart and
 * `toneMarkRules` rather than re-declaring the data, and turns the "N/A"
 * shorthand into a queryable three-state result (AC7): a class-and-mark
 * combination is `"resolved"`, declared `"unreachable"`, or `"undeclared"` —
 * three distinct states, so an unimplemented query never reads the same as an
 * impossible one.
 *
 * `"unreachable"`, not `"impossible"` (AC2): mái-dtrii and mái-jàt-dtà-waa on
 * a high- or low-class consonant are writable shapes that turn up in
 * loanwords and informal spelling. They are absent from *standard*
 * orthography, which is a fact about spelling convention, not about what a
 * learner could be shown and told "that can't exist."
 */

import {
	completeToneChart,
	ThaiSymbolClass,
	type ToneMarkRule,
	type ToneValue,
	toneMarkRules,
	toneRules,
} from "./symbols";

export type ToneMarkName = "mai ek" | "mai tho" | "mai tri" | "mai chattawa";

export const TONE_MARK_NAMES: readonly ToneMarkName[] = Object.freeze([
	"mai ek",
	"mai tho",
	"mai tri",
	"mai chattawa",
]);

export const TONE_MARK_TABLE_CLASSES: readonly ThaiSymbolClass[] =
	Object.freeze([
		ThaiSymbolClass.Mid,
		ThaiSymbolClass.High,
		ThaiSymbolClass.Low,
	]);

export type ToneMarkCellState = "resolved" | "unreachable" | "undeclared";

export interface ToneMarkCell {
	readonly toneMarkName: ToneMarkName;
	readonly consonantClass: ThaiSymbolClass;
	readonly state: ToneMarkCellState;
	readonly resultingTone?: ToneValue;
	/** Present only when `state` is `"unreachable"`. */
	readonly note?: string;
}

const UNREACHABLE_NOTE =
	"Not used in standard spelling. The shape is writable — it appears in loanwords and informal spelling — but no standard word pairs this mark with this consonant class.";

function findRule(
	toneMarkName: ToneMarkName,
	consonantClass: ThaiSymbolClass,
): ToneMarkRule | undefined {
	return toneMarkRules.find(
		(rule) =>
			rule.toneMarkName === toneMarkName &&
			rule.consonantClass === consonantClass,
	);
}

/**
 * `completeToneChart.withToneMark.rules` records `"N/A"` for mid-only marks
 * against the `high`/`low` columns — that IS the unreachable set, read off
 * the existing chart rather than re-declared.
 */
function isDeclaredUnreachable(
	toneMarkName: ToneMarkName,
	consonantClass: ThaiSymbolClass,
): boolean {
	if (consonantClass === ThaiSymbolClass.Mid) return false;
	const column = consonantClass === ThaiSymbolClass.High ? "high" : "low";
	const row = completeToneChart.withToneMark.rules.find((candidate) =>
		candidate.mark.startsWith(toneMarkName),
	);
	return row?.[column] === "N/A";
}

/** AC1, AC2, AC7 — every class-and-mark combination resolves to exactly one
 * of three states, and "unreachable" is a declaration, not an absence. */
export function getToneMarkCell(
	toneMarkName: ToneMarkName,
	consonantClass: ThaiSymbolClass,
): ToneMarkCell {
	const rule = findRule(toneMarkName, consonantClass);
	if (rule) {
		return {
			toneMarkName,
			consonantClass,
			state: "resolved",
			resultingTone: rule.resultingTone,
		};
	}
	if (isDeclaredUnreachable(toneMarkName, consonantClass)) {
		return {
			toneMarkName,
			consonantClass,
			state: "unreachable",
			note: UNREACHABLE_NOTE,
		};
	}
	return { toneMarkName, consonantClass, state: "undeclared" };
}

/** The full 3-class × 4-mark table the lesson renders — twelve cells. */
export function buildToneMarkTable(): ToneMarkCell[] {
	return TONE_MARK_TABLE_CLASSES.flatMap((consonantClass) =>
		TONE_MARK_NAMES.map((toneMarkName) =>
			getToneMarkCell(toneMarkName, consonantClass),
		),
	);
}

export interface SyllableToneQuery {
	/** The syllable's governing class — for a leading-consonant syllable this
	 * is the leader's class, not the class of the letter the mark sits over
	 * (AC3). */
	readonly governingClass: ThaiSymbolClass;
	readonly syllableType: "live" | "dead-short" | "dead-long";
	readonly toneMark?: ToneMarkName;
}

/**
 * AC3 — a tone mark resolves against the governing class and, once resolved,
 * the live/dead spelling rule (`toneRules`) is not consulted at all: the mark
 * wins outright rather than being weighed against the spelling outcome.
 */
export function resolveSyllableTone(
	query: SyllableToneQuery,
): ToneValue | undefined {
	if (query.toneMark) {
		const cell = getToneMarkCell(query.toneMark, query.governingClass);
		if (cell.state === "resolved") return cell.resultingTone;
	}
	const spellingRule = toneRules.find(
		(rule) =>
			rule.consonantClass === query.governingClass &&
			rule.syllableType === query.syllableType,
	);
	return spellingRule?.resultingTone;
}
