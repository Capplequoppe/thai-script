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
		let cards: SrsCard[];
		switch (pool) {
			case "script":
				cards = Object.values(state.cards);
				break;
			case "vocab":
				cards = Object.values(state.vocabCards);
				break;
			case "grammar":
				cards = Object.values(state.grammarCards);
				break;
			default:
				cards = [
					...Object.values(state.cards),
					...Object.values(state.vocabCards),
					...Object.values(state.grammarCards),
				];
		}
		return cards.filter((card) => this.isLeech(card));
	}

	getLeechCount(pool?: CardPool): number {
		return this.getLeechCards(pool).length;
	}
}
