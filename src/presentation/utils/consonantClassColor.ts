import type { CSSProperties } from "react";
import type { ScaffoldLevel } from "./srsFade";

// Single source of truth for how consonant class maps to color, so the
// mnemonic stays consistent everywhere it appears (glyphs, badges, syllable
// breakdowns). Previously ClassBadge and WordCard each had their own
// (differing, partly wrong) mapping.
const CLASS_COLOR_VAR: Record<string, string> = {
	low: "var(--color-class-low)",
	mid: "var(--color-class-mid)",
	high: "var(--color-class-high)",
};

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
