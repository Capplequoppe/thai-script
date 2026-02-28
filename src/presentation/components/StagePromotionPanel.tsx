import { SectionHeader } from "./atoms/SectionHeader";
import { StageBadge } from "./molecules/StageBadge";

export interface Promotion {
	cardQuestion: string;
	newStage: string;
}

interface Props {
	promotions: Promotion[];
}

export function StagePromotionPanel({ promotions }: Props) {
	if (promotions.length === 0) return null;

	return (
		<div
			className="rounded-2xl p-4"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-accent)",
			}}
		>
			<SectionHeader className="mb-3">Stage Promotions</SectionHeader>
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
						<StageBadge stage={p.newStage} className="flex-shrink-0" />
					</div>
				))}
			</div>
		</div>
	);
}
