import type { GameHistoryEntry } from "../types";

/**
 * Reading history is three-state, never a bare array: the stored blob is
 * externally editable, so a corrupt read must stay distinguishable from
 * "no games played yet" all the way to the UI.
 *
 * Every returned entry has a `kind`. An implementation over a store that
 * predates that field normalizes it on read (see
 * `StorageGameHistoryRepository.list()`); a consumer of this port never
 * needs its own back-compat rule.
 */
export type GameHistoryListResult =
	| { readonly status: "ok"; readonly entries: readonly GameHistoryEntry[] }
	| { readonly status: "unavailable" };

export interface GameHistoryRepository {
	list(): GameHistoryListResult;
	save(entry: GameHistoryEntry): void;
}
