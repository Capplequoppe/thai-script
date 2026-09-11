import type { CardRepository } from "../../ports/CardRepository";
import type { CardPool } from "../CardPool";
import { CardPools } from "../CardPool";

export const MAX_APPRENTICE_ITEMS = 100;
export const MAX_SCRIPT_APPRENTICE_ITEMS = 35;
export const MAX_SENTENCE_APPRENTICE_ITEMS = 60;

export interface ApprenticeStats {
	total: number;
	byPool: Record<CardPool, number>;
	limit: number;
	isAtLimit: boolean;
}

export class ApprenticeService {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly apprenticeLimit: number = MAX_APPRENTICE_ITEMS,
	) {}

	getApprenticeCount(): number {
		let count = 0;
		for (const pool of CardPools.all()) {
			count += this.cardRepo
				.findAll(pool)
				.filter((card) => card.schedule.isInLearning).length;
		}
		return count;
	}

	getApprenticeCountForPool(pool: CardPool): number {
		return this.cardRepo
			.findAll(pool)
			.filter((card) => card.schedule.isInLearning).length;
	}

	/**
	 * Distinct in-progress sentences, not raw cards — a sentence fans out into
	 * up to 4 SRS cards, but they represent one learning item for backpressure
	 * purposes.
	 */
	getSentenceApprenticeCount(): number {
		const cards = this.cardRepo
			.findAll("sentence")
			.filter((card) => card.schedule.isInLearning);
		return new Set(cards.map((card) => card.groupKey)).size;
	}

	/**
	 * Sum of in-learning cards across every pool except sentence. Sentences
	 * are compositional application of already-learned vocab/grammar, not new
	 * atomic memorization, so they're gated by their own cap
	 * (MAX_SENTENCE_APPRENTICE_ITEMS) instead of sharing this budget.
	 */
	private getNonSentenceApprenticeCount(): number {
		let count = 0;
		for (const pool of CardPools.all()) {
			if (pool === "sentence") continue;
			count += this.getApprenticeCountForPool(pool);
		}
		return count;
	}

	canStartLesson(pool?: CardPool): boolean {
		if (pool === "script") {
			return (
				this.getApprenticeCountForPool("script") < MAX_SCRIPT_APPRENTICE_ITEMS
			);
		}
		if (pool === "sentence") {
			return this.getSentenceApprenticeCount() < MAX_SENTENCE_APPRENTICE_ITEMS;
		}
		return this.getNonSentenceApprenticeCount() < this.apprenticeLimit;
	}

	getApprenticeStats(): ApprenticeStats {
		const counts: Record<string, number> = {};
		for (const pool of CardPools.all()) {
			counts[pool] = this.getApprenticeCountForPool(pool);
		}
		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		const nonSentenceTotal = total - (counts.sentence ?? 0);
		return {
			total,
			byPool: counts as Record<CardPool, number>,
			limit: this.apprenticeLimit,
			isAtLimit: nonSentenceTotal >= this.apprenticeLimit,
		};
	}
}
