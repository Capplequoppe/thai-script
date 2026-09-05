import type {
	GameHistoryListResult,
	GameHistoryRepository,
} from "../../domain/game/ports/GameHistoryRepository";
import type { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import type {
	GameHistoryEntry,
	GameItem,
	GameRatingRecord,
	GameRoundConfig,
	GameRoundSummary,
	RandomSource,
} from "../../domain/game/types";
import type { RecallRating } from "../../domain/shared/types";

const ALL_RATINGS: readonly RecallRating[] = [1, 2, 3, 4, 5];

/** Ratings counting as "recalled" toward accuracy — Good and Easy only. */
const CORRECT_RATINGS: ReadonlySet<RecallRating> = new Set([4, 5]);

/**
 * The item's identity: a `symbolCharacter` for a symbol item, a `thaiWord`
 * for a word item — matches the dedupe key each `GameItemSource` uses (see
 * CONTEXT.md, GameRatingRecord's `itemKey` doc comment).
 */
function itemKeyOf(item: GameItem): string {
	return item.kind === "symbol" ? item.symbolCharacter : item.thaiWord;
}

/**
 * A round's ratings, as recorded so far. Every function here is a pure
 * function of the arguments it is given — no round-in-progress state ever
 * lives on this class, matching `ConductReviewUseCase`/`ReviewService`'s own
 * caller-holds-the-session convention (see CONTEXT.md). `AppContext.tsx`
 * wires this up as one long-lived singleton; a singleton holding mutable
 * per-round state would leak ratings between rounds and between mounts.
 *
 * No `CardRepository` is ever received here — only `GameItemSelectionService`
 * (which wraps it) and `GameHistoryRepository`. There is therefore no code
 * path through this use case that could ever call `CardRepository.save` or
 * `ReviewableCard.recordReview`: the SRS-isolation guarantee is structural,
 * not merely a rule nobody happens to break.
 */
export class PlayGameUseCase {
	/**
	 * Tracks which `GameRoundSummary` objects have already been persisted, so
	 * that finishing/saving the same completed round twice (a duplicate
	 * effect run, a duplicate button press) does not append a duplicate
	 * history entry. Keyed by object identity, not content: two genuinely
	 * distinct rounds that happen to produce an identical summary are still
	 * two history entries. A `WeakSet` holds no strong reference, so it
	 * never keeps a finished round's data alive past the caller's own use of
	 * it — this is bookkeeping for `saveHistory`'s own idempotency, not
	 * round-in-progress state.
	 */
	private readonly savedSummaries = new WeakSet<GameRoundSummary>();

	constructor(
		private readonly selectionService: GameItemSelectionService,
		private readonly historyRepository: GameHistoryRepository,
	) {}

	startRound(config: GameRoundConfig, rng?: RandomSource): GameItem[] {
		return this.selectionService.selectRound(config, rng);
	}

	/**
	 * Returns a new ratings array with `itemIndex`'s rating set to `rating`,
	 * overwriting any prior rating for that same index rather than appending
	 * a second record for it — recording twice for one item (a stray global
	 * keypress landing on top of a click, see CONTEXT.md) must not double-
	 * count that item in the finished summary.
	 */
	recordRating(
		items: readonly GameItem[],
		ratings: readonly GameRatingRecord[],
		itemIndex: number,
		rating: RecallRating,
	): GameRatingRecord[] {
		const item = items[itemIndex];
		if (!item) return [...ratings];

		const itemKey = itemKeyOf(item);
		const record: GameRatingRecord = {
			itemKey,
			kind: item.kind,
			challengeDirection: item.challengeDirection,
			rating,
		};

		return [...ratings.filter((r) => r.itemKey !== itemKey), record];
	}

	/**
	 * `accuracy` counts only ratings 4 (Good) and 5 (Easy) as correct — a
	 * deliberately different, stricter threshold from
	 * `ReviewService.endReviewSession`'s `rating >= 3`, and rounded half-up.
	 * `null` if and only if no rating was recorded, distinct from a rated
	 * round where none of the ratings were Good/Easy (`accuracy: 0`).
	 */
	finishRound(ratings: readonly GameRatingRecord[]): GameRoundSummary {
		const ratingCounts = ALL_RATINGS.reduce(
			(counts, value) => {
				counts[value] = ratings.filter((r) => r.rating === value).length;
				return counts;
			},
			{} as Record<RecallRating, number>,
		);

		const ratedCount = ratings.length;
		const correctCount = ratings.filter((r) =>
			CORRECT_RATINGS.has(r.rating),
		).length;
		const accuracy =
			ratedCount === 0 ? null : Math.round((correctCount / ratedCount) * 100);

		return { ratingCounts, ratedCount, accuracy };
	}

	saveHistory(
		config: Pick<GameRoundConfig, "pools" | "itemCount">,
		summary: GameRoundSummary,
	): void {
		if (this.savedSummaries.has(summary)) return;
		this.savedSummaries.add(summary);

		const entry: GameHistoryEntry = {
			id: crypto.randomUUID(),
			playedAt: new Date().toISOString(),
			pools: config.pools,
			itemCount: config.itemCount,
			summary,
		};
		this.historyRepository.save(entry);
	}

	getHistory(): GameHistoryListResult {
		return this.historyRepository.list();
	}
}
