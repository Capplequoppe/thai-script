import type {
	GameHistoryListResult,
	GameHistoryRepository,
} from "../../domain/game/ports/GameHistoryRepository";
import type { GameCardPool, GameHistoryEntry } from "../../domain/game/types";
import type { JsonShapeGuard, JsonStore } from "./JsonStore";

/**
 * Deliberately its own key, never a field on `thai-srs-state`: game history
 * is a practice log, not SRS progress, so it must survive an SRS reset and
 * stay untouched by `ManageDataUseCase.exportData()`. See CONTEXT.md.
 */
export const GAME_HISTORY_STORAGE_KEY = "thai-srs-game-history";

const GAME_CARD_POOLS: readonly GameCardPool[] = ["script", "vocab"];

function isGameCardPool(value: unknown): value is GameCardPool {
	return (
		typeof value === "string" &&
		(GAME_CARD_POOLS as readonly string[]).includes(value)
	);
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
 * Shallow shape check for one persisted `GameHistoryEntry` — enough to
 * reject a corrupt or foreign blob, not a full domain-validity check.
 */
function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
	if (value === null || typeof value !== "object") return false;
	const entry = value as Record<string, unknown>;

	return (
		typeof entry.id === "string" &&
		typeof entry.playedAt === "string" &&
		typeof entry.itemCount === "number" &&
		Array.isArray(entry.pools) &&
		entry.pools.every(isGameCardPool) &&
		hasGameRoundSummaryShape(entry.summary)
	);
}

/** Shape guard for the `JsonStore<GameHistoryEntry[]>` this repository is built over. */
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
			entries: [...result.value].sort((a, b) =>
				b.playedAt.localeCompare(a.playedAt),
			),
		};
	}

	save(entry: GameHistoryEntry): void {
		const current = this.list();
		const entries = current.status === "ok" ? current.entries : [];
		this.store.save([...entries, entry]);
	}
}
