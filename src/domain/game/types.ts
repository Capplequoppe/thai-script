import type { CardPool } from "../shared/CardPool";
import type { RecallRating } from "../shared/types";

/**
 * The practice game draws only from the pools that hold learnable "items" a
 * person can be quizzed on in both directions. It is an `Extract` of
 * `CardPool` rather than a separate vocabulary so the two concepts never
 * drift apart.
 *
 * Growing this type does *not* on its own update every place that has to
 * know the full set: `StorageGameHistoryRepository`'s persisted-entry shape
 * guard derives its allowlist from a `Record<GameCardPool, true>` anchor
 * precisely so that adding a member here is a compile error there rather
 * than a silently stale duplicate.
 */
export type GameCardPool = Extract<CardPool, "script" | "vocab" | "sentence">;

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

/**
 * `listening` — hear the sentence, reveal the Thai text and its English.
 * `reading` — see the Thai text, say it, reveal the audio. Which one a
 * given sentence gets is randomized per round, never configured — except
 * that a sentence with no audio can only ever be `reading`
 * (`assignDirection`). Every sentence in the shipped `sentences.json` is
 * audio-less today, so `listening` is currently unreachable in practice;
 * it becomes reachable the moment sentence audio exists, with no code
 * change. See CONTEXT.md.
 */
export type SentenceChallengeDirection = "listening" | "reading";

/**
 * Tone identification is a single self-assessment — did the learner
 * correctly identify the word's whole tone pattern — never a direction
 * choice. Kept as a single-literal type, and kept on the item (never
 * omitted) so every generic consumer of `item.challengeDirection` needs no
 * special case for this kind.
 */
export type ToneChallengeDirection = "identification";

/**
 * Sentence composition is always "build the sentence from tiles" — never a
 * direction choice. Kept as a single-literal type for the same reason as
 * `ToneChallengeDirection`: every generic consumer of
 * `item.challengeDirection` needs no special case for this kind.
 */
export type CompositionChallengeDirection = "build";

export type GameChallengeDirection =
	| SymbolChallengeDirection
	| WordChallengeDirection
	| SentenceChallengeDirection
	| ToneChallengeDirection
	| CompositionChallengeDirection;

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

/**
 * Content for one sentence, sourced from its `SentenceEntry` — never from
 * an individual `SentenceReviewCard`, whose `question`/`correctAnswer` are
 * specific to the `SentenceProperty` that card reviews (a
 * `listeningComprehension` card and a `readingComprehension` card for the
 * same sentence disagree by design).
 *
 * `sentenceId` is the item's identity — the key a round dedupes on.
 */
export interface SentenceItemContent {
	readonly kind: "sentence";
	readonly sentenceId: string;
	readonly thaiText: string;
	readonly englishMeaning: string;
	readonly audioUrl?: string;
}

/**
 * Content for one tone-identification item, sourced from its `VocabEntry`
 * — never from the `toneIdentification` `VocabCard`, which is used for
 * eligibility only. Older, already-persisted cards can have
 * `VocabCard.syllables === undefined` (the field was added after such
 * cards already existed), and this content must never depend on that.
 *
 * `thaiWord` is the item's identity — the key a round dedupes on.
 */
export interface ToneItemContent {
	readonly kind: "tone";
	readonly thaiWord: string;
	readonly syllables: readonly { text: string; tone: string }[];
	readonly audioUrl?: string;
}

/** Content for one game item, before a direction has been assigned. */
export type GameItemContent =
	| SymbolItemContent
	| WordItemContent
	| SentenceItemContent
	| ToneItemContent;

/**
 * Content for one sentence-composition item, sourced from one of its
 * `GrammarEntry`'s own `examples` — never from `generateDynamicApplication`,
 * which calls `Math.random()` directly and bakes one fixed card at lesson
 * time. Deliberately **not** part of `GameItemContent`: that type is
 * exactly `GameItemSource.eligibleContent()`'s return type, and composition
 * is never produced by a `GameItemSource` (see `selectCompositionRound`) —
 * folding it in would force dead `"composition"` branches into
 * `assignDirection`/`weightOfFor`, which composition items never reach.
 *
 * No `audioUrl`: grammar examples carry no per-example audio, and a field
 * specified to always be `undefined` invites a future reader to try
 * playing it anyway.
 *
 * `grammarId` is the item's identity — the key a round dedupes on.
 */
export interface CompositionItemContent {
	readonly kind: "composition";
	readonly grammarId: string;
	readonly englishMeaning: string;
	readonly tiles: readonly string[];
	readonly correctOrder: readonly string[];
}

export type SymbolGameItem = SymbolItemContent & {
	readonly challengeDirection: SymbolChallengeDirection;
};

export type WordGameItem = WordItemContent & {
	readonly challengeDirection: WordChallengeDirection;
};

export type SentenceGameItem = SentenceItemContent & {
	readonly challengeDirection: SentenceChallengeDirection;
};

export type ToneGameItem = ToneItemContent & {
	readonly challengeDirection: ToneChallengeDirection;
};

export type CompositionGameItem = CompositionItemContent & {
	readonly challengeDirection: CompositionChallengeDirection;
};

/**
 * Every item that reaches play through the shared draw pipeline
 * (`sampleWithoutReplacement` + `assignDirection`) — one variant per
 * `GameItemContent` member, each intersecting in the direction that
 * content type's own rule assigned. `ToneGameItem` reaches this pipeline
 * through `GameItemSelectionService`'s separate tone-source constructor
 * slot, not through a pool-keyed `GameItemSource` — see `ToneGameItemSource`.
 */
export type SourcedGameItem =
	| SymbolGameItem
	| WordGameItem
	| SentenceGameItem
	| ToneGameItem;

/**
 * One item as it is played. A discriminated union on `kind`; the
 * `"symbol"`, `"word"`, `"sentence"`, `"tone"` and `"composition"` members
 * are independent variants, so every consumer that already narrows on
 * `kind` is unaffected by an addition. `CompositionGameItem` never flows
 * through the shared draw pipeline (`selectCompositionRound` builds it
 * directly) — it is added only here, not to `SourcedGameItem` or
 * `GameItemContent`.
 */
export type GameItem = SourcedGameItem | CompositionGameItem;

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
	/**
	 * Off by default. Independent of `pools` by design — tone practice
	 * draws from the same vocab words the Words pool already covers, not a
	 * distinct `CardRepository` partition, so it is combinable with any
	 * pool selection including none. See `ToneGameItemSource`.
	 */
	readonly includeTonePractice?: boolean;
}

/** One self-assessment, for one item, in one round. */
export interface GameRatingRecord {
	/**
	 * The item's identity, prefixed with `kind` (`"symbol:..."` /
	 * `"word:..."` / `"sentence:..."` / `"tone:..."`) so a symbol character
	 * can never collide with a vocab word of the same Thai text in a
	 * mixed-pool round — see `itemKeyOf` in `PlayGameUseCase.ts`.
	 */
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

interface GameHistoryEntryBase {
	readonly id: string;
	/** ISO 8601 timestamp. */
	readonly playedAt: string;
	readonly itemCount: number;
	readonly summary: GameRoundSummary;
}

/** One finished pool-mixing practice round. */
export interface PracticeHistoryEntry extends GameHistoryEntryBase {
	readonly kind: "practice";
	readonly pools: readonly GameCardPool[];
}

/**
 * One finished sentence-composition round. Carries no `pools`: composition
 * draws from currently-unlocked grammar points, which is not a
 * `GameCardPool` partition at all (see `selectCompositionRound`).
 */
export interface CompositionHistoryEntry extends GameHistoryEntryBase {
	readonly kind: "composition";
}

/**
 * A discriminated union on `kind`, and `kind` is **required** on both
 * variants. Entries persisted before this field existed are normalized to
 * `"practice"` once, on read, by `StorageGameHistoryRepository.list()` — so
 * no consumer anywhere ever sees an entry without a `kind`, and none needs
 * its own copy of that back-compat rule. An *optional* discriminant would
 * be the weak version of this: `entry.kind === "practice"` is `false` for
 * every legacy entry, which is exactly the shape a consumer gets wrong by
 * writing the natural code.
 */
export type GameHistoryEntry = PracticeHistoryEntry | CompositionHistoryEntry;

/**
 * What a caller hands `PlayGameUseCase.saveHistory`: the round-shaped half
 * of a `GameHistoryEntry`, with the use case supplying the identity and
 * timestamp. Derived from the entry types by `Omit` rather than restated,
 * so the two can never drift; and discriminated, so a caller must say which
 * kind of round it just played instead of defaulting into the practice
 * shape.
 */
export type PlayedRound =
	| Omit<PracticeHistoryEntry, "id" | "playedAt" | "summary">
	| Omit<CompositionHistoryEntry, "id" | "playedAt" | "summary">;
