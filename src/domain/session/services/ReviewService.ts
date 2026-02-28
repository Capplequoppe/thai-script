import type { CardRepository } from "../../../application/ports/CardRepository";
import type { LearnerStateRepository } from "../../../application/ports/LearnerStateRepository";
import type { CardPool } from "../../shared/CardPool";
import type {
	RecallRating as RawRecallRating,
	SessionSummary,
} from "../../shared/types";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { RecallRating } from "../../srs/value-objects/RecallRating";
import type { ResponseTimingData } from "../../srs/value-objects/SrsSchedule";

export interface ReviewQuizCard {
	card: ReviewableCard;
	mode: "multipleChoice" | "flashcard";
}

export interface ActiveReviewSession {
	id: string;
	cards: ReviewQuizCard[];
	startedAt: string;
	results: Array<{ cardId: string; rating: RawRecallRating }>;
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
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly stateRepo: LearnerStateRepository,
	) {}

	getDueCards(now?: string, pool: CardPool = "script"): ReviewableCard[] {
		const currentTime = now ?? new Date().toISOString();
		return this.cardRepo.findDue(currentTime, pool);
	}

	getNumDueCards(now?: string, pool: CardPool = "script"): number {
		return this.getDueCards(now, pool).length;
	}

	recordReview(
		cardId: string,
		rating: RawRecallRating,
		now?: string,
		timing?: ResponseTimingData,
		pool: CardPool = "script",
	): void {
		const card = this.cardRepo.findById(cardId, pool);
		if (!card) throw new Error(`Card not found: ${cardId}`);

		const currentTime = now ?? new Date().toISOString();
		card.recordReview(RecallRating.fromRaw(rating), currentTime, timing);
		this.cardRepo.save(card);
	}

	startReviewSession(
		maxCards?: number,
		now?: string,
		pool: CardPool = "script",
	): ActiveReviewSession {
		const dueCards = this.getDueCards(now, pool);

		const sorted = dueCards.sort((a, b) => {
			const aDate = new Date(a.schedule.nextReviewDate).getTime();
			const bDate = new Date(b.schedule.nextReviewDate).getTime();
			if (aDate !== bDate) return aDate - bDate;
			return a.schedule.easeFactor.value - b.schedule.easeFactor.value;
		});

		const selected = maxCards ? sorted.slice(0, maxCards) : sorted;

		const quizCards: ReviewQuizCard[] = selected.map((card) => ({
			card,
			mode:
				card.schedule.learningStep === null
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

		const summaryType =
			pool === "script"
				? "review"
				: pool === "vocab"
					? "vocab-review"
					: "grammar-review";

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

		this.stateRepo.addSession(summary);

		return summary;
	}

	getNextReviewDate(pool: CardPool = "script"): Date | null {
		const cards = this.cardRepo.findAll(pool);
		if (cards.length === 0) return null;

		let earliest = Infinity;
		for (const card of cards) {
			if (card.schedule.isBurned) continue;
			const d = new Date(card.schedule.nextReviewDate).getTime();
			if (d < earliest) earliest = d;
		}
		return earliest === Infinity ? null : new Date(earliest);
	}

	resurrectCard(cardId: string, pool: CardPool = "script"): void {
		const card = this.cardRepo.findById(cardId, pool);
		if (!card) throw new Error(`Card not found: ${cardId}`);
		card.resurrect();
		this.cardRepo.save(card);
	}

	getReviewForecast(now?: string, pool: CardPool = "script"): ReviewForecast {
		const currentTime = now ?? new Date().toISOString();
		const nowMs = new Date(currentTime).getTime();
		const cards = this.cardRepo.findAll(pool);

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
			if (card.schedule.isBurned) continue;

			const reviewMs = new Date(card.schedule.nextReviewDate).getTime();
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
		const cards = this.cardRepo.findAll(pool);

		return cards
			.filter((card) => card.schedule.repetitions > 0)
			.sort((a, b) => {
				const easeDiff =
					a.schedule.easeFactor.value - b.schedule.easeFactor.value;
				if (easeDiff !== 0) return easeDiff;
				return b.schedule.lapseCount - a.schedule.lapseCount;
			})
			.slice(0, limit)
			.map((card) => ({
				id: card.id,
				question: card.question,
				correctAnswer: card.correctAnswer,
				easeFactor: card.schedule.easeFactor.value,
				lapseCount: card.schedule.lapseCount,
				interval: card.schedule.interval,
			}));
	}

	getSessionHistory(): SessionSummary[] {
		return this.stateRepo.getSessionHistory();
	}
}
