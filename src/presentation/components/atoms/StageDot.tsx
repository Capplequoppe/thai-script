const COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

interface Props {
	stageName: string;
}

export function StageDot({ stageName }: Props) {
	return (
		<div
			className="w-3 h-3 rounded-full"
			style={{ background: COLORS[stageName] ?? "var(--color-border)" }}
			title={stageName}
		/>
	);
}
