import type { GameRoundSummary as GameRoundSummaryData } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";

interface Props {
	summary: GameRoundSummaryData;
	itemCount: number;
}

const RATING_LABELS: readonly { value: RecallRating; label: string }[] = [
	{ value: 1, label: "Again" },
	{ value: 2, label: "Wrong" },
	{ value: 3, label: "Hard" },
	{ value: 4, label: "Good" },
	{ value: 5, label: "Easy" },
];

/** Pure display of a finished round — actions live on the page. */
export function GameRoundSummary({ summary, itemCount }: Props) {
	return (
		<div className="space-y-6">
			<div className="text-center">
				<div className="text-5xl mb-3">
					{(summary.accuracy ?? 0) >= 80 ? "✦" : "◈"}
				</div>
				<h1
					className="text-2xl font-semibold"
					style={{ color: "var(--color-text)" }}
				>
					Round Complete
				</h1>
			</div>

			<div
				className="rounded-xl p-6 text-center"
				style={{ background: "var(--color-surface-2)" }}
			>
				<p
					className="text-sm font-semibold mb-1"
					style={{ color: "var(--color-text-muted)" }}
				>
					Self-rated score
				</p>
				<p
					className="text-4xl font-bold"
					style={{ color: "var(--color-primary)" }}
				>
					{summary.accuracy === null ? "—" : `${summary.accuracy}%`}
				</p>
				<p
					className="text-sm mt-2"
					style={{ color: "var(--color-text-muted)" }}
				>
					{summary.ratedCount} of {itemCount} items rated
				</p>
			</div>

			<div className="grid grid-cols-5 gap-2 text-center">
				{RATING_LABELS.map(({ value, label }) => (
					<div
						key={value}
						className="rounded-xl py-3"
						style={{ background: "var(--color-surface)" }}
					>
						<div
							className="text-lg font-bold"
							style={{ color: "var(--color-text)" }}
						>
							{summary.ratingCounts[value]}
						</div>
						<div
							className="text-xs"
							style={{ color: "var(--color-text-muted)" }}
						>
							{label}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
