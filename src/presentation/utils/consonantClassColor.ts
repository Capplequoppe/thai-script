import type { CSSProperties } from "react";
import {
	type District,
	districtForClass,
} from "../../domain/script/data/sceneGrammar";
import { ThaiSymbolClass } from "../../domain/script/data/symbols";
import type { ScaffoldLevel } from "./srsFade";

// Single source of truth for how consonant class maps to color, so the
// mnemonic stays consistent everywhere it appears (glyphs, badges, syllable
// breakdowns). Previously ClassBadge and WordCard each had their own
// (differing, partly wrong) mapping. The district (the non-colour channel,
// see sceneGrammar.ts) and the class-cue state below extend this same single
// source rather than living beside it, for the same reason.
const CLASS_COLOR_VAR: Record<string, string> = {
	low: "var(--color-class-low)",
	mid: "var(--color-class-mid)",
	high: "var(--color-class-high)",
};

const VALID_CLASSES: ReadonlySet<string> = new Set(
	Object.values(ThaiSymbolClass),
);

function isKnownClass(
	classType: string | null | undefined,
): classType is ThaiSymbolClass {
	return classType != null && VALID_CLASSES.has(classType);
}

/**
 * The three states a rendered class cue can be in: a real, derivable class; a
 * kind that never carries one (a vowel, a numeral); or a value that isn't a
 * recognised class at all. The last state must render distinguishably from
 * the second — an unresolved class is not the same as no class — so callers
 * key their rendering off this rather than treating any falsy/invalid value
 * the same way.
 */
export type ClassCueState = "known" | "not-applicable" | "unresolved";

export function classCueState(
	classType: string | null | undefined,
): ClassCueState {
	if (classType == null || classType === "") return "not-applicable";
	return isKnownClass(classType) ? "known" : "unresolved";
}

/** CSS color value for a consonant class, or undefined for an unknown class (renders as default text color). */
export function classColor(
	classType: string | null | undefined,
): string | undefined {
	if (!classType) return undefined;
	return CLASS_COLOR_VAR[classType];
}

/**
 * Class color at a given scaffold level: full color while a word is still
 * being learned, blended halfway toward default text color once it's
 * "fading" (Enlightened), and plain default text color once "none"
 * (Burned) — a mastered word should read like unmarked Thai text.
 */
export function classColorForLevel(
	classType: string | null | undefined,
	level: ScaffoldLevel,
): string | undefined {
	const color = classColor(classType);
	if (!color || level === "none") return undefined;
	if (level === "fading") {
		return `color-mix(in srgb, ${color} 50%, var(--color-text))`;
	}
	return color;
}

/**
 * The class district for a known class, or undefined for "not-applicable"
 * and "unresolved" alike (see `classCueState` for telling those two apart).
 * Derives from `districtForClass` — `sceneGrammar.ts` stays the one place
 * the class→district mapping is declared.
 */
export function classDistrict(
	classType: string | null | undefined,
): District | undefined {
	return isKnownClass(classType) ? districtForClass(classType) : undefined;
}

/**
 * District at a given scaffold level, fading on the exact same schedule as
 * `classColorForLevel`: full at "full"/"fading" (opacity carries the fade —
 * see `districtOpacityForLevel`), absent at "none" so a burned item shows
 * neither channel and reads as unmarked Thai text. Takes the *symbol's own*
 * level, not a containing word's — every call is independent, so a word
 * with consonants at different stages renders each district at its own
 * symbol's fade, never the word's.
 */
export function classDistrictForLevel(
	classType: string | null | undefined,
	level: ScaffoldLevel,
): District | undefined {
	if (level === "none") return undefined;
	return classDistrict(classType);
}

/** Opacity for the district (and any other shape-based, non-colour) scaffold at a given level — the same two-step fade `classColorForLevel` mixes toward text color. */
export function districtOpacityForLevel(level: ScaffoldLevel): number {
	return level === "fading" ? 0.5 : 1;
}

export function classBadgeStyle(
	classType: string | null | undefined,
): CSSProperties {
	const color = classColor(classType);
	if (!color) {
		return {
			background: "var(--color-surface-2)",
			color: "var(--color-text-muted)",
		};
	}
	return {
		background: `color-mix(in srgb, ${color} 15%, var(--color-surface))`,
		color,
	};
}
