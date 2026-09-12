import { useNavigate } from "react-router";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import type { LessonSummary } from "../../domain/script/services/ScriptLessonService";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { ForecastCell } from "../components/molecules/ForecastCell";
import { LearnableCallout } from "../components/molecules/LearnableCallout";
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

function newCountLabel(count: number, noun: string): string {
	return `${count} new ${noun}${count === 1 ? "" : "s"}`;
}

function pendingCatchUpItemCount(summary: LessonSummary): number {
	return (
		summary.consonants.length +
		summary.vowels.length +
		summary.toneMarks.length +
		summary.rareVowels.length +
		summary.numerals.length +
		summary.toneRules.length
	);
}

export function Dashboard() {
	const { state, lesson, review, dashboard, vocab } = useApp();
	const navigate = useNavigate();

	const nextLesson = lesson.getNextScript();
	const nextVocabLesson =
		lesson.getVocabUnlockedCount() > 0 ? vocab.getNextLesson() : null;
	const nextGrammarLesson = lesson.getNextGrammar();
	const nextSentenceLesson = lesson.getNextSentence();
	const pendingCatchUps = lesson.getPendingCatchUps();
	const scriptDueCount = review.getDueCount("script");
	const vocabDueCount = review.getDueCount("vocab");
	const grammarDueCount = review.getDueCount("grammar");
	const sentenceDueCount = review.getDueCount("sentence");
	const dueCount =
		scriptDueCount + vocabDueCount + grammarDueCount + sentenceDueCount;
	const timeUntilNextReview = review.getTimeUntilNextReview();
	const forecast = review.getForecast();
	const leechCount = dashboard.getLeechCount();
	const stages = dashboard.getStageCounts();
	const achievements = state.achievements ?? [];
	const reviewButtonCount = [
		scriptDueCount,
		vocabDueCount,
		grammarDueCount,
		sentenceDueCount,
	].filter((n) => n > 0).length;
	const reviewGridClass = `grid gap-3 ${reviewButtonCount === 2 ? "grid-cols-2" : "grid-cols-1"}`;

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
							{sentenceDueCount > 0 && (
								<Button
									type="button"
									onClick={() => navigate("/sentences")}
									className="py-4 rounded-xl text-base font-semibold transition-colors"
									style={{
										background: "var(--color-accent)",
										color: "var(--color-text)",
									}}
								>
									Sentences ({sentenceDueCount})
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

			{/* 2. Secondary Actions (2-col) — evergreen entry points, always in the
			    same two slots regardless of what else is unlocked. */}
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
				{/* Mobile-reachable entry point for the practice game — the
				    mobile tab row has no room for it. */}
				<QuickActionCard
					label="Game"
					value="Practice round"
					onClick={() => navigate("/game")}
				/>
			</div>

			{/* Ready to Learn — every pool with new content ready, regardless of
			    whether anything is due for review (due reviews are the primary
			    action card above; this is about content the learner hasn't seen
			    yet). Each entry mirrors StartLessonUseCase's own gating (rank
			    window, prerequisites, apprentice cap), so a callout here always
			    means starting that lesson will actually work. */}
			{(nextVocabLesson ||
				nextGrammarLesson ||
				nextSentenceLesson ||
				pendingCatchUps.length > 0) && (
				<div className="space-y-3">
					<SectionHeader className="mb-1">Ready to Learn</SectionHeader>
					{pendingCatchUps.map((p) => (
						<LearnableCallout
							key={p.lessonNumber}
							label={`Lesson ${p.lessonNumber} Update`}
							detail={newCountLabel(pendingCatchUpItemCount(p.summary), "item")}
							onClick={() => navigate(`/catch-up/${p.lessonNumber}`)}
							accentColor="var(--color-accent)"
						/>
					))}
					{nextVocabLesson && (
						<LearnableCallout
							label="Vocabulary"
							detail={newCountLabel(nextVocabLesson.words.length, "word")}
							onClick={() => navigate("/vocabulary")}
							accentColor="var(--color-enlightened)"
						/>
					)}
					{nextGrammarLesson && (
						<LearnableCallout
							label="Grammar"
							detail={newCountLabel(
								nextGrammarLesson.grammarPoints.length,
								"grammar point",
							)}
							onClick={() => navigate("/grammar")}
							accentColor="var(--color-guru)"
						/>
					)}
					{nextSentenceLesson && (
						<LearnableCallout
							label="Sentences"
							detail={newCountLabel(
								nextSentenceLesson.sentences.length,
								"sentence",
							)}
							onClick={() => navigate("/sentences")}
							accentColor="var(--color-master)"
						/>
					)}
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
								onClick={() => navigate(`/progress/${stage}`)}
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
