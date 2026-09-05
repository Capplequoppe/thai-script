import type {
	GameCardPool,
	GameChallengeDirection,
	GameItem,
	GameItemContent,
	GameItemSource,
	GameRoundConfig,
	RandomSource,
} from "../types";
import { sampleWithoutReplacement } from "./sampling";

/**
 * Composes one `GameItemSource` per pool, samples across them, and assigns
 * each drawn item a challenge direction. Adding a pool is adding a source
 * to the array; adding weighting is supplying `weightOf` to the sample.
 */
export class GameItemSelectionService {
	constructor(private readonly sources: readonly GameItemSource[]) {}

	selectRound(
		config: Pick<GameRoundConfig, "pools" | "itemCount">,
		rng: RandomSource = Math.random,
	): GameItem[] {
		const eligible = this.eligibleContent(config.pools);
		const drawn = sampleWithoutReplacement(eligible, config.itemCount, { rng });
		return drawn.map((content) => ({
			...content,
			challengeDirection: assignDirection(content, rng),
		}));
	}

	private eligibleContent(pools: readonly GameCardPool[]): GameItemContent[] {
		return this.sources
			.filter((source) => pools.includes(source.pool))
			.flatMap((source) => source.eligibleContent());
	}
}

/**
 * An item with no audio can never be asked "hear it, write it" — there
 * would be nothing to hear — so it is always a reading challenge, and no
 * randomness is spent on it. Otherwise the direction is a 50/50 draw.
 */
function assignDirection(
	content: GameItemContent,
	rng: RandomSource,
): GameChallengeDirection {
	if (!content.audioUrl) return "reading";
	return rng() < 0.5 ? "dictation" : "reading";
}
