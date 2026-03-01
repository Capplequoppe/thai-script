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
	const { state, lesson, review, dashboard, vocab } = useApp();
	const navigate = useNavigate();

	const nextLesson = lesson.getNextScript();
	const nextVocabLesson =
		lesson.getVocabUnlockedCount() > 0 ? vocab.getNextLesson() : null;
	const scriptDueCount = review.getDueCount("script");
	const vocabDueCount = review.getDueCount("vocab");
	const grammarDueCount = review.getDueCount("grammar");
	const dueCount = scriptDueCount + vocabDueCount + grammarDueCount;
	const timeUntilNextReview = review.getTimeUntilNextReview();
	const forecast = review.getForecast();
	const leechCount = dashboard.getLeechCount();
	const stages = dashboard.getStageCounts();
	const achievements = state.achievements ?? [];
	const reviewButtonCount = [
		scriptDueCount,
		vocabDueCount,
		grammarDueCount,
	].filter((n) => n > 0).length;
	const reviewGridClass = `grid gap-3 ${reviewButtonCount > 1 ? `grid-cols-${reviewButtonCount}` : "grid-cols-1"}`;

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
							<Badge variant="secondary">{dueCount} due</Badge>
							<span
								className="text-sm"
								style={{ color: "rgba(255,255,255,0.7)" }}
							>
								Cards ready for review
							</span>
						</div>
						<div className={reviewGridClass}>
							{scriptDueCount > 0 && (
								<Button
									type="button"
									onClick={() => navigate("/review")}
									className="py-4 rounded-xl text-base font-semibold transition-colors"
									style={{
										background: "var(--color-accent)",
										color: "var(--color-text)",
									}}
								>
									Script ({scriptDueCount})
								</Button>
							)}
							{vocabDueCount > 0 && (
								<Button
									type="button"
									onClick={() => navigate("/vocabulary")}
									className="py-4 rounded-xl text-base font-semibold transition-colors"
									style={{
										background: "var(--color-accent)",
										color: "var(--color-text)",
									}}
								>
									Vocab ({vocabDueCount})
								</Button>
							)}
							{grammarDueCount > 0 && (
								<Button
									type="button"
									onClick={() => navigate("/grammar")}
									className="py-4 rounded-xl text-base font-semibold transition-colors"
									style={{
										background: "var(--color-accent)",
										color: "var(--color-text)",
									}}
								>
									Grammar ({grammarDueCount})
								</Button>
							)}
						</div>
					</>
				) : (
					<>
						<p
							className="text-sm font-semibold mb-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							All reviews complete
						</p>
						{timeUntilNextReview && (
							<p
								className="text-lg font-semibold"
								style={{ color: "var(--color-text)" }}
							>
								Next review in {timeUntilNextReview}
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
						value={
							nextVocabLesson && vocabDueCount > 0
								? `${nextVocabLesson.words.length} new · ${vocabDueCount} due`
								: nextVocabLesson
									? `${nextVocabLesson.words.length} new words`
									: vocabDueCount > 0
										? `${vocabDueCount} due`
										: "Up to date"
						}
						onClick={() => navigate("/vocabulary")}
					/>
				) : (
					<QuickActionCard label="Vocabulary" value="Locked" disabled />
				)}
			</div>

			{/* Vocab lesson callout — shown when grammar is also taking the right slot */}
			{lesson.getGrammarUnlockedCount() > 0 && nextVocabLesson && (
				<div
					className="rounded-xl p-4 flex items-center justify-between gap-3"
					style={{
						background:
							"color-mix(in srgb, var(--color-enlightened) 10%, var(--color-surface))",
						border:
							"1px solid color-mix(in srgb, var(--color-enlightened) 25%, transparent)",
					}}
				>
					<div>
						<div className="font-semibold text-sm">Vocab Lesson Ready</div>
						<div
							className="text-xs mt-0.5"
							style={{ color: "var(--color-text-muted)" }}
						>
							{nextVocabLesson.words.length} new words unlocked
						</div>
					</div>
					<Button
						type="button"
						onClick={() => navigate("/vocabulary")}
						style={{ background: "var(--color-enlightened)", color: "#fff" }}
						className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
					>
						Learn
					</Button>
				</div>
			)}

			{/* 3. Stage Progress Pills */}
			{Object.values(stages).some((v) => v > 0) && (
				<div>
					<SectionHeader className="mb-3">Progress</SectionHeader>
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
