import type { GameHistoryListResult } from "../../../domain/game/ports/GameHistoryRepository";
import type { GameCardPool } from "../../../domain/game/types";

interface Props {
	result: GameHistoryListResult;
}

const MAX_ENTRIES_SHOWN = 10;

const POOL_LABELS: Record<GameCardPool, string> = {
	script: "Symbols",
	vocab: "Words",
};

function poolsLabel(pools: readonly GameCardPool[]): string {
	return pools.map((pool) => POOL_LABELS[pool]).join(" + ");
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
							{poolsLabel(entry.pools)} · {entry.itemCount} items
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
