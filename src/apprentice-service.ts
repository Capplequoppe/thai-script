import type { IStorage } from "./storage";

export const MAX_APPRENTICE_ITEMS = 100;

export interface ApprenticeStats {
	count: number;
	limit: number;
	isAtLimit: boolean;
	script: number;
	vocab: number;
}

export class ApprenticeService {
	constructor(
		private readonly storage: IStorage,
		private readonly limit: number = MAX_APPRENTICE_ITEMS,
	) {}

	getApprenticeCount(): number {
		const state = this.storage.load();
		let count = 0;
		for (const card of Object.values(state.cards)) {
			if (card.srs.learningStep !== null) count++;
		}
		for (const card of Object.values(state.vocabCards)) {
			if (card.srs.learningStep !== null) count++;
		}
		return count;
	}

	canStartLesson(): boolean {
		return this.getApprenticeCount() < this.limit;
	}

	getApprenticeStats(): ApprenticeStats {
		const state = this.storage.load();
		let script = 0;
		let vocab = 0;
		for (const card of Object.values(state.cards)) {
			if (card.srs.learningStep !== null) script++;
		}
		for (const card of Object.values(state.vocabCards)) {
			if (card.srs.learningStep !== null) vocab++;
		}
		const count = script + vocab;
		return {
			count,
			limit: this.limit,
			isAtLimit: count >= this.limit,
			script,
			vocab,
		};
	}
}
