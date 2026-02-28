export interface Promotion {
	cardQuestion: string;
	newStage: string;
}

interface StagePromotionPanelProps {
	promotions: Promotion[];
}

const STAGE_COLORS: Record<string, string> = {
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

const STAGE_LABELS: Record<string, string> = {
	Guru: "Guru",
	Master: "Master",
	Enlightened: "Enlightened",
	Burned: "Burned ✸",
};

export function StagePromotionPanel({ promotions }: StagePromotionPanelProps) {
	if (promotions.length === 0) return null;

	return (
		<div
			className="rounded-2xl p-4"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-accent)",
			}}
		>
			<div className="section-header mb-3">Stage Promotions</div>
			<div className="space-y-2">
				{promotions.map((p) => (
					<div
						key={p.cardQuestion}
						className="flex items-center justify-between gap-4"
					>
						<span
							className="thai text-xl font-semibold truncate"
							style={{ color: "var(--color-text)" }}
						>
							{p.cardQuestion}
						</span>
						<span
							className="text-sm font-semibold px-3 py-1 rounded-full text-white flex-shrink-0"
							style={{
								background: STAGE_COLORS[p.newStage] ?? "var(--color-primary)",
							}}
						>
							{STAGE_LABELS[p.newStage] ?? p.newStage}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
