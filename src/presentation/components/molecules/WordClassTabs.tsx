import type { WordClassTab } from "../../utils/wordClass";

interface Props {
	tabs: readonly WordClassTab[];
	activeKey: string;
	onSelect: (key: string) => void;
}

export function WordClassTabs({ tabs, activeKey, onSelect }: Props) {
	return (
		<div
			className="flex gap-1 rounded-xl p-1 overflow-x-auto"
			style={{ background: "var(--color-surface-2)" }}
		>
			{tabs.map(({ key, label, count }) => (
				<button
					type="button"
					key={key}
					onClick={() => onSelect(key)}
					className="flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
					style={
						activeKey === key
							? {
									background: "var(--color-surface)",
									color: "var(--color-text)",
									boxShadow:
										"0 1px 3px color-mix(in srgb, var(--color-text) 10%, transparent)",
								}
							: { color: "var(--color-text-muted)" }
					}
				>
					{label}{" "}
					<span
						className="text-xs"
						style={{ color: "var(--color-text-muted)" }}
					>
						({count})
					</span>
				</button>
			))}
		</div>
	);
}
