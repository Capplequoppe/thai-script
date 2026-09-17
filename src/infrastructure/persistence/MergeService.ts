import type { LearnerState, PendingCatchUp } from "../../domain/shared/types";

function mergePendingCatchUps(
	current: readonly PendingCatchUp[],
	incoming: readonly PendingCatchUp[],
): PendingCatchUp[] {
	const byLesson = new Map<number, string[]>();
	for (const entry of [...current, ...incoming]) {
		const ids = byLesson.get(entry.lessonNumber) ?? [];
		byLesson.set(entry.lessonNumber, [...new Set([...ids, ...entry.cardIds])]);
	}
	return [...byLesson.entries()].map(([lessonNumber, cardIds]) => ({
		lessonNumber,
		cardIds,
	}));
}

/**
 * Unions two devices' learner states without losing anything from either
 * side. Both inputs are expected in the current (migrated) representation —
 * the storage boundary runs `migrateState` on an imported blob before calling
 * this, so an export from an older device converts exactly once, there.
 */
export function mergeLearnerStates(
	current: LearnerState,
	incoming: LearnerState,
): LearnerState {
	const completedLessons = [
		...new Set([...current.completedLessons, ...incoming.completedLessons]),
	];

	const cards = { ...incoming.cards };
	for (const [id, currentCard] of Object.entries(current.cards)) {
		const incomingCard = cards[id];
		if (
			!incomingCard ||
			currentCard.srs.repetitions >= incomingCard.srs.repetitions
		) {
			cards[id] = currentCard;
		}
	}

	const vocabCards = { ...incoming.vocabCards };
	for (const [id, currentCard] of Object.entries(current.vocabCards)) {
		const incomingCard = vocabCards[id];
		if (
			!incomingCard ||
			currentCard.srs.repetitions >= incomingCard.srs.repetitions
		) {
			vocabCards[id] = currentCard;
		}
	}

	const grammarCards = { ...incoming.grammarCards };
	for (const [id, currentCard] of Object.entries(current.grammarCards)) {
		const incomingCard = grammarCards[id];
		if (
			!incomingCard ||
			currentCard.srs.repetitions >= incomingCard.srs.repetitions
		) {
			grammarCards[id] = currentCard;
		}
	}

	const sentenceCards = { ...(incoming.sentenceCards ?? {}) };
	for (const [id, currentCard] of Object.entries(current.sentenceCards ?? {})) {
		const incomingCard = sentenceCards[id];
		if (
			!incomingCard ||
			currentCard.srs.repetitions >= incomingCard.srs.repetitions
		) {
			sentenceCards[id] = currentCard;
		}
	}

	const sessionMap = new Map(
		current.sessionHistory.map((s) => [s.sessionId, s]),
	);
	for (const s of incoming.sessionHistory) {
		if (!sessionMap.has(s.sessionId)) {
			sessionMap.set(s.sessionId, s);
		}
	}

	const achievements = [
		...new Set([...current.achievements, ...incoming.achievements]),
	];

	const pendingCatchUps =
		current.pendingCatchUps || incoming.pendingCatchUps
			? mergePendingCatchUps(
					current.pendingCatchUps ?? [],
					incoming.pendingCatchUps ?? [],
				)
			: undefined;

	return {
		completedLessons,
		// A lesson in progress on either device survives the merge; the
		// device doing the merging wins only when both have one.
		currentLesson: current.currentLesson ?? incoming.currentLesson,
		cards,
		vocabCards,
		grammarCards,
		sentenceCards,
		sessionHistory: [...sessionMap.values()],
		achievements,
		apprenticeLimits: current.apprenticeLimits,
		pendingCatchUps,
	};
}
