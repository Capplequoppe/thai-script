import { useCallback, useRef, useState } from "react";
import type { ActiveReviewSession } from "../../domain/session/services/ReviewService";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";

export interface ReviewCompletionResult {
	status: "complete";
	results: Array<{ cardId: string; rating: RecallRating }>;
}

export function useReviewSession(
	startSessionFn: (maxCards?: number) => ActiveReviewSession,
	recordReviewFn: (cardId: string, rating: RecallRating) => void,
	endSessionFn: (session: ActiveReviewSession) => void,
) {
	const [session, setSession] = useState<ActiveReviewSession | null>(null);
	const [cardIdx, setCardIdx] = useState(0);
	const sessionRef = useRef<ActiveReviewSession | null>(null);

	const startReview = useCallback(
		(maxCards?: number) => {
			const s = startSessionFn(maxCards);
			sessionRef.current = s;
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

			recordReviewFn(current.card.id, rating);
			sessionRef.current.results.push({ cardId: current.card.id, rating });

			if (cardIdx + 1 < session.cards.length) {
				setCardIdx((i) => i + 1);
			} else {
				const finalResults = [...sessionRef.current.results];
				endSessionFn(sessionRef.current);
				setSession(null);
				return { status: "complete", results: finalResults };
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
