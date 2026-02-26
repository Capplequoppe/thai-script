import { calculateNextReview, isDue } from "./srs";
import type { IStorage } from "./storage";
import type {
	PropertyCard,
	QuizCard,
	RecallRating,
	SessionSummary,
} from "./types";

export interface ActiveReviewSession {
	id: string;
	cards: QuizCard[];
	startedAt: string;
	results: Array<{ cardId: string; rating: RecallRating }>;
}

export class ReviewService {
	constructor(private readonly storage: IStorage) {}

	getDueCards(now?: string): PropertyCard[] {
		const state = this.storage.load();
		const currentTime = now ?? new Date().toISOString();
		return Object.values(state.cards).filter((card) =>
			isDue(card.srs, currentTime),
		);
	}

	getNumDueCards(now?: string): number {
		return this.getDueCards(now).length;
	}

	recordReview(cardId: string, rating: RecallRating, now?: string): void {
		const state = this.storage.load();
		const card = state.cards[cardId];
		if (!card) throw new Error(`Card not found: ${cardId}`);

		const currentTime = now ?? new Date().toISOString();
		card.srs = calculateNextReview(card.srs, rating, currentTime);
		this.storage.save(state);
	}

	startReviewSession(maxCards?: number, now?: string): ActiveReviewSession {
		const dueCards = this.getDueCards(now);

		const sorted = dueCards.sort((a, b) => {
			const aDate = new Date(a.srs.nextReviewDate).getTime();
			const bDate = new Date(b.srs.nextReviewDate).getTime();
			if (aDate !== bDate) return aDate - bDate;
			return a.srs.easeFactor - b.srs.easeFactor;
		});

		const selected = maxCards ? sorted.slice(0, maxCards) : sorted;

		const quizCards: QuizCard[] = selected.map((card) => ({
			card,
			mode:
				card.srs.repetitions >= 2
					? ("flashcard" as const)
					: ("multipleChoice" as const),
		}));

		// Shuffle presentation order (Fisher-Yates)
		for (let i = quizCards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[quizCards[i], quizCards[j]] = [quizCards[j]!, quizCards[i]!];
		}

		return {
			id: crypto.randomUUID(),
			cards: quizCards,
			startedAt: now ?? new Date().toISOString(),
			results: [],
		};
	}

	endReviewSession(session: ActiveReviewSession, now?: string): SessionSummary {
		const endTime = now ?? new Date().toISOString();
		const startMs = new Date(session.startedAt).getTime();
		const endMs = new Date(endTime).getTime();

		const correct = session.results.filter((r) => r.rating >= 3).length;
		const incorrect = session.results.filter((r) => r.rating < 3).length;
		const total = session.results.length;

		const summary: SessionSummary = {
			sessionId: session.id,
			type: "review",
			durationMs: endMs - startMs,
			totalCards: total,
			correctCount: correct,
			incorrectCount: incorrect,
			accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
			newCardsGraduated: 0,
		};

		const state = this.storage.load();
		state.sessionHistory.push(summary);
		this.storage.save(state);

		return summary;
	}

	getNextReviewDate(): Date | null {
		const state = this.storage.load();
		const cards = Object.values(state.cards);
		if (cards.length === 0) return null;

		let earliest = Infinity;
		for (const card of cards) {
			const d = new Date(card.srs.nextReviewDate).getTime();
			if (d < earliest) earliest = d;
		}
		return new Date(earliest);
	}

	getSessionHistory(): SessionSummary[] {
		return this.storage.load().sessionHistory;
	}
}
