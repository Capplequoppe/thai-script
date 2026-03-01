import { useNavigate } from "react-router";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { ForecastCell } from "../components/molecules/ForecastCell";
import { QuickActionCard } from "../components/molecules/QuickActionCard";
import { StagePill } from "../components/molecules/StagePill";
import {
	ACHIEVEMENT_DEFS,
	AchievementBadge,
} from "../components/organisms/AchievementBadge";
import { HeatmapWidget } from "../components/organisms/HeatmapWidget";
import { NotificationBanner } from "../components/organisms/NotificationBanner";
import { useApp } from "../hooks/useApp";

const STAGES = [
	"Apprentice",
	"Guru",
	"Master",
	"Enlightened",
	"Burned",
] as const;

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
					<QuickActionCard
						label="Next Lesson"
						value={`Lesson ${nextLesson}`}
						onClick={() => navigate(`/lesson/${nextLesson}`)}
					/>
				) : (
					<QuickActionCard label="Script" value="All done ✓" disabled />
				)}
				{lesson.getGrammarUnlockedCount() > 0 ? (
					<QuickActionCard
						label="Grammar"
						value={`${review.getDueCount("grammar")} due`}
						onClick={() => navigate("/grammar")}
					/>
				) : lesson.getVocabUnlockedCount() > 0 ? (
					<QuickActionCard
						label="Vocabulary"
						value={`${review.getDueCount("vocab")} due`}
						onClick={() => navigate("/vocabulary")}
					/>
				) : (
					<QuickActionCard label="Vocabulary" value="Locked" disabled />
				)}
			</div>

			{/* 3. Stage Progress Pills */}
			{Object.values(stages).some((v) => v > 0) && (
				<div>
					<SectionHeader className="mb-3">SRS Progress</SectionHeader>
					<div className="flex gap-2 overflow-x-auto pb-1">
						{STAGES.map((stage) => (
							<StagePill
								key={stage}
								stage={stage}
								count={stages[stage.toLowerCase() as keyof typeof stages]}
								onClick={() => navigate("/progress")}
							/>
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
					<SectionHeader className="mb-3">Achievements</SectionHeader>
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
					<SectionHeader className="mb-3">Upcoming Reviews</SectionHeader>
					<div className="grid grid-cols-5 gap-2 text-center">
						<ForecastCell label="Now" value={forecast.dueNow} />
						<ForecastCell label="1 hr" value={forecast.nextHour} />
						<ForecastCell label="24 hr" value={forecast.next24Hours} />
						<ForecastCell label="3 days" value={forecast.next3Days} />
						<ForecastCell label="7 days" value={forecast.next7Days} />
					</div>
				</div>
			)}

			{/* 7. Leech Warning */}
			{leechCount > 0 && (
				<div
					className="rounded-xl p-4 flex justify-between items-center"
					style={{
						background:
							"color-mix(in srgb, var(--color-danger) 8%, transparent)",
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
