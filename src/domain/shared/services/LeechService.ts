import type { CardRepository } from "../../ports/CardRepository";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import type { CardPool } from "../CardPool";
import { CardPools } from "../CardPool";

export const DEFAULT_LEECH_THRESHOLD = 8;

export class LeechService {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly threshold: number = DEFAULT_LEECH_THRESHOLD,
	) {}

	isLeech(card: ReviewableCard): boolean {
		return card.isLeech(this.threshold);
	}

	getLeechCards(pool?: CardPool): ReviewableCard[] {
		const pools = pool ? [pool] : CardPools.all();
		const result: ReviewableCard[] = [];
		for (const p of pools) {
			result.push(
				...this.cardRepo.findAll(p).filter((c) => c.isLeech(this.threshold)),
			);
		}
		return result;
	}

	getLeechCount(pool?: CardPool): number {
		return this.getLeechCards(pool).length;
	}
}
