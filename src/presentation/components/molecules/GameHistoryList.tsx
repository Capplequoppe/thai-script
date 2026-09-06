import type { GameHistoryListResult } from "../../../domain/game/ports/GameHistoryRepository";
import type {
	GameCardPool,
	GameHistoryEntry,
} from "../../../domain/game/types";

interface Props {
	result: GameHistoryListResult;
}

const MAX_ENTRIES_SHOWN = 10;

const POOL_LABELS: Record<GameCardPool, string> = {
	script: "Symbols",
	vocab: "Words",
	sentence: "Sentence Reading",
};

/**
 * A history entry written by a shipped phase 1 predates the `pools` field
 * entirely — `undefined` at runtime despite `GameHistoryEntry.pools` being
 * typed as required, since nothing re-validates an already-persisted blob
 * on this read path. Phase 1 only ever offered the script pool, so that is
 * the accurate fallback label, never the string `"undefined"`.
 *
 * A present-but-empty `pools` array is a *different*, equally legitimate
 * case introduced by phase 2: `GamePage` lets a round start with no pool
 * checked as long as Tone Identification is on (see its AC6), so `pools:
 * []` is exactly what a tone-only round persists — never a legacy entry,
 * since a legacy entry lacks the field rather than having it empty. It
 * must not fall into the same fallback as the legacy `undefined` case,
 * which would mislabel a real tone-only round as "Symbols".
 */
function poolsLabel(pools: readonly GameCardPool[] | undefined): string {
	if (!pools) return POOL_LABELS.script;
	if (pools.length === 0) return "Tone Identification";
	return pools.map((pool) => POOL_LABELS[pool]).join(" + ");
}

/**
 * `entry.kind` is always present here — `StorageGameHistoryRepository`
 * normalizes entries persisted before the field existed on read (see
 * `GameHistoryEntry`) — so no legacy-`kind` branch belongs in this
 * component. Composition rounds carry no `pools` and get their own label,
 * deliberately distinct from every pool label above.
 */
function entryLabel(entry: GameHistoryEntry): string {
	if (entry.kind === "composition") return "Sentence Composition";
	return poolsLabel(entry.pools);
}

/**
 * Renders `PlayGameUseCase.getHistory()`'s three states distinctly. A
 * corrupt read ("unavailable") must never collapse into "no games played
 * yet" — the stored blob is externally editable, and hiding a failed read
 * behind an empty state would silently discard the difference.
 */
export function GameHistoryList({ result }: Props) {
	if (result.status === "unavailable") {
		return (
			<p className="text-sm" style={{ color: "var(--color-danger)" }}>
				Game history is unavailable — the stored history could not be read.
			</p>
		);
	}

	if (result.entries.length === 0) {
		return (
			<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
				No games played yet.
			</p>
		);
	}

	return (
		<ul className="space-y-2">
			{result.entries.slice(0, MAX_ENTRIES_SHOWN).map((entry) => (
				<li
					key={entry.id}
					className="rounded-xl p-3 flex items-center justify-between gap-3"
					style={{
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
					}}
				>
					<div>
						<div
							className="text-sm font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							{entryLabel(entry)} · {entry.itemCount} items
						</div>
						<div
							className="text-xs mt-0.5"
							style={{ color: "var(--color-text-muted)" }}
						>
							{new Date(entry.playedAt).toLocaleDateString()}
						</div>
					</div>
					<div
						className="text-lg font-bold"
						style={{ color: "var(--color-primary)" }}
					>
						{entry.summary.accuracy === null
							? "—"
							: `${entry.summary.accuracy}%`}
					</div>
				</li>
			))}
		</ul>
	);
}
