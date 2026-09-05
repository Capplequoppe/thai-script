import type { CardRepository } from "../../ports/CardRepository";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type {
	GameCardPool,
	GameItem,
	GameItemContent,
	GameItemSource,
	GameRoundConfig,
	RandomSource,
	SymbolChallengeDirection,
	WordChallengeDirection,
} from "../types";
import { itemWeight, type ScheduleStats, worstStats } from "./itemWeight";
import { sampleWithoutReplacement } from "./sampling";

/**
 * `selectRound`'s own config shape: `GameRoundConfig`'s `prioritizeWeakItems`
 * made optional here (rather than `Pick`, which would keep it required) so
 * every caller that predates weighting — every existing test, and any
 * caller that never intends to weight — keeps compiling unchanged.
 */
type SelectRoundConfig = Pick<GameRoundConfig, "pools" | "itemCount"> & {
	readonly prioritizeWeakItems?: boolean;
};

/**
 * Composes one `GameItemSource` per pool, samples across them, and assigns
 * each drawn item a challenge direction. Adding a pool is adding a source
 * to the array; weighting (task 3.1) is supplying `weightOf` to the sample
 * when `prioritizeWeakItems` is set — no other behavior changes.
 *
 * The optional `cardRepository` is read only for weighting, directly (the
 * same `easeFactor`/`lapseCount`/`repetitions` fields
 * `ReviewService.getCriticalItems` reads) — never through `ReviewService`
 * itself, which stays a sibling over the same port, not something this
 * service chains through.
 */
export class GameItemSelectionService {
	constructor(
		private readonly sources: readonly GameItemSource[],
		private readonly cardRepository?: CardRepository,
	) {}

	selectRound(
		config: SelectRoundConfig,
		rng: RandomSource = Math.random,
	): GameItem[] {
		const eligible = this.eligibleContent(config.pools);
		const weightOf =
			config.prioritizeWeakItems && this.cardRepository
				? this.weightOfFor(config.pools)
				: undefined;
		const drawn = sampleWithoutReplacement(eligible, config.itemCount, {
			rng,
			weightOf,
		});
		return drawn.map((content) => assignDirection(content, rng));
	}

	private eligibleContent(pools: readonly GameCardPool[]): GameItemContent[] {
		return this.sources
			.filter((source) => pools.includes(source.pool))
			.flatMap((source) => source.eligibleContent());
	}

	/**
	 * One weight per item key (`itemKeyOfCard`/`itemKeyOfContent` below),
	 * built from every card across the requested pools grouped by that same
	 * key, each reduced to its worst (lowest ease factor) card's stats
	 * before scoring. An item with no matching stats (should not happen —
	 * eligibility itself requires a card) falls back to a neutral weight of
	 * `1` rather than throwing.
	 */
	private weightOfFor(
		pools: readonly GameCardPool[],
	): (content: GameItemContent) => number {
		// Every card's stats, grouped under its item's key — several cards can
		// share one key (one per PropertyType/VocabProperty), so this collects
		// them all before `worstStats` below picks the representative one.
		const statsByKey = new Map<string, ScheduleStats[]>();
		for (const pool of pools) {
			for (const card of this.cardRepository?.findAll(pool) ?? []) {
				const key = itemKeyOfCard(card);
				if (!key) continue;
				const stats: ScheduleStats = {
					easeFactor: card.schedule.easeFactor.value,
					lapseCount: card.schedule.lapseCount,
					repetitions: card.schedule.repetitions,
				};
				const list = statsByKey.get(key);
				if (list) list.push(stats);
				else statsByKey.set(key, [stats]);
			}
		}

		// One weight per key, from its worst card's stats only.
		const weightByKey = new Map<string, number>();
		for (const [key, stats] of statsByKey) {
			const worst = worstStats(stats);
			if (worst) weightByKey.set(key, itemWeight(worst));
		}

		// A key with no cached weight should be unreachable (eligibility
		// itself requires a card), but a neutral fallback is safer than a
		// throw a caller would have no reason to expect.
		return (content) => weightByKey.get(itemKeyOfContent(content)) ?? 1;
	}
}

/**
 * A card's own item key, mirroring `itemKeyOf` in `PlayGameUseCase.ts` and
 * `SymbolGameItemSource`/`WordGameItemSource`'s own eligibility grouping.
 * Duplicated rather than imported: neither source exports its dedupe key,
 * and this service's own scope does not extend to changing them.
 */
function itemKeyOfCard(card: ReviewableCard): string | null {
	if (card instanceof ScriptPropertyCard) {
		return `symbol:${card.symbolCharacter}`;
	}
	if (card instanceof VocabCard) {
		const [prefix, thai] = card.id.split(":");
		if (prefix !== "vocab" || !thai) return null;
		return `word:${thai}`;
	}
	return null;
}

function itemKeyOfContent(content: GameItemContent): string {
	return content.kind === "symbol"
		? `symbol:${content.symbolCharacter}`
		: `word:${content.thaiWord}`;
}

/**
 * An item with no audio can never be asked to hear anything — so it is
 * always assigned the direction that needs no audio (`reading` for a
 * symbol, `production` for a word), and no randomness is spent on it.
 * Otherwise the direction is a 50/50 draw.
 */
function assignDirection(
	content: GameItemContent,
	rng: RandomSource,
): GameItem {
	if (content.kind === "symbol") {
		const challengeDirection: SymbolChallengeDirection = !content.audioUrl
			? "reading"
			: rng() < 0.5
				? "dictation"
				: "reading";
		return { ...content, challengeDirection };
	}

	const challengeDirection: WordChallengeDirection = !content.audioUrl
		? "production"
		: rng() < 0.5
			? "dictationTranslate"
			: "production";
	return { ...content, challengeDirection };
}
