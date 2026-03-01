const STAGE_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

interface Props {
	stage: string;
	count: number;
	onClick: () => void;
}

export function StagePill({ stage, count, onClick }: Props) {
	const color = STAGE_COLORS[stage] ?? "var(--color-text-muted)";
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium cursor-pointer"
			style={{ borderColor: color, color }}
		>
			<span className="w-2 h-2 rounded-full" style={{ background: color }} />
			{stage}
			<span className="font-bold">{count}</span>
		</button>
	);
}
