import { useCallback, useRef, useState } from "react";
import type { ActiveReviewSession } from "../../domain/session/services/ReviewService";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating, SessionSummary } from "../../domain/shared/types";

export interface ReviewCompletionResult {
	status: "complete";
	results: Array<{
		cardId: string;
		rating: RecallRating;
		beforeStage: string;
		afterStage: string;
	}>;
	summary: SessionSummary;
}

export function useReviewSession(
	startSessionFn: (maxCards?: number) => ActiveReviewSession,
	recordReviewFn: (cardId: string, rating: RecallRating) => string,
	endSessionFn: (session: ActiveReviewSession) => SessionSummary,
) {
	const [session, setSession] = useState<ActiveReviewSession | null>(null);
	const [cardIdx, setCardIdx] = useState(0);
	const sessionRef = useRef<ActiveReviewSession | null>(null);
	const enrichedResultsRef = useRef<ReviewCompletionResult["results"]>([]);

	const startReview = useCallback(
		(maxCards?: number) => {
			const s = startSessionFn(maxCards);
			sessionRef.current = s;
			enrichedResultsRef.current = [];
			setSession(s);
			setCardIdx(0);
			return s;
		},
		[startSessionFn],
	);

	const handleReviewAdvance = useCallback(
		(rating: RecallRating): ReviewCompletionResult | undefined => {
			if (!session || !sessionRef.current) return;
			const current = session.cards[cardIdx];
			if (!current) return;

			const beforeStage = current.card.schedule.stage.name;
			const afterStage = recordReviewFn(current.card.id, rating);
			sessionRef.current.results.push({ cardId: current.card.id, rating });
			enrichedResultsRef.current.push({
				cardId: current.card.id,
				rating,
				beforeStage,
				afterStage,
			});

			if (cardIdx + 1 < session.cards.length) {
				setCardIdx((i) => i + 1);
			} else {
				const finalResults = [...enrichedResultsRef.current];
				const summary = endSessionFn(sessionRef.current);
				setSession(null);
				return { status: "complete" as const, results: finalResults, summary };
			}
		},
		[session, cardIdx, recordReviewFn, endSessionFn],
	);

	const handleMcAnswer = useCallback(
		(correct: boolean) => {
			return handleReviewAdvance(ratingFromCorrectness(correct));
		},
		[handleReviewAdvance],
	);

	const currentCard = session?.cards[cardIdx] ?? null;

	return {
		session,
		cardIdx,
		currentCard,
		startReview,
		handleReviewAdvance,
		handleMcAnswer,
	};
}
