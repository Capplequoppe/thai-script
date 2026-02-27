import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { useApp } from "../hooks/useApp";
import type { ActiveReviewSession } from "../review-service";
import type { RecallRating } from "../types";

export function ReviewPage() {
	const app = useApp();
	const navigate = useNavigate();
	const [session, setSession] = useState<ActiveReviewSession | null>(null);
	const [cardIdx, setCardIdx] = useState(0);
	const [done, setDone] = useState(false);
	const sessionRef = useRef<ActiveReviewSession | null>(null);
	const startedRef = useRef(false);

	const startSession = useCallback(() => {
		const s = app.startReviewSession();
		if (s.cards.length === 0) {
			navigate("/");
			return;
		}
		sessionRef.current = s;
		setSession(s);
		setCardIdx(0);
		setDone(false);
	}, [app, navigate]);

	// Auto-start on mount
	useEffect(() => {
		if (!startedRef.current) {
			startedRef.current = true;
			startSession();
		}
	}, [startSession]);

	const current = session?.cards[cardIdx] ?? null;

	const advance = useCallback(
		(rating: RecallRating, _responseTimeMs?: number) => {
			if (!current || !sessionRef.current || !session) return;

			app.recordReview(current.card.id, rating);
			sessionRef.current.results.push({ cardId: current.card.id, rating });

			if (cardIdx + 1 < session.cards.length) {
				setCardIdx((i) => i + 1);
			} else {
				app.endReviewSession(sessionRef.current);
				setDone(true);
			}
		},
		[app, current, cardIdx, session],
	);

	const handleMultipleChoiceAnswer = useCallback(
		(correct: boolean, _responseTimeMs: number) => {
			advance(correct ? 4 : 2);
		},
		[advance],
	);

	if (!session) return null;

	if (done) {
		const results = sessionRef.current?.results ?? [];
		const correctCount = results.filter((r) => r.rating >= 3).length;
		const accuracy =
			results.length > 0
				? Math.round((correctCount / results.length) * 100)
				: 0;

		return (
			<div className="text-center space-y-6 py-8">
				<div className="text-6xl">
					{accuracy >= 80 ? "\uD83C\uDF1F" : "\uD83D\uDCAA"}
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
						<div className="text-2xl font-bold">{accuracy}%</div>
						<div className="text-xs text-gray-500">Accuracy</div>
					</div>
				</div>
				<div className="space-y-3">
					{app.getNumDueCards() > 0 && (
						<button
							onClick={() => {
								startedRef.current = false;
								setSession(null);
								setDone(false);
							}}
							className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
						>
							Review More ({app.getNumDueCards()} due)
						</button>
					)}
					<button
						onClick={() => navigate("/")}
						className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
					>
						Back to Home
					</button>
				</div>
			</div>
		);
	}

	if (!current) return null;

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-lg font-bold">Review</h1>
				<span className="text-sm text-gray-500">
					{cardIdx + 1} / {session.cards.length}
				</span>
			</div>
			<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
				<div
					className="h-full bg-orange-500 rounded-full transition-all"
					style={{ width: `${((cardIdx + 1) / session.cards.length) * 100}%` }}
				/>
			</div>

			{current.mode === "multipleChoice" ? (
				<MultipleChoice
					card={current.card}
					onAnswer={handleMultipleChoiceAnswer}
				/>
			) : (
				<Flashcard card={current.card} onRate={advance} />
			)}
		</div>
	);
}
