import type { CardRepository } from "../../ports/CardRepository";
import type { CardPool } from "../CardPool";
import { CardPools } from "../CardPool";

export const MAX_APPRENTICE_ITEMS = 100;

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

	canStartLesson(): boolean {
		return this.getApprenticeCount() < this.apprenticeLimit;
	}

	getApprenticeStats(): ApprenticeStats {
		const counts: Record<string, number> = {};
		for (const pool of CardPools.all()) {
			counts[pool] = this.cardRepo
				.findAll(pool)
				.filter((card) => card.schedule.isInLearning).length;
		}
		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		return {
			total,
			byPool: counts as Record<CardPool, number>,
			limit: this.apprenticeLimit,
			isAtLimit: total >= this.apprenticeLimit,
		};
	}
}
