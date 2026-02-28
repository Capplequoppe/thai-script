import type {
	QuizCard,
	RecallRating,
	SessionSummary,
} from "../../shared/types";
import { Accuracy } from "../../srs/value-objects/Accuracy";

interface ReviewAnswer {
	cardId: string;
	rating: RecallRating;
}

export class ReviewSession {
	private readonly _results: ReviewAnswer[] = [];

	constructor(
		readonly id: string,
		readonly cards: ReadonlyArray<QuizCard>,
		readonly startedAt: string,
		readonly pool: string,
	) {}

	get currentIndex(): number {
		return this._results.length;
	}

	get currentCard(): QuizCard | null {
		return this.cards[this.currentIndex] ?? null;
	}

	get isComplete(): boolean {
		return this._results.length >= this.cards.length;
	}

	get results(): ReadonlyArray<ReviewAnswer> {
		return this._results;
	}

	get accuracy(): Accuracy {
		const correct = this._results.filter((r) => r.rating >= 3).length;
		return Accuracy.fromCounts(correct, this._results.length);
	}

	recordAnswer(cardId: string, rating: RecallRating): void {
		if (this.isComplete) {
			throw new Error("Session is already complete");
		}
		const current = this.currentCard;
		if (!current || current.card.id !== cardId) {
			throw new Error(`Expected card ${current?.card.id}, got ${cardId}`);
		}
		this._results.push({ cardId, rating });
	}

	toSummary(endTime: string): SessionSummary {
		const correct = this._results.filter((r) => r.rating >= 3).length;
		const incorrect = this._results.length - correct;
		return {
			sessionId: this.id,
			type:
				this.pool === "script"
					? "review"
					: this.pool === "vocab"
						? "vocab-review"
						: "grammar-review",
			durationMs:
				new Date(endTime).getTime() - new Date(this.startedAt).getTime(),
			totalCards: this._results.length,
			correctCount: correct,
			incorrectCount: incorrect,
			accuracy: this.accuracy.percentage,
			newCardsGraduated: 0,
		};
	}
}
