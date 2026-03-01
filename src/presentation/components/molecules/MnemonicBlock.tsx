interface Props {
	text: string;
	label?: string;
}

export function MnemonicBlock({ text, label }: Props) {
	return (
		<div
			className="rounded-xl p-3"
			style={{
				background:
					"color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))",
			}}
		>
			{label && (
				<p
					className="text-xs font-semibold mb-1"
					style={{ color: "var(--color-accent)" }}
				>
					{label}
				</p>
			)}
			<p className="text-sm" style={{ color: "var(--color-accent)" }}>
				💡 {text}
			</p>
		</div>
	);
}
