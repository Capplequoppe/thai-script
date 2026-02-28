import { mergeLearnerStates } from "./merge-service";
import type { LearnerState, SrsCard } from "./types";
import { INITIAL_LEARNER_STATE } from "./types";
import { validateLearnerState } from "./validation";

function migrateSrsCard(card: SrsCard): void {
	const srs = card.srs;
	if (srs.learningStep === undefined) {
		(srs as Record<string, unknown>).learningStep = null;
	}
	if (srs.lapseCount === undefined) {
		srs.lapseCount = 0;
	}
}

export function migrateState(state: LearnerState): LearnerState {
	for (const card of Object.values(state.cards)) {
		migrateSrsCard(card);
	}
	for (const card of Object.values(state.vocabCards ?? {})) {
		migrateSrsCard(card);
	}
	return state;
}

export interface IStorage {
	load(): LearnerState;
	save(state: LearnerState): void;
	reset(): void;
	exportData(): string;
	importData(json: string): void;
}

export class InMemoryStorage implements IStorage {
	private state: LearnerState = structuredClone(INITIAL_LEARNER_STATE);

	load(): LearnerState {
		return structuredClone(this.state);
	}

	save(state: LearnerState): void {
		this.state = structuredClone(state);
	}

	reset(): void {
		this.state = structuredClone(INITIAL_LEARNER_STATE);
	}

	exportData(): string {
		return JSON.stringify(this.state);
	}

	importData(json: string): void {
		const parsed: unknown = JSON.parse(json);
		if (!validateLearnerState(parsed)) {
			throw new Error("Invalid progress file format");
		}
		this.state = mergeLearnerStates(this.state, parsed as LearnerState);
	}
}

export class LocalStorageAdapter implements IStorage {
	private readonly key: string;

	constructor(key = "thai-srs-state") {
		this.key = key;
	}

	load(): LearnerState {
		if (typeof localStorage === "undefined") {
			return structuredClone(INITIAL_LEARNER_STATE);
		}
		const raw = localStorage.getItem(this.key);
		if (!raw) return structuredClone(INITIAL_LEARNER_STATE);
		const state = JSON.parse(raw) as LearnerState;
		if (!state.vocabCards) {
			state.vocabCards = {};
		}
		return migrateState(state);
	}

	save(state: LearnerState): void {
		if (typeof localStorage === "undefined") return;
		localStorage.setItem(this.key, JSON.stringify(state));
	}

	reset(): void {
		if (typeof localStorage === "undefined") return;
		localStorage.removeItem(this.key);
	}

	exportData(): string {
		return JSON.stringify(this.load());
	}

	importData(json: string): void {
		const parsed: unknown = JSON.parse(json);
		if (!validateLearnerState(parsed)) {
			throw new Error("Invalid progress file format");
		}
		const merged = mergeLearnerStates(this.load(), parsed as LearnerState);
		this.save(merged);
	}
}
