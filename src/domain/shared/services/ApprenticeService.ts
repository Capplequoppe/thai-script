import type { CardRepository } from "../../ports/CardRepository";
import type { LearnerStateRepository } from "../../ports/LearnerStateRepository";
import type { ApprenticeLimits } from "../../shared/types";
import type { CardPool } from "../CardPool";
import { CardPools } from "../CardPool";

export const MAX_APPRENTICE_ITEMS = 100;
export const MAX_SCRIPT_APPRENTICE_ITEMS = 35;
export const MAX_SENTENCE_APPRENTICE_ITEMS = 60;

export const DEFAULT_APPRENTICE_LIMITS: ApprenticeLimits = {
	general: MAX_APPRENTICE_ITEMS,
	script: MAX_SCRIPT_APPRENTICE_ITEMS,
	sentence: MAX_SENTENCE_APPRENTICE_ITEMS,
};

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
		private readonly stateRepo?: LearnerStateRepository,
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
	 * Distinct in-progress vocab words, not raw cards — a word fans out into
	 * several property cards (thaiToEnglish, spelling, audio, ...), but they
	 * represent one learning item for backpressure purposes.
	 */
	getVocabApprenticeCount(): number {
		const cards = this.cardRepo
			.findAll("vocab")
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
		const limits = this.stateRepo?.getApprenticeLimits();
		if (pool === "script") {
			return (
				this.getApprenticeCountForPool("script") <
				(limits?.script ?? MAX_SCRIPT_APPRENTICE_ITEMS)
			);
		}
		if (pool === "sentence") {
			return (
				this.getSentenceApprenticeCount() <
				(limits?.sentence ?? MAX_SENTENCE_APPRENTICE_ITEMS)
			);
		}
		if (pool === "vocab") {
			return (
				this.getVocabApprenticeCount() <
				(limits?.general ?? this.apprenticeLimit)
			);
		}
		return (
			this.getNonSentenceApprenticeCount() <
			(limits?.general ?? this.apprenticeLimit)
		);
	}

	getApprenticeStats(): ApprenticeStats {
		const limits = this.stateRepo?.getApprenticeLimits();
		const generalLimit = limits?.general ?? this.apprenticeLimit;
		const counts: Record<string, number> = {};
		for (const pool of CardPools.all()) {
			counts[pool] = this.getApprenticeCountForPool(pool);
		}
		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		const nonSentenceTotal = total - (counts.sentence ?? 0);
		return {
			total,
			byPool: counts as Record<CardPool, number>,
			limit: generalLimit,
			isAtLimit: nonSentenceTotal >= generalLimit,
		};
	}
}
