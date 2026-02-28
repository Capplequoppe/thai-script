import type { SessionSummary } from "../../domain/shared/types";

export interface HeatmapCell {
	date: Date;
	count: number;
	intensity: 0 | 1 | 2 | 3;
	isToday: boolean;
}

export function buildHeatmapGrid(
	sessions: Pick<SessionSummary, "completedAt" | "totalCards">[],
): HeatmapCell[][] {
	// Build count-by-day map
	const countByDay = new Map<string, number>();
	for (const s of sessions) {
		if (!s.completedAt) continue;
		const key = new Date(s.completedAt).toDateString();
		countByDay.set(key, (countByDay.get(key) ?? 0) + s.totalCards);
	}

	// 12 weeks × 7 days; last cell = today, first cell = 83 days ago
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayStr = today.toDateString();

	const rows: HeatmapCell[][] = [];
	for (let week = 0; week < 12; week++) {
		const row: HeatmapCell[] = [];
		for (let day = 0; day < 7; day++) {
			const d = new Date(today);
			d.setDate(today.getDate() - (11 - week) * 7 - (6 - day));
			const count = countByDay.get(d.toDateString()) ?? 0;
			const intensity: 0 | 1 | 2 | 3 =
				count === 0 ? 0 : count < 5 ? 1 : count < 20 ? 2 : 3;
			row.push({
				date: d,
				count,
				intensity,
				isToday: d.toDateString() === todayStr,
			});
		}
		rows.push(row);
	}
	return rows;
}

const INTENSITY_COLORS: Record<number, string> = {
	0: "#E8E0D0",
	1: "#E8B887",
	2: "#C9A227",
	3: "#8B6914",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface HeatmapWidgetProps {
	sessions: Pick<SessionSummary, "completedAt" | "totalCards">[];
}

export function HeatmapWidget({ sessions }: HeatmapWidgetProps) {
	const grid = buildHeatmapGrid(sessions);

	return (
		<div>
			<div className="section-header mb-3">Study History</div>
			<div className="flex gap-px overflow-x-auto">
				{/* Day labels column */}
				<div className="flex flex-col gap-px mr-1 flex-shrink-0">
					{DAY_LABELS.map((label, i) => (
						<div
							key={i}
							className="w-3 h-3 flex items-center justify-center"
							style={{ fontSize: "7px", color: "var(--color-text-muted)" }}
						>
							{i % 2 === 0 ? label : ""}
						</div>
					))}
				</div>
				{/* Grid columns = weeks */}
				{grid.map((row, weekIdx) => (
					<div key={weekIdx} className="flex flex-col gap-px flex-shrink-0">
						{row.map((cell, dayIdx) => (
							<div
								key={dayIdx}
								title={`${cell.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}: ${cell.count} cards`}
								className="w-3 h-3 rounded-sm"
								style={{
									background: INTENSITY_COLORS[cell.intensity],
									boxShadow: cell.isToday
										? `0 0 0 1.5px var(--color-accent)`
										: undefined,
								}}
							/>
						))}
					</div>
				))}
			</div>
			{/* Legend */}
			<div className="flex items-center gap-1 mt-2 justify-end">
				<span
					className="text-[10px]"
					style={{ color: "var(--color-text-muted)" }}
				>
					Less
				</span>
				{[0, 1, 2, 3].map((i) => (
					<div
						key={i}
						className="w-3 h-3 rounded-sm"
						style={{ background: INTENSITY_COLORS[i] }}
					/>
				))}
				<span
					className="text-[10px]"
					style={{ color: "var(--color-text-muted)" }}
				>
					More
				</span>
			</div>
		</div>
	);
}
