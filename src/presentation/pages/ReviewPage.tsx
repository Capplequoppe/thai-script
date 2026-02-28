import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";
import { Accuracy } from "../../domain/srs/value-objects/Accuracy";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";

interface ReviewResult {
	cardId: string;
	rating: RecallRating;
}

export function ReviewPage() {
	const { review, refresh } = useApp();
	const navigate = useNavigate();
	const [done, setDone] = useState(false);
	const resultsRef = useRef<ReviewResult[]>([]);
	const startedRef = useRef(false);

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

	const handleAdvance = useCallback(
		(rating: RecallRating) => {
			const result = reviewSession.handleReviewAdvance(rating);
			if (result?.status === "complete") {
				resultsRef.current = result.results;
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

		return (
			<div className="text-center space-y-6 py-8">
				<div className="text-6xl">
					{accuracy.percentage >= 80 ? "\uD83C\uDF1F" : "\uD83D\uDCAA"}
				</div>
				<h1 className="text-2xl font-bold">Review Complete!</h1>
				<div className="grid grid-cols-3 gap-4">
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{results.length}</div>
						<div className="text-xs text-gray-500">Reviewed</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold text-green-600">
							{correctCount}
						</div>
						<div className="text-xs text-gray-500">Correct</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{accuracy.percentage}%</div>
						<div className="text-xs text-gray-500">Accuracy</div>
					</div>
				</div>
				<div className="space-y-3">
					{review.getDueCount() > 0 && (
						<button
							type="button"
							onClick={() => {
								startedRef.current = false;
								setDone(false);
							}}
							className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
						>
							Review More ({review.getDueCount()} due)
						</button>
					)}
					<button
						type="button"
						onClick={() => navigate("/")}
						className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
					>
						Back to Home
					</button>
				</div>
			</div>
		);
	}

	if (!reviewSession.currentCard || !reviewSession.session) return null;

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-lg font-bold">Review</h1>
				<span className="text-sm text-gray-500">
					{reviewSession.cardIdx + 1} / {reviewSession.session.cards.length}
				</span>
			</div>
			<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
				<div
					className="h-full bg-orange-500 rounded-full transition-all"
					style={{
						width: `${((reviewSession.cardIdx + 1) / reviewSession.session.cards.length) * 100}%`,
					}}
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
