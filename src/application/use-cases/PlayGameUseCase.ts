import type {
	GameHistoryListResult,
	GameHistoryRepository,
} from "../../domain/game/ports/GameHistoryRepository";
import { selectCompositionRound } from "../../domain/game/services/compositionSelection";
import type { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import type {
	GameItem,
	GameRatingRecord,
	GameRoundConfig,
	GameRoundSummary,
	PlayedRound,
	RandomSource,
} from "../../domain/game/types";
import type { GrammarEntry } from "../../domain/grammar/types";
import type { RecallRating } from "../../domain/shared/types";

const ALL_RATINGS: readonly RecallRating[] = [1, 2, 3, 4, 5];

/** Ratings counting as "recalled" toward accuracy — Good and Easy only. */
const CORRECT_RATINGS: ReadonlySet<RecallRating> = new Set([4, 5]);

/**
 * The item's identity: a `symbolCharacter` for a symbol item, a `thaiWord`
 * for a word or tone item, a `sentenceId` for a sentence item — matches the
 * dedupe key each `GameItemSource`/`ToneGameItemSource` uses (see
 * CONTEXT.md, GameRatingRecord's `itemKey` doc comment). Prefixed with
 * `kind` because a mixed round draws from several pools at once, and a
 * symbol character can coincide with a vocab word's exact Thai spelling
 * (e.g. "ณ" is both a consonant and a one-character preposition) —
 * without the prefix, rating that symbol and that word as two separate
 * items in the same round would silently collapse into one record in
 * `recordRating`'s de-dupe below, undercounting the round. The same
 * reasoning is why a tone item's key is prefixed `tone:` rather than
 * `word:`, even though both hold a Thai word: a round can include a word's
 * `WordGameItem` and its `ToneGameItem` at once (task 2.2 wires
 * `includeTonePractice`), and those must rate as two separate items too.
 * A composition item's key is its `grammarId`, prefixed `composition:` —
 * mechanical exhaustiveness only; task 3.2 wires composition rounds
 * through this class's actual round-tracking.
 *
 * Exhaustive on `kind`: a new `GameItem` member must be a compile error
 * here rather than silently inheriting another kind's identity rule.
 */
function itemKeyOf(item: GameItem): string {
	switch (item.kind) {
		case "symbol":
			return `symbol:${item.symbolCharacter}`;
		case "word":
			return `word:${item.thaiWord}`;
		case "sentence":
			return `sentence:${item.sentenceId}`;
		case "tone":
			return `tone:${item.thaiWord}`;
		case "composition":
			return `composition:${item.grammarId}`;
		default: {
			const _never: never = item;
			throw new Error(`unhandled game item: ${JSON.stringify(_never)}`);
		}
	}
}

/**
 * A round's ratings, as recorded so far. Every function here is a pure
 * function of the arguments it is given — no round-in-progress state ever
 * lives on this class, matching `ConductReviewUseCase`/`ReviewService`'s own
 * caller-holds-the-session convention (see CONTEXT.md). `AppContext.tsx`
 * wires this up as one long-lived singleton; a singleton holding mutable
 * per-round state would leak ratings between rounds and between mounts.
 *
 * No `CardRepository` — and no object able to write one — is ever received
 * here: only `GameItemSelectionService` (which wraps one, read-only), a
 * `GameHistoryRepository`, and a read-only capability for unlocked grammar
 * points (a function returning data, deliberately not `GrammarService`
 * itself). There is therefore no code path through this use case that could
 * ever call `CardRepository.save` or `ReviewableCard.recordReview`: the
 * SRS-isolation guarantee is structural, not merely a rule nobody happens
 * to break.
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

	/**
	 * `unlockedGrammarPoints` is required, not optional: an optional
	 * provider makes a missed wiring site indistinguishable from "nothing is
	 * unlocked yet", which would reach a learner as a permanently empty
	 * composition mode with a green test suite. Required makes the omission
	 * a compile error at every construction site instead. It is a function,
	 * called fresh per round, because unlock status changes as the learner
	 * graduates vocabulary and learns grammar between rounds.
	 */
	constructor(
		private readonly selectionService: GameItemSelectionService,
		private readonly historyRepository: GameHistoryRepository,
		private readonly unlockedGrammarPoints: () => readonly GrammarEntry[],
	) {}

	startRound(config: GameRoundConfig, rng?: RandomSource): GameItem[] {
		return this.selectionService.selectRound(config, rng);
	}

	/**
	 * A composition round over whatever is unlocked *now*. Not a
	 * `GameRoundConfig`: composition has no pools, no input mode and no
	 * weak-item weighting to configure — only how many items to draw. The
	 * unlocked set is often tiny (frequently one entry), so a short round is
	 * expected behavior here, not a symptom (see CONTEXT.md).
	 */
	startCompositionRound(count: number, rng?: RandomSource): GameItem[] {
		return selectCompositionRound(this.unlockedGrammarPoints(), count, rng);
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

	/**
	 * `round` is discriminated on `kind`, so the caller states which kind of
	 * round it just played rather than falling into the practice shape by
	 * default — a composition round saved as a practice entry would be
	 * indistinguishable from a real one in history.
	 */
	saveHistory(round: PlayedRound, summary: GameRoundSummary): void {
		if (this.savedSummaries.has(summary)) return;
		this.savedSummaries.add(summary);

		this.historyRepository.save({
			...round,
			id: crypto.randomUUID(),
			playedAt: new Date().toISOString(),
			summary,
		});
	}

	getHistory(): GameHistoryListResult {
		return this.historyRepository.list();
	}
}
