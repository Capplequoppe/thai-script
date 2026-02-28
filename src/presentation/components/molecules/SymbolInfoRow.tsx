import type { CSSProperties, ReactNode } from "react";

interface Props {
	label: string;
	value: ReactNode;
	valueStyle?: CSSProperties;
}

export function SymbolInfoRow({ label, value, valueStyle }: Props) {
	return (
		<div
			className="flex justify-between items-center py-1.5 border-b last:border-0"
			style={{ borderColor: "var(--color-border)" }}
		>
			<span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
				{label}
			</span>
			<span className="text-sm font-medium" style={valueStyle}>
				{value}
			</span>
		</div>
	);
}
