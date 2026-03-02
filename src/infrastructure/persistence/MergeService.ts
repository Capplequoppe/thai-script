import type { LearnerState } from "../../domain/shared/types";

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

	return {
		completedLessons,
		currentLesson: current.currentLesson,
		cards,
		vocabCards,
		grammarCards,
		sentenceCards,
		sessionHistory: [...sessionMap.values()],
		achievements,
	};
}
