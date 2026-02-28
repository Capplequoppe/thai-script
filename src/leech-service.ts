import type { IStorage } from "./storage";
import type { SrsCard } from "./types";
import type { CardPool } from "./review-service";

export const DEFAULT_LEECH_THRESHOLD = 8;

export class LeechService {
	constructor(
		private readonly storage: IStorage,
		private readonly threshold: number = DEFAULT_LEECH_THRESHOLD,
	) {}

	isLeech(card: SrsCard): boolean {
		return (card.srs.lapseCount ?? 0) >= this.threshold;
	}

	getLeechCards(pool?: CardPool): SrsCard[] {
		const state = this.storage.load();
		const cards =
			pool === "vocab"
				? Object.values(state.vocabCards)
				: pool === "script"
					? Object.values(state.cards)
					: [
							...Object.values(state.cards),
							...Object.values(state.vocabCards),
						];
		return cards.filter((card) => this.isLeech(card));
	}

	getLeechCount(pool?: CardPool): number {
		return this.getLeechCards(pool).length;
	}
}
