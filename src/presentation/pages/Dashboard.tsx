import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import {
	checkConversationUnlock,
	MIN_GRAMMAR_POINTS,
	MIN_VOCAB_COUNT,
} from "../../domain/conversation/services/ConversationUnlockService";
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

/**
 * Names the specific gap still blocking conversation practice — the vocab
 * gap if any remains, otherwise the grammar gap. Never a bare "locked"
 * label: every other locked/unlocked surface in this app names a number.
 */
function conversationGapMessage(
	learnedVocabCount: number,
	learnedGrammarCount: number,
): string {
	if (learnedVocabCount < MIN_VOCAB_COUNT) {
		return `${learnedVocabCount}/${MIN_VOCAB_COUNT} words learned`;
	}
	return `${learnedGrammarCount}/${MIN_GRAMMAR_POINTS} grammar points learned`;
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

	const conversationUnlock = checkConversationUnlock(
		vocab.getLearnedCount(),
		lesson.getGrammarLearnedCount(),
	);

	// Every one of these reads the learner state back out of storage and
	// rebuilds card entities — `getStageCounts` and `getForecast` do it once
	// per card pool. Called straight from the render body they re-ran on
	// every render of the page; they depend only on the learner state, so
	// they are computed once per state instead.
	// `state` is deliberately the cache key: it is the identity that changes
	// when the stored learner state changes, which is what these repository
	// reads actually depend on.
	// biome-ignore lint/correctness/useExhaustiveDependencies: explained above
	const d = useMemo(() => {
		const scriptDueCount = review.getDueCount("script");
		const vocabDueCount = review.getDueCount("vocab");
		const grammarDueCount = review.getDueCount("grammar");
		const sentenceDueCount = review.getDueCount("sentence");
		return {
			nextLesson: lesson.getNextScript(),
			nextVocabLesson:
				lesson.getVocabUnlockedCount() > 0 ? vocab.getNextLesson() : null,
			nextGrammarLesson: lesson.getNextGrammar(),
			nextSentenceLesson: lesson.getNextSentence(),
			pendingCatchUps: lesson.getPendingCatchUps(),
			scriptDueCount,
			vocabDueCount,
			grammarDueCount,
			sentenceDueCount,
			dueCount:
				scriptDueCount + vocabDueCount + grammarDueCount + sentenceDueCount,
			timeUntilNextReview: review.getTimeUntilNextReview(),
			forecast: review.getForecast(),
			leechCount: dashboard.getLeechCount(),
			stages: dashboard.getStageCounts(),
		};
	}, [state, lesson, review, dashboard, vocab]);

	const {
		nextLesson,
		nextVocabLesson,
		nextGrammarLesson,
		nextSentenceLesson,
		pendingCatchUps,
		scriptDueCount,
		vocabDueCount,
		grammarDueCount,
		sentenceDueCount,
		dueCount,
		timeUntilNextReview,
		forecast,
		leechCount,
		stages,
	} = d;
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

			{/* 2. Secondary Actions — evergreen entry points. The script tile
			    drops out entirely once the last lesson is done rather than
			    sitting there greyed out: unlike the conversation lock below,
			    that state never reverses, so a permanent dead tile is just
			    clutter on the learner's most-visited screen. The game then
			    takes the full width instead of leaving a hole beside it. */}
			<div
				className={`grid gap-3 ${nextLesson ? "grid-cols-2" : "grid-cols-1"}`}
			>
				{nextLesson && (
					<QuickActionCard
						label="Next Lesson"
						value={`Lesson ${nextLesson}`}
						onClick={() => navigate(`/lesson/${nextLesson}`)}
					/>
				)}
				{/* Mobile-reachable entry point for the practice game — the
				    mobile tab row has no room for it. */}
				<QuickActionCard
					label="Game"
					value="Practice round"
					onClick={() => navigate("/game")}
				/>
			</div>

			{/* Conversation practice — reuses QuickActionCard in both states
			    (see task 3.2's Architectural Decision) rather than a second
			    visual treatment. The lock is enforced again at the page itself
			    (ConversationPracticePage), so this tile is a discoverability
			    affordance only, never the actual boundary. */}
			<div className="grid grid-cols-1 gap-3">
				{conversationUnlock.unlocked ? (
					<QuickActionCard
						label="Conversation Practice"
						value="Start a session"
						onClick={() => navigate("/conversation")}
					/>
				) : (
					<QuickActionCard
						label="Conversation Practice"
						value={conversationGapMessage(
							vocab.getLearnedCount(),
							lesson.getGrammarLearnedCount(),
						)}
						disabled
					/>
				)}
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
