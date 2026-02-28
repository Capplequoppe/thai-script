import type { SessionSummary } from "../../domain/shared/types";

interface HudStripProps {
	dueCount: number;
	sessionHistory: Pick<SessionSummary, "completedAt">[];
}

export function HudStrip({ dueCount, sessionHistory }: HudStripProps) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayStr = today.toDateString();

	// Build 7-day dots: index 0 = 6 days ago, index 6 = today
	const dots = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(today);
		d.setDate(today.getDate() - (6 - i));
		const dayStr = d.toDateString();
		const reviewed = sessionHistory.some((s) => {
			if (!s.completedAt) return false;
			return new Date(s.completedAt).toDateString() === dayStr;
		});
		return { reviewed, isToday: dayStr === todayStr };
	});

	return (
		<div
			className="flex items-center justify-between px-4"
			style={{
				height: "40px",
				background: "var(--color-surface)",
				borderBottom: "1px solid var(--color-border)",
				flexShrink: 0,
			}}
		>
			{/* Left: due count */}
			<div className="min-w-[60px]">
				{dueCount > 0 ? (
					<span
						className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
						style={{ background: "var(--color-apprentice)" }}
					>
						{dueCount} due
					</span>
				) : (
					<span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
						All clear
					</span>
				)}
			</div>

			{/* Center: app name */}
			<div
				className="text-sm font-semibold tracking-tight"
				style={{ color: "var(--color-text)" }}
			>
				<span className="thai mr-1">ไทย</span>Script
			</div>

			{/* Right: 7-day review dots */}
			<div className="flex gap-1 items-center min-w-[60px] justify-end">
				{dots.map(({ reviewed, isToday }, i) => {
					let bgColor = "var(--color-border)";
					let ring = false;
					let ringColor = "var(--color-border)";

					if (reviewed) {
						bgColor = "var(--color-accent)";
					}
					if (isToday) {
						ring = true;
						ringColor = reviewed ? "var(--color-accent)" : "var(--color-border)";
					}

					return (
						<div
							key={i}
							className="w-2.5 h-2.5 rounded-full transition-all"
							style={{
								background: bgColor,
								boxShadow: ring
									? `0 0 0 2px var(--color-surface), 0 0 0 3.5px ${ringColor}`
									: undefined,
								opacity: reviewed || isToday ? 1 : 0.5,
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
