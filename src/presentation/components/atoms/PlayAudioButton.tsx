interface Props {
	audioUrl: string;
	className?: string;
}

export function PlayAudioButton({ audioUrl, className }: Props) {
	return (
		<button
			type="button"
			onClick={() => {
				new Audio(audioUrl).play().catch(() => {});
			}}
			className={`inline-flex items-center justify-center rounded-full transition-colors ${className ?? "w-10 h-10"}`}
			style={{
				background: "var(--color-surface-2)",
				color: "var(--color-text-muted)",
			}}
			aria-label="Play pronunciation"
		>
			🔊
		</button>
	);
}
