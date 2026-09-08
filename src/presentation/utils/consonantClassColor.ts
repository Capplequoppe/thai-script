import type { CSSProperties } from "react";

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
