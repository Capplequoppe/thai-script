import { Button } from "@/presentation/components/ui/button";

interface Props {
	label: string;
	detail: string;
	onClick: () => void;
	/** A `--color-*` CSS variable value, e.g. `"var(--color-guru)"`. */
	accentColor: string;
}

/** A "new content ready" callout — distinct from a due-review count. */
export function LearnableCallout({
	label,
	detail,
	onClick,
	accentColor,
}: Props) {
	return (
		<div
			className="rounded-xl p-4 flex items-center justify-between gap-3"
			style={{
				background: `color-mix(in srgb, ${accentColor} 10%, var(--color-surface))`,
				border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
			}}
		>
			<div>
				<div className="font-semibold text-sm">{label}</div>
				<div
					className="text-xs mt-0.5"
					style={{ color: "var(--color-text-muted)" }}
				>
					{detail}
				</div>
			</div>
			<Button
				type="button"
				onClick={onClick}
				style={{ background: accentColor, color: "#fff" }}
				className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
			>
				Learn
			</Button>
		</div>
	);
}
