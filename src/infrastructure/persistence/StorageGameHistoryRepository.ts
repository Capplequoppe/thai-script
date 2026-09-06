import type {
	GameHistoryListResult,
	GameHistoryRepository,
} from "../../domain/game/ports/GameHistoryRepository";
import type {
	GameCardPool,
	GameHistoryEntry,
	PracticeHistoryEntry,
} from "../../domain/game/types";
import type { JsonShapeGuard, JsonStore } from "./JsonStore";

/**
 * Deliberately its own key, never a field on `thai-srs-state`: game history
 * is a practice log, not SRS progress, so it must survive an SRS reset and
 * stay untouched by `ManageDataUseCase.exportData()`. See CONTEXT.md.
 */
export const GAME_HISTORY_STORAGE_KEY = "thai-srs-game-history";

/**
 * The allowlist this file's shape guard checks a persisted `pools` entry
 * against, derived from `GameCardPool` rather than hand-maintained beside
 * it. A `Record<GameCardPool, true>` must name every member, so adding a
 * pool to `GameCardPool` is a compile error *here* — which is the whole
 * point.
 *
 * A hand-written `readonly GameCardPool[]` (what this was) type-checks
 * happily while missing members, and a missing member is not a cosmetic
 * gap: `isGameHistoryEntry` failing one entry makes `isGameHistoryEntryArray`
 * reject the *entire* stored array, `list()` report `unavailable`, and the
 * next `save()` overwrite the learner's whole game history with the single
 * new entry. That is exactly what the first `pools: ["sentence"]` round
 * would have done.
 */
const GAME_CARD_POOL_ALLOWLIST: Record<GameCardPool, true> = {
	script: true,
	vocab: true,
	sentence: true,
};

const GAME_CARD_POOLS: ReadonlySet<string> = new Set(
	Object.keys(GAME_CARD_POOL_ALLOWLIST),
);

function isGameCardPool(value: unknown): value is GameCardPool {
	return typeof value === "string" && GAME_CARD_POOLS.has(value);
}

/**
 * Shallow shape check for one persisted `GameHistoryEntry.summary` — enough
 * to reject a corrupt or foreign blob, matching `Validation.ts`'s own
 * shallow-not-exhaustive style for the SRS blob.
 */
function hasGameRoundSummaryShape(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	const summary = value as Record<string, unknown>;

	if (
		typeof summary.ratingCounts !== "object" ||
		summary.ratingCounts === null
	) {
		return false;
	}
	if (typeof summary.ratedCount !== "number") return false;
	return summary.accuracy === null || typeof summary.accuracy === "number";
}

/**
 * The `kind` allowlist, derived from `GameHistoryEntry` the same way — and
 * for the same reason — as `GAME_CARD_POOL_ALLOWLIST` is derived from
 * `GameCardPool`: a new history-entry variant must be a compile error here
 * rather than a blob this guard silently rejects.
 */
const GAME_HISTORY_KIND_ALLOWLIST: Record<GameHistoryEntry["kind"], true> = {
	practice: true,
	composition: true,
};

const GAME_HISTORY_KINDS: ReadonlySet<string> = new Set(
	Object.keys(GAME_HISTORY_KIND_ALLOWLIST),
);

/**
 * One entry as it may be found in the store. `kind` is required on the
 * domain type but was not written at all before this plan, so the persisted
 * shape is the domain shape plus that one legacy variant — named here so
 * the normalization below is a total function over what the guard accepts,
 * not a cast.
 */
type PersistedGameHistoryEntry =
	| GameHistoryEntry
	| Omit<PracticeHistoryEntry, "kind">;

/**
 * Shallow shape check for one persisted `GameHistoryEntry` — enough to
 * reject a corrupt or foreign blob, not a full domain-validity check.
 *
 * `kind` may be absent (every entry written before the field existed),
 * `"practice"` or `"composition"`; anything else is rejected. A composition
 * entry carries no `pools` — requiring the field regardless would reject
 * the entire stored array the first time a composition round was saved,
 * which is the same whole-history loss the pool allowlist above exists to
 * prevent.
 */
function isGameHistoryEntry(
	value: unknown,
): value is PersistedGameHistoryEntry {
	if (value === null || typeof value !== "object") return false;
	const entry = value as Record<string, unknown>;

	if (entry.kind !== undefined) {
		if (typeof entry.kind !== "string") return false;
		if (!GAME_HISTORY_KINDS.has(entry.kind)) return false;
	}

	const hasPools =
		entry.kind === "composition" ||
		(Array.isArray(entry.pools) && entry.pools.every(isGameCardPool));

	return (
		typeof entry.id === "string" &&
		typeof entry.playedAt === "string" &&
		typeof entry.itemCount === "number" &&
		hasPools &&
		hasGameRoundSummaryShape(entry.summary)
	);
}

/**
 * Fills in `kind: "practice"` for an entry persisted before that field
 * existed. The one and only place that rule lives — see
 * `GameHistoryEntry`'s own doc comment.
 */
function withKind(entry: PersistedGameHistoryEntry): GameHistoryEntry {
	return "kind" in entry ? entry : { ...entry, kind: "practice" };
}

/**
 * Shape guard for the `JsonStore<GameHistoryEntry[]>` this repository is
 * built over. The store is typed in the *domain* shape because that is what
 * every holder of one passes around; what it accepts is the slightly wider
 * persisted shape, and `list()` — the only code that ever reads a loaded
 * value — closes that gap by normalizing before returning.
 */
export const isGameHistoryEntryArray: JsonShapeGuard<GameHistoryEntry[]> = (
	value,
): value is GameHistoryEntry[] =>
	Array.isArray(value) && value.every(isGameHistoryEntry);

/**
 * `GameHistoryRepository` over a `JsonStore<GameHistoryEntry[]>` — a
 * corrupt store maps to `{status:"unavailable"}`, an empty one to
 * `{status:"ok", entries:[]}`, and listing sorts most-recent-first.
 */
export class StorageGameHistoryRepository implements GameHistoryRepository {
	constructor(private readonly store: JsonStore<GameHistoryEntry[]>) {}

	list(): GameHistoryListResult {
		const result = this.store.load();
		if (result.status === "corrupt") return { status: "unavailable" };
		if (result.status === "empty") return { status: "ok", entries: [] };
		return {
			status: "ok",
			entries: (result.value as readonly PersistedGameHistoryEntry[])
				.map(withKind)
				.sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
		};
	}

	save(entry: GameHistoryEntry): void {
		const current = this.list();
		const entries = current.status === "ok" ? current.entries : [];
		this.store.save([...entries, entry]);
	}
}
