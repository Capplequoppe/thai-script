interface Props {
	text: string;
}

export function MnemonicBlock({ text }: Props) {
	return (
		<div
			className="rounded-xl p-3"
			style={{
				background:
					"color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))",
			}}
		>
			<p className="text-sm" style={{ color: "var(--color-text)" }}>
				💡 {text}
			</p>
		</div>
	);
}
