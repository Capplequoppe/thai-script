import {
	type LessonSequenceEntry,
	lessonSequence,
} from "../../domain/script/data/lessonSequence";
import type { LearnerState, SrsCard } from "../../domain/shared/types";
import { INITIAL_LEARNER_STATE } from "../../domain/shared/types";
import { LAPSE_RECOVERY_INTERVAL_MINUTES } from "../../domain/srs/value-objects/SrsSchedule";
import { mergeLearnerStates } from "./MergeService";
import { validateLearnerStateDetailed } from "./Validation";

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

/**
 * A persisted state whose lesson identity could not be fully converted.
 * `sites` names every offending site; the load is refused as a whole rather
 * than half-converted, because a state with only some stores converted is the
 * exact hazard CONTEXT.md Rule 1 opens with.
 */
export class LessonIdentityMigrationError extends Error {
	constructor(readonly sites: readonly string[]) {
		super(`lesson identity migration refused: ${sites.join("; ")}`);
		this.name = "LessonIdentityMigrationError";
	}
}

/** `lessonNumber: 0` is the generator's "belongs to no lesson" sentinel. */
const NO_LESSON = 0;

/**
 * Converts every persisted lesson reference — `completedLessons`,
 * `currentLesson`, each script card's `lessonNumber`, and each pending
 * catch-up's `lessonNumber` — from the space the state was written in
 * (`legacyNumber`, the integer the five stores keyed on before this
 * migration; see CONTEXT.md Rule 1) onto the declared sequence's `position`,
 * in one atomic pass. The two remaining stores of the five, `sym.lesson` and
 * the lessons table's `number` in `symbols.ts`, are static data in the same
 * legacy space; every runtime join against them now routes through
 * `lessonSequence` too, so all five convert together or not at all.
 *
 * Under the sequence as declared today the mapping is the identity, so a
 * pre-migration blob re-serialises byte-identically — nothing a learner has
 * is moved. The machinery is what this task ships: a resequence changes only
 * the declaration. NOTE for the first *non-identity* resequence (phase 4):
 * an already-converted state is indistinguishable from a legacy one without
 * a marker, so that change must introduce a persisted epoch field (absent =
 * legacy space) before it ships, or a second load would double-convert.
 *
 * Every reference is resolved before anything is written: a state carrying
 * only some convertible stores is reported via {@link LessonIdentityMigrationError}
 * with every failing site named, and the state is left untouched.
 */
export function migrateLessonIdentity(
	state: LearnerState,
	sequence: readonly LessonSequenceEntry[] = lessonSequence,
): void {
	const positionByLegacy = new Map<number, number>();
	for (const entry of sequence) {
		positionByLegacy.set(entry.legacyNumber, entry.position);
	}
	const failures: string[] = [];
	const resolve = (value: number, site: string): number => {
		if (value === NO_LESSON) return NO_LESSON;
		const position = positionByLegacy.get(value);
		if (position === undefined) {
			failures.push(`${site}: no lesson is declared with number ${value}`);
			return value;
		}
		return position;
	};

	const completedLessons = state.completedLessons.map((n, i) =>
		resolve(n, `completedLessons[${i}]`),
	);
	const currentLesson =
		typeof state.currentLesson === "number"
			? resolve(state.currentLesson, "currentLesson")
			: state.currentLesson;
	const cardPositions = new Map<string, number>();
	for (const [id, card] of Object.entries(state.cards)) {
		cardPositions.set(
			id,
			resolve(card.lessonNumber, `cards[${JSON.stringify(id)}].lessonNumber`),
		);
	}
	const catchUpPositions = (state.pendingCatchUps ?? []).map((entry, i) =>
		resolve(entry.lessonNumber, `pendingCatchUps[${i}].lessonNumber`),
	);

	if (failures.length > 0) {
		throw new LessonIdentityMigrationError(failures);
	}

	state.completedLessons = [...new Set(completedLessons)];
	if (typeof state.currentLesson === "number") {
		state.currentLesson = currentLesson;
	}
	for (const [id, card] of Object.entries(state.cards)) {
		const position = cardPositions.get(id);
		if (position !== undefined) card.lessonNumber = position;
	}
	if (state.pendingCatchUps) {
		// Two legacy lessons can land on one position after a resequence
		// (merged lessons), so union their card ids instead of keeping both.
		const byPosition = new Map<number, string[]>();
		state.pendingCatchUps.forEach((entry, i) => {
			const position = catchUpPositions[i];
			const ids = byPosition.get(position) ?? [];
			byPosition.set(position, [...new Set([...ids, ...entry.cardIds])]);
		});
		state.pendingCatchUps = [...byPosition.entries()].map(
			([lessonNumber, cardIds]) => ({ lessonNumber, cardIds }),
		);
	}
}

/**
 * The one migrate-once-at-load pass over a persisted state: lesson identity
 * first ({@link migrateLessonIdentity}, atomic across every store), then the
 * per-card SRS shape. Mutates and returns `state`. `sequence` exists so tests
 * can exercise a non-identity resequence; production callers omit it.
 */
export function migrateState(
	state: LearnerState,
	now: string = new Date().toISOString(),
	sequence: readonly LessonSequenceEntry[] = lessonSequence,
): LearnerState {
	migrateLessonIdentity(state, sequence);
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

/**
 * The three persisted states a caller must be able to tell apart:
 * never written, written and empty, and written but unreadable — the last
 * reported with its reason and never mistaken for empty, because treating a
 * corrupt-but-recoverable blob as a fresh start is what overwrites it.
 * `progress` is the ordinary fourth case: written, readable, non-empty.
 */
export type PersistedStateReport =
	| { readonly kind: "never-written" }
	| { readonly kind: "empty" }
	| { readonly kind: "progress" }
	| { readonly kind: "unreadable"; readonly reason: string };

function isEmptyState(state: LearnerState): boolean {
	return (
		state.completedLessons.length === 0 &&
		state.currentLesson === null &&
		Object.keys(state.cards).length === 0 &&
		Object.keys(state.vocabCards ?? {}).length === 0 &&
		Object.keys(state.grammarCards ?? {}).length === 0 &&
		Object.keys(state.sentenceCards ?? {}).length === 0 &&
		state.sessionHistory.length === 0
	);
}

export interface IStorage {
	load(): LearnerState;
	save(state: LearnerState): void;
	reset(): void;
	/** Classifies what is persisted without pretending an unreadable state is a fresh one. */
	inspect(): PersistedStateReport;
	exportData(): string;
	importData(json: string): void;
}

export class InMemoryStorage implements IStorage {
	private state: LearnerState = structuredClone(INITIAL_LEARNER_STATE);
	private written = false;

	load(): LearnerState {
		return structuredClone(this.state);
	}

	save(state: LearnerState): void {
		this.state = structuredClone(state);
		this.written = true;
	}

	reset(): void {
		this.state = structuredClone(INITIAL_LEARNER_STATE);
		this.written = false;
	}

	inspect(): PersistedStateReport {
		if (!this.written) return { kind: "never-written" };
		return isEmptyState(this.state) ? { kind: "empty" } : { kind: "progress" };
	}

	exportData(): string {
		return JSON.stringify(this.state);
	}

	importData(json: string): void {
		const parsed: unknown = JSON.parse(json);
		const validated = validateLearnerStateDetailed(parsed);
		if (!validated.ok) {
			throw new Error(`Invalid progress file format: ${validated.reason}`);
		}
		// One migration boundary: an import from an older device is converted
		// through migrateState before the two states are merged. (This
		// adapter's own load() deliberately does not migrate — it hands back
		// states this process saved — so the import path is where a foreign
		// blob gets converted.)
		const incoming = migrateState(parsed as LearnerState);
		this.state = mergeLearnerStates(this.state, incoming);
		this.written = true;
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

	/**
	 * Loads and migrates the persisted state. A written-but-unreadable blob
	 * **throws** with its reason instead of falling back to the initial state:
	 * reading it as empty would let the next save overwrite a learner's
	 * recoverable progress. Never-written is the only case that reads as fresh.
	 */
	load(): LearnerState {
		if (typeof localStorage === "undefined") {
			return structuredClone(INITIAL_LEARNER_STATE);
		}
		const raw = localStorage.getItem(this.key);
		if (raw !== null && raw === this.cacheRaw && this.cache) {
			return this.cache;
		}
		if (raw === null) {
			this.cache = null;
			this.cacheRaw = null;
			return structuredClone(INITIAL_LEARNER_STATE);
		}
		let state: LearnerState;
		try {
			state = JSON.parse(raw) as LearnerState;
		} catch {
			// Deliberately not the parser's message: it quotes the blob.
			throw new Error("stored learner state is unreadable: not valid JSON");
		}
		const validated = validateLearnerStateDetailed(state);
		if (!validated.ok) {
			throw new Error(
				`stored learner state is unreadable: ${validated.reason}`,
			);
		}
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

	inspect(): PersistedStateReport {
		if (typeof localStorage === "undefined") {
			return { kind: "never-written" };
		}
		if (localStorage.getItem(this.key) === null) {
			return { kind: "never-written" };
		}
		let state: LearnerState;
		try {
			state = this.load();
		} catch (error) {
			return {
				kind: "unreadable",
				reason: error instanceof Error ? error.message : "unknown reason",
			};
		}
		return isEmptyState(state) ? { kind: "empty" } : { kind: "progress" };
	}

	exportData(): string {
		return JSON.stringify(this.load());
	}

	importData(json: string): void {
		const parsed: unknown = JSON.parse(json);
		const validated = validateLearnerStateDetailed(parsed);
		if (!validated.ok) {
			throw new Error(`Invalid progress file format: ${validated.reason}`);
		}
		// One migration boundary: an import from an older device is converted
		// here, exactly as a load is, before the two states are merged.
		const incoming = migrateState(parsed as LearnerState);
		const merged = mergeLearnerStates(this.load(), incoming);
		this.save(merged);
	}
}
