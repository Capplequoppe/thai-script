import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating, SessionSummary } from "../../domain/shared/types";
import { Accuracy } from "../../domain/srs/value-objects/Accuracy";
import { AchievementBadge } from "../components/AchievementBadge";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { StagePromotionPanel } from "../components/StagePromotionPanel";
import type { Promotion } from "../components/StagePromotionPanel";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";

interface ReviewResult {
	cardId: string;
	rating: RecallRating;
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
		(cardId: string, rating: RecallRating) => {
			review.recordReview(cardId, rating);
			refresh();
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
		(correct: boolean) => {
			handleAdvance(ratingFromCorrectness(correct));
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

		// Build stage promotions for cards rated 4+ (high-quality recall → stage advance)
		const promotions: Promotion[] = results
			.filter((r) => r.rating >= 4)
			.map((r) => ({
				cardQuestion: cardQuestionsRef.current.get(r.cardId) ?? r.cardId,
				newStage: "Guru",
			}));

		return (
			<div className="space-y-6 py-8">
				<div className="text-center">
					<div className="text-5xl mb-3">{accuracy.percentage >= 80 ? "✦" : "◈"}</div>
					<h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
						Review Complete
					</h1>
				</div>

				{/* Stats grid */}
				<div className="grid grid-cols-3 gap-3">
					{[
						{ label: "Reviewed", value: results.length, color: "var(--color-text)" },
						{ label: "Correct", value: correctCount, color: "var(--color-master)" },
						{
							label: "Accuracy",
							value: `${accuracy.percentage}%`,
							color: accuracy.percentage >= 80 ? "var(--color-accent)" : "var(--color-danger)",
						},
					].map(({ label, value, color }) => (
						<div key={label} className="card-royal p-4 text-center">
							<div className="text-2xl font-bold" style={{ color }}>
								{value}
							</div>
							<div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
								{label}
							</div>
						</div>
					))}
				</div>

				{/* Stage promotions */}
				<StagePromotionPanel promotions={promotions} />

				{/* Newly unlocked achievements */}
				{(achievementsRef.current ?? []).length > 0 && (
					<div className="card-royal p-4">
						<div className="section-header mb-3">Achievement Unlocked!</div>
						<div className="flex gap-4 flex-wrap justify-center">
							{(achievementsRef.current ?? []).map((id) => (
								<AchievementBadge key={id} id={id} unlocked size="sm" />
							))}
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="space-y-3">
					{review.getDueCount() > 0 && (
						<button
							type="button"
							onClick={() => {
								startedRef.current = false;
								achievementsRef.current = null;
								summaryRef.current = null;
								setDone(false);
							}}
							className="btn-primary w-full"
						>
							Review More ({review.getDueCount()} due)
						</button>
					)}
					<button
						type="button"
						onClick={() => navigate("/")}
						className="w-full py-3 rounded-xl font-semibold border"
						style={{
							background: "var(--color-surface)",
							color: "var(--color-text)",
							borderColor: "var(--color-border)",
						}}
					>
						Go to Dashboard
					</button>
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
					<span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
						Review Session
					</span>
					<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
						{reviewSession.cardIdx + 1} / {reviewSession.session.cards.length}
					</span>
					<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
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
				{/* Gold progress bar */}
				<div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
					<div
						className="h-full rounded-full transition-all"
						style={{
							background: "var(--color-accent)",
							width: `${((reviewSession.cardIdx + 1) / reviewSession.session.cards.length) * 100}%`,
						}}
					/>
				</div>
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
