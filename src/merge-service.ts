import type { LearnerState } from "./types";

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

	const sessionMap = new Map(
		current.sessionHistory.map((s) => [s.sessionId, s]),
	);
	for (const s of incoming.sessionHistory) {
		if (!sessionMap.has(s.sessionId)) {
			sessionMap.set(s.sessionId, s);
		}
	}

	return {
		completedLessons,
		currentLesson: current.currentLesson,
		cards,
		sessionHistory: [...sessionMap.values()],
	};
}
