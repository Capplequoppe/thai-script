import { type ResponseTimingData, calculateNextReview, isBurned, isDue, resurrectCard as resurrectSrsCard } from "./srs";
import type { IStorage } from "./storage";
import type {
	LearnerState,
	QuizCard,
	RecallRating,
	SessionSummary,
	SrsCard,
} from "./types";

export type CardPool = "script" | "vocab";

export interface ActiveReviewSession {
	id: string;
	cards: QuizCard[];
	startedAt: string;
	results: Array<{ cardId: string; rating: RecallRating }>;
}

export interface ReviewForecast {
	dueNow: number;
	nextHour: number;
	next24Hours: number;
	next3Days: number;
	next7Days: number;
}

export interface CriticalItem {
	id: string;
	question: string;
	correctAnswer: string;
	easeFactor: number;
	lapseCount: number;
	interval: number;
}

export class ReviewService {
	constructor(private readonly storage: IStorage) {}

	private getCardRecord(
		state: LearnerState,
		pool: CardPool,
	): Record<string, SrsCard> {
		return pool === "script" ? state.cards : state.vocabCards;
	}

	getDueCards(now?: string, pool: CardPool = "script"): SrsCard[] {
		const state = this.storage.load();
		const currentTime = now ?? new Date().toISOString();
		return Object.values(this.getCardRecord(state, pool)).filter((card) =>
			isDue(card.srs, currentTime),
		);
	}

	getNumDueCards(now?: string, pool: CardPool = "script"): number {
		return this.getDueCards(now, pool).length;
	}

	recordReview(
		cardId: string,
		rating: RecallRating,
		now?: string,
		timing?: ResponseTimingData,
		pool: CardPool = "script",
	): void {
		const state = this.storage.load();
		const cardRecord = this.getCardRecord(state, pool);
		const card = cardRecord[cardId];
		if (!card) throw new Error(`Card not found: ${cardId}`);

		const currentTime = now ?? new Date().toISOString();
		card.srs = calculateNextReview(card.srs, rating, currentTime, timing);
		this.storage.save(state);
	}

	startReviewSession(
		maxCards?: number,
		now?: string,
		pool: CardPool = "script",
	): ActiveReviewSession {
		const dueCards = this.getDueCards(now, pool);

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
				card.srs.learningStep === null
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

	endReviewSession(
		session: ActiveReviewSession,
		now?: string,
		pool: CardPool = "script",
	): SessionSummary {
		const endTime = now ?? new Date().toISOString();
		const startMs = new Date(session.startedAt).getTime();
		const endMs = new Date(endTime).getTime();

		const correct = session.results.filter((r) => r.rating >= 3).length;
		const incorrect = session.results.filter((r) => r.rating < 3).length;
		const total = session.results.length;

		const summaryType = pool === "script" ? "review" : "vocab-review";

		const summary: SessionSummary = {
			sessionId: session.id,
			type: summaryType,
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

	getNextReviewDate(pool: CardPool = "script"): Date | null {
		const state = this.storage.load();
		const cards = Object.values(this.getCardRecord(state, pool));
		if (cards.length === 0) return null;

		let earliest = Infinity;
		for (const card of cards) {
			if (isBurned(card.srs)) continue;
			const d = new Date(card.srs.nextReviewDate).getTime();
			if (d < earliest) earliest = d;
		}
		return earliest === Infinity ? null : new Date(earliest);
	}

	resurrectCard(cardId: string, pool: CardPool = "script"): void {
		const state = this.storage.load();
		const cardRecord = this.getCardRecord(state, pool);
		const card = cardRecord[cardId];
		if (!card) throw new Error(`Card not found: ${cardId}`);
		card.srs = resurrectSrsCard(card.srs);
		this.storage.save(state);
	}

	getReviewForecast(
		now?: string,
		pool: CardPool = "script",
	): ReviewForecast {
		const state = this.storage.load();
		const currentTime = now ?? new Date().toISOString();
		const nowMs = new Date(currentTime).getTime();
		const cards = Object.values(this.getCardRecord(state, pool));

		const forecast: ReviewForecast = {
			dueNow: 0,
			nextHour: 0,
			next24Hours: 0,
			next3Days: 0,
			next7Days: 0,
		};

		const hourMs = 60 * 60_000;
		const dayMs = 24 * hourMs;

		for (const card of cards) {
			if (isBurned(card.srs)) continue;

			const reviewMs = new Date(card.srs.nextReviewDate).getTime();
			const diffMs = reviewMs - nowMs;

			if (diffMs <= 7 * dayMs) {
				forecast.next7Days++;
				if (diffMs <= 3 * dayMs) {
					forecast.next3Days++;
					if (diffMs <= dayMs) {
						forecast.next24Hours++;
						if (diffMs <= hourMs) {
							forecast.nextHour++;
							if (diffMs <= 0) {
								forecast.dueNow++;
							}
						}
					}
				}
			}
		}

		return forecast;
	}

	getCriticalItems(pool: CardPool = "script", limit = 10): CriticalItem[] {
		const state = this.storage.load();
		const cards = Object.values(this.getCardRecord(state, pool));

		return cards
			.filter((card) => card.srs.repetitions > 0)
			.sort((a, b) => {
				const easeDiff = a.srs.easeFactor - b.srs.easeFactor;
				if (easeDiff !== 0) return easeDiff;
				return (b.srs.lapseCount ?? 0) - (a.srs.lapseCount ?? 0);
			})
			.slice(0, limit)
			.map((card) => ({
				id: card.id,
				question: card.question,
				correctAnswer: card.correctAnswer,
				easeFactor: card.srs.easeFactor,
				lapseCount: card.srs.lapseCount ?? 0,
				interval: card.srs.interval,
			}));
	}

	getSessionHistory(): SessionSummary[] {
		return this.storage.load().sessionHistory;
	}
}
