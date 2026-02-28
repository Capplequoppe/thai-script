import type { CSSProperties } from "react";

const STYLES: Record<string, CSSProperties> = {
	low: {
		background:
			"color-mix(in srgb, var(--color-enlightened) 15%, var(--color-surface))",
		color: "var(--color-enlightened)",
	},
	mid: {
		background:
			"color-mix(in srgb, var(--color-master) 15%, var(--color-surface))",
		color: "var(--color-master)",
	},
	high: {
		background:
			"color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))",
		color: "var(--color-accent-h)",
	},
};

const FALLBACK_STYLE: CSSProperties = {
	background: "var(--color-surface-2)",
	color: "var(--color-text-muted)",
};

interface Props {
	classType: string;
}

export function ClassBadge({ classType }: Props) {
	return (
		<span
			className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
			style={STYLES[classType] ?? FALLBACK_STYLE}
		>
			{classType} class
		</span>
	);
}
