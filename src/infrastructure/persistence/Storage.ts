import type { LearnerState, SrsCard } from "../../domain/shared/types";
import { INITIAL_LEARNER_STATE } from "../../domain/shared/types";
import { LAPSE_RECOVERY_INTERVAL_MINUTES } from "../../domain/srs/value-objects/SrsSchedule";
import { mergeLearnerStates } from "./MergeService";
import { validateLearnerState } from "./Validation";

interface LegacySrsData {
	easeFactor: number;
	interval: number;
	repetitions: number;
	learningStep?: number | null;
	nextReviewDate: string;
	lastReviewDate: string | null;
	lapseCount?: number;
}

function migrateSrsCard(card: SrsCard, now: string): void {
	const srs = card.srs as LegacySrsData;
	if (srs.learningStep === undefined) {
		srs.learningStep = null;
	}
	if (srs.lapseCount === undefined) {
		srs.lapseCount = 0;
	}
	// A card stuck mid-relearning from a lapse recorded under the old
	// multi-step relearning ladder (2-3 more correct answers required to
	// re-graduate) — fast-forward it back to graduated now that a lapse no
	// longer re-enters that ladder. A brand-new item still climbing its
	// first-ever learning ladder always has lapseCount 0 (only
	// handleGraduatedPhase increments it), so this never touches those.
	if (srs.lapseCount > 0 && srs.learningStep !== null) {
		srs.learningStep = null;
		srs.interval = LAPSE_RECOVERY_INTERVAL_MINUTES;
		srs.nextReviewDate = new Date(
			new Date(now).getTime() + LAPSE_RECOVERY_INTERVAL_MINUTES * 60_000,
		).toISOString();
	}
}

export function migrateState(
	state: LearnerState,
	now: string = new Date().toISOString(),
): LearnerState {
	for (const card of Object.values(state.cards)) {
		migrateSrsCard(card, now);
	}
	for (const card of Object.values(state.vocabCards ?? {})) {
		migrateSrsCard(card, now);
		// Migrate legacy wordThai → promptWord
		const legacy = card as unknown as Record<string, unknown>;
		if ("wordThai" in legacy && !("promptWord" in legacy)) {
			legacy.promptWord = legacy.wordThai;
			delete legacy.wordThai;
		}
	}
	for (const card of Object.values(state.grammarCards ?? {})) {
		migrateSrsCard(card, now);
	}
	for (const card of Object.values(state.sentenceCards ?? {})) {
		migrateSrsCard(card, now);
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

	/**
	 * The parsed state, memoized against the exact raw string it came from.
	 *
	 * Without it every repository method re-ran `JSON.parse` + `migrateState`
	 * over the whole learner state. Because pages call use cases directly
	 * from their render bodies, one Dashboard render did that 42 times —
	 * ~12 MB of JSON parsed for a single render, and ~5 MB more on every
	 * answered card via the `Layout` shell's re-render. That was the app's
	 * dominant CPU cost on a phone.
	 *
	 * `getItem` is still called every time and the result compared, so a
	 * write that bypasses this adapter (another tab, a test seeding the key
	 * directly, devtools) is still picked up exactly as before — the cache
	 * changes how fast a load is, never what it observes.
	 *
	 * The cached object is returned **live, not cloned**: cloning costs more
	 * than the parse it replaces (measured: `structuredClone` 0.79 ms vs
	 * `JSON.parse` 0.57 ms on a 282 KB state). That is sound because every
	 * caller here either only reads, or follows the load-mutate-save shape
	 * the repositories use, where mutating then saving is the intended
	 * effect. Note this differs from `InMemoryStorage`, which clones on both
	 * ends.
	 */
	private cache: LearnerState | null = null;
	/** The exact `getItem` string `cache` was parsed from. */
	private cacheRaw: string | null = null;

	constructor(key = "thai-srs-state") {
		this.key = key;
	}

	load(): LearnerState {
		if (typeof localStorage === "undefined") {
			return structuredClone(INITIAL_LEARNER_STATE);
		}
		const raw = localStorage.getItem(this.key);
		if (raw !== null && raw === this.cacheRaw && this.cache) {
			return this.cache;
		}
		if (!raw) {
			this.cache = null;
			this.cacheRaw = null;
			return structuredClone(INITIAL_LEARNER_STATE);
		}
		const state = JSON.parse(raw) as LearnerState;
		if (!state.vocabCards) {
			state.vocabCards = {};
		}
		if (!state.grammarCards) {
			state.grammarCards = {};
		}
		if (!state.sentenceCards) {
			state.sentenceCards = {};
		}
		if (!state.achievements) {
			state.achievements = [];
		}
		this.cache = migrateState(state);
		this.cacheRaw = raw;
		return this.cache;
	}

	save(state: LearnerState): void {
		const raw = JSON.stringify(state);
		// Adopt what was just saved as the cache, keyed on the very string
		// written, so the next `load` is a string compare rather than a parse.
		this.cache = state;
		this.cacheRaw = raw;
		if (typeof localStorage === "undefined") return;
		localStorage.setItem(this.key, raw);
	}

	reset(): void {
		this.cache = null;
		this.cacheRaw = null;
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
