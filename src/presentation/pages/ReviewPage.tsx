import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Progress } from "@/presentation/components/ui/progress";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating, SessionSummary } from "../../domain/shared/types";
import { Accuracy } from "../../domain/srs/value-objects/Accuracy";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { Flashcard } from "../components/organisms/Flashcard";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
import type { Promotion } from "../components/organisms/StagePromotionPanel";
import { StagePromotionPanel } from "../components/organisms/StagePromotionPanel";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";

interface ReviewResult {
	cardId: string;
	rating: RecallRating;
	beforeStage: string;
	afterStage: string;
}

export function ReviewPage() {
	const { review, refresh, checkAchievements } = useApp();
	const navigate = useNavigate();
	const [done, setDone] = useState(false);
	const [sessionCorrect, setSessionCorrect] = useState(0);
	const [sessionTotal, setSessionTotal] = useState(0);
	const resultsRef = useRef<ReviewResult[]>([]);
	const startedRef = useRef(false);
	const achievementsRef = useRef<string[] | null>(null);
	const summaryRef = useRef<SessionSummary | null>(null);
	// Map cardId -> question captured from session cards before session ends
	const cardQuestionsRef = useRef<Map<string, string>>(new Map());

	const startSession = useCallback(
		(maxCards?: number) => review.startSession(undefined, maxCards),
		[review],
	);
	const recordReview = useCallback(
		(cardId: string, rating: RecallRating): string => {
			const newStage = review.recordReview(cardId, rating);
			refresh();
			return newStage;
		},
		[review, refresh],
	);
	const endSession = useCallback(
		(session: Parameters<typeof review.endSession>[0]) => {
			const summary = review.endSession(session);
			refresh();
			return summary;
		},
		[review, refresh],
	);

	const reviewSession = useReviewSession(
		startSession,
		recordReview,
		endSession,
	);

	// Capture card questions whenever the session is active so we can display them after completion
	useEffect(() => {
		if (reviewSession.session) {
			for (const quizCard of reviewSession.session.cards) {
				cardQuestionsRef.current.set(quizCard.card.id, quizCard.card.question);
			}
		}
	}, [reviewSession.session]);

	const handleAdvance = useCallback(
		(rating: RecallRating) => {
			setSessionTotal((t) => t + 1);
			if (rating >= 3) {
				setSessionCorrect((c) => c + 1);
			}
			const result = reviewSession.handleReviewAdvance(rating);
			if (result?.status === "complete") {
				resultsRef.current = result.results;
				summaryRef.current = result.summary ?? null;
				setDone(true);
			}
		},
		[reviewSession],
	);

	const handleMcAnswer = useCallback(
		(correct: boolean, responseTimeMs?: number) => {
			handleAdvance(ratingFromCorrectness(correct, responseTimeMs));
		},
		[handleAdvance],
	);

	// Auto-start on mount
	useEffect(() => {
		if (!startedRef.current) {
			startedRef.current = true;
			const s = reviewSession.startReview();
			if (s.cards.length === 0) {
				navigate("/");
			}
		}
	}, [reviewSession, navigate]);

	if (!reviewSession.session && !done) return null;

	if (done) {
		const results = resultsRef.current;
		const correctCount = results.filter((r) => r.rating >= 3).length;
		const accuracy = Accuracy.fromCounts(correctCount, results.length);

		if (achievementsRef.current === null && summaryRef.current) {
			achievementsRef.current = checkAchievements(summaryRef.current);
			refresh();
		}

		// Build stage promotions only for cards that actually changed stage
		const promotions: Promotion[] = results
			.filter((r) => r.afterStage !== r.beforeStage)
			.map((r) => ({
				cardQuestion: cardQuestionsRef.current.get(r.cardId) ?? r.cardId,
				newStage: r.afterStage,
			}));

		return (
			<div className="space-y-6 py-8">
				<div className="text-center">
					<div className="text-5xl mb-3">
						{accuracy.percentage >= 80 ? "✦" : "◈"}
					</div>
					<h1
						className="text-2xl font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						Review Complete
					</h1>
				</div>

				{/* Stats grid */}
				<SessionStatGrid
					totalLabel="Reviewed"
					total={results.length}
					correct={correctCount}
					accuracy={accuracy.percentage}
				/>

				{/* Stage promotions */}
				<StagePromotionPanel promotions={promotions} />

				{/* Newly unlocked achievements */}
				{(achievementsRef.current ?? []).length > 0 && (
					<Card className="p-4">
						<SectionHeader className="mb-3">
							Achievement Unlocked!
						</SectionHeader>
						<div className="flex gap-4 flex-wrap justify-center">
							{(achievementsRef.current ?? []).map((id) => (
								<AchievementBadge key={id} id={id} unlocked size="sm" />
							))}
						</div>
					</Card>
				)}

				{/* Actions */}
				<div className="space-y-3">
					{review.getDueCount() > 0 && (
						<Button
							className="w-full"
							onClick={() => {
								startedRef.current = false;
								achievementsRef.current = null;
								summaryRef.current = null;
								setDone(false);
							}}
						>
							Review More ({review.getDueCount()} due)
						</Button>
					)}
					<Button
						variant="outline"
						className="w-full"
						onClick={() => navigate("/")}
					>
						Go to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	if (!reviewSession.currentCard || !reviewSession.session) return null;

	const liveAccuracy =
		sessionTotal > 0
			? `${Math.round((sessionCorrect / sessionTotal) * 100)}%`
			: "—";

	return (
		<div>
			{/* Session header HUD */}
			<div className="mb-4">
				<div className="flex items-center justify-between mb-2">
					<span
						className="text-sm font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						Review Session
					</span>
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						{reviewSession.cardIdx + 1} / {reviewSession.session.cards.length}
					</span>
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						Acc: {liveAccuracy}
					</span>
					<button
						type="button"
						onClick={() => navigate("/")}
						className="text-lg leading-none"
						style={{ color: "var(--color-text-muted)" }}
						title="End session"
					>
						✕
					</button>
				</div>
				<Progress
					value={
						((reviewSession.cardIdx + 1) / reviewSession.session.cards.length) *
						100
					}
					className="h-1.5"
				/>
			</div>

			{reviewSession.currentCard.mode === "multipleChoice" ? (
				<MultipleChoice
					card={reviewSession.currentCard.card}
					onAnswer={handleMcAnswer}
				/>
			) : (
				<Flashcard
					card={reviewSession.currentCard.card}
					onRate={handleAdvance}
				/>
			)}
		</div>
	);
}
