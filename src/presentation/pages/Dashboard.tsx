import { useNavigate } from "react-router";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import {
	ACHIEVEMENT_DEFS,
	AchievementBadge,
} from "../components/organisms/AchievementBadge";
import { HeatmapWidget } from "../components/organisms/HeatmapWidget";
import { NotificationBanner } from "../components/organisms/NotificationBanner";
import { useApp } from "../hooks/useApp";

const STAGE_PILL_CONFIG = [
	{
		key: "apprentice" as const,
		label: "Apprentice",
		color: "var(--color-apprentice)",
	},
	{ key: "guru" as const, label: "Guru", color: "var(--color-guru)" },
	{ key: "master" as const, label: "Master", color: "var(--color-master)" },
	{
		key: "enlightened" as const,
		label: "Enlightened",
		color: "var(--color-enlightened)",
	},
	{ key: "burned" as const, label: "Burned", color: "var(--color-burned)" },
];

export function Dashboard() {
	const { state, lesson, review, dashboard } = useApp();
	const navigate = useNavigate();

	const nextLesson = lesson.getNextScript();
	const dueCount = review.getDueCount();
	const nextReview = review.getNextReviewDate();
	const forecast = review.getForecast();
	const leechCount = dashboard.getLeechCount();
	const stages = dashboard.getStageCounts("script");
	const achievements = state.achievements ?? [];

	return (
		<div className="space-y-6 py-4">
			<NotificationBanner />

			{/* 1. Primary Action Card */}
			<div
				className="rounded-2xl p-6"
				style={{
					background:
						dueCount > 0 ? "var(--color-primary)" : "var(--color-surface-2)",
				}}
			>
				{dueCount > 0 ? (
					<>
						<div className="flex items-center gap-3 mb-4">
							<Badge variant="outline">{dueCount} due</Badge>
							<span
								className="text-sm"
								style={{ color: "rgba(255,255,255,0.7)" }}
							>
								Cards ready for review
							</span>
						</div>
						<Button
							type="button"
							onClick={() => navigate("/review")}
							className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
							style={{
								background: "var(--color-accent)",
								color: "var(--color-text)",
							}}
						>
							Start Review
						</Button>
					</>
				) : (
					<>
						<p
							className="text-sm font-semibold mb-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							All reviews complete
						</p>
						{nextReview && (
							<p
								className="text-lg font-semibold"
								style={{ color: "var(--color-text)" }}
							>
								Next review{" "}
								{nextReview.toLocaleDateString([], { weekday: "short" })} at{" "}
								{nextReview.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						)}
					</>
				)}
			</div>

			{/* 2. Secondary Actions (2-col) */}
			<div className="grid grid-cols-2 gap-3">
				{nextLesson ? (
					<Card
						className="p-4 text-left cursor-pointer"
						onClick={() => navigate(`/lesson/${nextLesson}`)}
					>
						<div className="text-xs section-header mb-1">Next Lesson</div>
						<div
							className="font-semibold mt-2"
							style={{ color: "var(--color-primary)" }}
						>
							Lesson {nextLesson}
						</div>
					</Card>
				) : (
					<Card className="p-4 opacity-50">
						<div className="text-xs section-header mb-1">Script</div>
						<div
							className="text-sm mt-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							All done ✓
						</div>
					</Card>
				)}
				{lesson.getGrammarUnlockedCount() > 0 ? (
					<Card
						className="p-4 text-left cursor-pointer"
						onClick={() => navigate("/grammar")}
					>
						<div className="text-xs section-header mb-1">Grammar</div>
						<div
							className="font-semibold mt-2"
							style={{ color: "var(--color-primary)" }}
						>
							{review.getDueCount("grammar")} due
						</div>
					</Card>
				) : lesson.getVocabUnlockedCount() > 0 ? (
					<Card
						className="p-4 text-left cursor-pointer"
						onClick={() => navigate("/vocabulary")}
					>
						<div className="text-xs section-header mb-1">Vocabulary</div>
						<div
							className="font-semibold mt-2"
							style={{ color: "var(--color-primary)" }}
						>
							{review.getDueCount("vocab")} due
						</div>
					</Card>
				) : (
					<Card className="p-4 opacity-50">
						<div className="text-xs section-header mb-1">Vocabulary</div>
						<div
							className="text-sm mt-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							Locked
						</div>
					</Card>
				)}
			</div>

			{/* 3. Stage Progress Pills */}
			{Object.values(stages).some((v) => v > 0) && (
				<div>
					<div className="section-header mb-3">SRS Progress</div>
					<div className="flex gap-2 overflow-x-auto pb-1">
						{STAGE_PILL_CONFIG.map(({ key, label, color }) => (
							<button
								key={key}
								type="button"
								onClick={() => navigate("/progress")}
								className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium cursor-pointer"
								style={{ borderColor: color, color }}
							>
								<span
									className="w-2 h-2 rounded-full"
									style={{ background: color }}
								/>
								{label}
								<span className="font-bold">{stages[key]}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* 4. Study Heatmap */}
			{state.sessionHistory.length > 0 && (
				<Card className="p-4">
					<HeatmapWidget sessions={state.sessionHistory} />
				</Card>
			)}

			{/* 5. Achievement Shelf */}
			{achievements.length > 0 && (
				<div>
					<div className="section-header mb-3">Achievements</div>
					<div className="flex gap-4 overflow-x-auto pb-1">
						{achievements.slice(-4).map((id) => (
							<AchievementBadge key={id} id={id} unlocked size="sm" />
						))}
						{ACHIEVEMENT_DEFS.filter((d) => !achievements.includes(d.id))
							.slice(0, 2)
							.map((d) => (
								<AchievementBadge
									key={d.id}
									id={d.id}
									unlocked={false}
									size="sm"
								/>
							))}
					</div>
					<div className="flex justify-end mt-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => navigate("/progress")}
							className="text-xs h-auto p-0"
							style={{ color: "var(--color-text-muted)" }}
						>
							See all →
						</Button>
					</div>
				</div>
			)}

			{/* 6. Upcoming Reviews Forecast */}
			{Object.keys(state.cards).length > 0 && (
				<div>
					<div className="section-header mb-3">Upcoming Reviews</div>
					<div className="grid grid-cols-5 gap-2 text-center">
						{[
							{ label: "Now", value: forecast.dueNow },
							{ label: "1 hr", value: forecast.nextHour },
							{ label: "24 hr", value: forecast.next24Hours },
							{ label: "3 days", value: forecast.next3Days },
							{ label: "7 days", value: forecast.next7Days },
						].map(({ label, value }) => (
							<Card key={label} className="p-2">
								<div
									className="text-lg font-bold"
									style={{
										color:
											value > 0
												? "var(--color-accent)"
												: "var(--color-text-muted)",
									}}
								>
									{value}
								</div>
								<div
									className="text-[10px]"
									style={{ color: "var(--color-text-muted)" }}
								>
									{label}
								</div>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* 7. Leech Warning */}
			{leechCount > 0 && (
				<div
					className="rounded-xl p-4 flex justify-between items-center"
					style={{
						background: "rgba(192,57,43,0.08)",
						borderLeft: "3px solid var(--color-danger)",
					}}
				>
					<div>
						<div
							className="text-sm font-semibold"
							style={{ color: "var(--color-danger)" }}
						>
							Leeches Detected
						</div>
						<div
							className="text-xs mt-0.5"
							style={{ color: "var(--color-text-muted)" }}
						>
							Cards that keep failing — consider extra study
						</div>
					</div>
					<div
						className="text-2xl font-bold"
						style={{ color: "var(--color-danger)" }}
					>
						{leechCount}
					</div>
				</div>
			)}
		</div>
	);
}
