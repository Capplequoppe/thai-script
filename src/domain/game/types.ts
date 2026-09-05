import type { CardPool } from "../shared/CardPool";
import type { RecallRating } from "../shared/types";

/**
 * The practice game draws only from the two pools that hold learnable
 * "items" a person can be quizzed on in both directions. It is an
 * `Extract` of `CardPool` rather than a separate vocabulary so the two
 * concepts never drift apart.
 */
export type GameCardPool = Extract<CardPool, "script" | "vocab">;

/** A source of randomness returning a number in `[0, 1)`. */
export type RandomSource = () => number;

/** Whether the learner writes on the canvas or on paper. */
export type GameInputMode = "draw" | "paper";

/**
 * `dictation` — hear it, write it. `reading` — see it, say it, hear the
 * reveal. Which one a given item gets is randomized per round, never
 * configured.
 */
export type SymbolChallengeDirection = "dictation" | "reading";

/**
 * `dictationTranslate` — hear the Thai word, write the Thai spelling and
 * the English meaning. `production` — see the English, write the Thai
 * spelling and say it, hear/see the reveal. Which one a given word gets is
 * randomized per round, never configured.
 */
export type WordChallengeDirection = "dictationTranslate" | "production";

export type GameChallengeDirection =
	| SymbolChallengeDirection
	| WordChallengeDirection;

/**
 * Content for one symbol, sourced from `script/data/symbols.ts` — never
 * from an individual card, whose `question`/`correctAnswer` are specific to
 * the `PropertyType` that card reviews.
 *
 * `promptText` is what a reading challenge shows (the symbol itself) and
 * what a dictation challenge reveals as the answer; `correctAnswer` is the
 * symbol's name, which reading asks for and dictation reveals alongside.
 * `symbolCharacter` is the item's identity — the key a round dedupes on.
 */
export interface SymbolItemContent {
	readonly kind: "symbol";
	readonly symbolCharacter: string;
	readonly promptText: string;
	readonly correctAnswer: string;
	readonly audioUrl?: string;
}

/**
 * Content for one vocab word, sourced from its `VocabEntry` — never from an
 * individual `VocabCard`, whose `promptWord` holds the Thai word for five
 * `VocabProperty` values but the *English* word for `englishToThai`
 * (`VocabCardGenerator.ts`), so no single card's fields are safe to read as
 * "the" Thai spelling or English meaning.
 *
 * `thaiWord` is the item's identity — the key a round dedupes on.
 */
export interface WordItemContent {
	readonly kind: "word";
	readonly thaiWord: string;
	readonly englishMeaning: string;
	readonly audioUrl?: string;
}

/** Content for one game item, before a direction has been assigned. */
export type GameItemContent = SymbolItemContent | WordItemContent;

export type SymbolGameItem = SymbolItemContent & {
	readonly challengeDirection: SymbolChallengeDirection;
};

export type WordGameItem = WordItemContent & {
	readonly challengeDirection: WordChallengeDirection;
};

/**
 * One item as it is played. A discriminated union on `kind`; phase 1's
 * `"symbol"` member and phase 2's `"word"` member are independent variants,
 * so every consumer that already narrows on `kind` is unaffected by this
 * addition.
 */
export type GameItem = SymbolGameItem | WordGameItem;

/** Supplies the eligible content for exactly one pool. */
export interface GameItemSource {
	readonly pool: GameCardPool;
	eligibleContent(): GameItemContent[];
}

export interface GameRoundConfig {
	readonly pools: readonly GameCardPool[];
	readonly itemCount: number;
	readonly prioritizeWeakItems: boolean;
	readonly inputMode: GameInputMode;
}

/** One self-assessment, for one item, in one round. */
export interface GameRatingRecord {
	/** The item's identity — a `symbolCharacter` for a symbol item. */
	readonly itemKey: string;
	readonly kind: GameItem["kind"];
	readonly challengeDirection: GameChallengeDirection;
	readonly rating: RecallRating;
}

/**
 * `accuracy` is the share of rated items the learner rated Good or Easy
 * (rating 4 or 5) — a deliberately different, stricter threshold from
 * `ReviewService.endReviewSession`'s `rating >= 3` — as an integer 0-100
 * rounded half-up, and `null` if and only if nothing in the round was rated.
 */
export interface GameRoundSummary {
	readonly ratingCounts: Readonly<Record<RecallRating, number>>;
	readonly ratedCount: number;
	readonly accuracy: number | null;
}

export interface GameHistoryEntry {
	readonly id: string;
	/** ISO 8601 timestamp. */
	readonly playedAt: string;
	readonly pools: readonly GameCardPool[];
	readonly itemCount: number;
	readonly summary: GameRoundSummary;
}
