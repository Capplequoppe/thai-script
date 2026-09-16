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
 * `reading` — see the Thai text, say it, reveal the audio. `segmentation` —
 * see the Thai text with its spaces stripped, tap to mark where the words
 * split, reveal the correct split (a pure-text exercise, independent of
 * audio). Which one a given sentence gets is randomized per round, never
 * configured — except that a sentence with no audio can never be
 * `listening` (`assignDirection`). Every sentence in the shipped
 * `sentences.json` is audio-less today, so `listening` is currently
 * unreachable in practice; it becomes reachable the moment sentence audio
 * exists, with no code change. See CONTEXT.md.
 */
export type SentenceChallengeDirection =
	| "listening"
	| "reading"
	| "segmentation";

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

/**
 * The four exercises of the tone-pairs mode, named prompt-last so the two
 * axes read as a grid: `toneFromAudio`/`audioFromTone` are the two
 * directions of the sound↔tone axis, `meaningFromAudio`/`audioFromMeaning`
 * the two of the sound↔meaning axis.
 *
 * Unlike every other kind's directions, these are not an even draw over
 * the whole set: the two `audioFrom*` exercises answer with a *clip*, so
 * every option they offer must itself have audio, while the two
 * `*FromAudio` exercises only ever play the target's own clip. A word
 * whose sound-alikes have no recordings yet can therefore be asked in two
 * of the four directions, not none — see `selectMinimalPairRound`.
 */
export type MinimalPairChallengeDirection =
	| "toneFromAudio"
	| "meaningFromAudio"
	| "audioFromMeaning"
	| "audioFromTone";

export type GameChallengeDirection =
	| SymbolChallengeDirection
	| WordChallengeDirection
	| SentenceChallengeDirection
	| ToneChallengeDirection
	| CompositionChallengeDirection
	| MinimalPairChallengeDirection;

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
 *
 * `thaiText` is space-joined between words (matching `SentenceEntry.thai`,
 * which is always exactly `words.join(" ")`) — the `segmentation` direction
 * strips those spaces for its puzzle display and splits on them for its
 * answer key, rather than this content carrying a separate word list.
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

/**
 * One choice in a tone-pairs question — the target word itself or one of
 * its sound-alikes. Every option is a real vocabulary word from the same
 * minimal-pair group, so `tones` is the group's own `thaig2p` analysis
 * (from `tone-minimal-pairs.json`, never `VocabEntry.syllables[].tone`,
 * which mis-analyses ห-นำ and clusters and so can disagree with the
 * grouping that put these words together) and `englishMeaning` is the
 * `VocabEntry`'s.
 *
 * `selectMinimalPairRound` guarantees the options of one item are
 * pairwise distinct in all three of `thaiWord`, `tones` and
 * `englishMeaning`. That is what lets every direction grade the same way
 * — `option.thaiWord === item.thaiWord` — instead of each needing its own
 * rule: a question whose options shared a tone pattern would have two
 * right answers in `toneFromAudio` while still having one in
 * `meaningFromAudio`.
 */
export interface MinimalPairOption {
	readonly thaiWord: string;
	readonly englishMeaning: string;
	readonly tones: readonly string[];
	readonly audioUrl?: string;
}

/** A `MinimalPairOption` that can be offered as a clip to pick between. */
export interface AudibleMinimalPairOption extends MinimalPairOption {
	readonly audioUrl: string;
}

/**
 * Content for one tone-pairs question, sourced from a
 * `tone-minimal-pairs.json` group intersected with the words the learner
 * has cards for — never from a card, for the same reason every other
 * content type here says so.
 *
 * `thaiWord` is both the item's identity (the key a round dedupes on) and
 * the correct answer; `options` holds it alongside its distractors, already
 * shuffled, so no consumer has to know which position is right.
 *
 * `audioUrl` is **required**, unlike every other content type's: a word
 * with no recording cannot be the subject of a listening exercise in any
 * of the four directions, so it is excluded at selection rather than
 * reaching an organism that would have nothing to play.
 *
 * Deliberately **not** part of `GameItemContent`, for exactly the reason
 * `CompositionItemContent` is not: that type is `GameItemSource.
 * eligibleContent()`'s return type, and tone pairs are never produced by a
 * `GameItemSource` — their supply is a set-level computation over
 * sound-alike groups, not a `GameCardPool` partition. Folding it in would
 * force dead `"minimalPair"` branches into `assignDirection`/`weightOfFor`.
 */
export interface MinimalPairItemContent {
	readonly kind: "minimalPair";
	/** The group's segmental key, e.g. `"kʰ aː w"` — its stable identity. */
	readonly groupKey: string;
	readonly thaiWord: string;
	readonly englishMeaning: string;
	readonly tones: readonly string[];
	readonly audioUrl: string;
	readonly options: readonly MinimalPairOption[];
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
 * A union over the direction rather than one intersection, so the
 * "every option needs its own clip" rule of the two `audioFrom*`
 * exercises is the compiler's to enforce at the organism that renders
 * those play buttons — not a comment `selectMinimalPairRound` is trusted
 * to have honoured. Narrowing on `challengeDirection` is all a consumer
 * needs to know an option's `audioUrl` is there.
 */
export type MinimalPairGameItem =
	| (MinimalPairItemContent & {
			readonly challengeDirection: "toneFromAudio" | "meaningFromAudio";
	  })
	| (MinimalPairItemContent & {
			readonly challengeDirection: "audioFromMeaning" | "audioFromTone";
			readonly options: readonly AudibleMinimalPairOption[];
	  });

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
 * `"symbol"`, `"word"`, `"sentence"`, `"tone"`, `"composition"` and
 * `"minimalPair"` members are independent variants, so every consumer that already narrows on
 * `kind` is unaffected by an addition. `CompositionGameItem` and
 * `MinimalPairGameItem` never flow through the shared draw pipeline
 * (`selectCompositionRound` / `selectMinimalPairRound` build them
 * directly) — they are added only here, not to `SourcedGameItem` or
 * `GameItemContent`.
 */
export type GameItem =
	| SourcedGameItem
	| CompositionGameItem
	| MinimalPairGameItem;

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
	 * `"word:..."` / `"sentence:..."` / `"tone:..."` /
	 * `"minimalPair:..."`) so a symbol character
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
 * One finished tone-pairs round. Carries no `pools` for the same reason a
 * composition round does not: its supply is the set of sound-alike groups
 * the learner has learned both sides of, which is not a `GameCardPool`
 * partition.
 */
export interface MinimalPairHistoryEntry extends GameHistoryEntryBase {
	readonly kind: "minimalPair";
}

/**
 * A discriminated union on `kind`, and `kind` is **required** on every
 * variant. Entries persisted before this field existed are normalized to
 * `"practice"` once, on read, by `StorageGameHistoryRepository.list()` — so
 * no consumer anywhere ever sees an entry without a `kind`, and none needs
 * its own copy of that back-compat rule. An *optional* discriminant would
 * be the weak version of this: `entry.kind === "practice"` is `false` for
 * every legacy entry, which is exactly the shape a consumer gets wrong by
 * writing the natural code.
 */
export type GameHistoryEntry =
	| PracticeHistoryEntry
	| CompositionHistoryEntry
	| MinimalPairHistoryEntry;

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
	| Omit<CompositionHistoryEntry, "id" | "playedAt" | "summary">
	| Omit<MinimalPairHistoryEntry, "id" | "playedAt" | "summary">;
