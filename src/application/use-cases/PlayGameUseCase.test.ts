import { describe, expect, it } from "vitest";
import type { GameHistoryRepository } from "../../domain/game/ports/GameHistoryRepository";
import { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import { SentenceGameItemSource } from "../../domain/game/services/SentenceGameItemSource";
import { SymbolGameItemSource } from "../../domain/game/services/SymbolGameItemSource";
import { ToneGameItemSource } from "../../domain/game/services/ToneGameItemSource";
import { WordGameItemSource } from "../../domain/game/services/WordGameItemSource";
import type {
	GameHistoryEntry,
	GameItem,
	GameItemSource,
	GameRoundConfig,
	RandomSource,
} from "../../domain/game/types";
import type { GrammarEntry } from "../../domain/grammar/types";
import type { CardRepository } from "../../domain/ports/CardRepository";
import { consonants } from "../../domain/script/data/symbols";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import { SentenceReviewCard } from "../../domain/sentence/entities/SentenceReviewCard";
import type { SentenceEntry } from "../../domain/sentence/types";
import type { CardPool } from "../../domain/shared/CardPool";
import type { RecallRating } from "../../domain/shared/types";
import { SrsSchedule } from "../../domain/srs/value-objects/SrsSchedule";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { PlayGameUseCase } from "./PlayGameUseCase";

const SYMBOLS = consonants.slice(0, 5) as ReadonlyArray<
	(typeof consonants)[number]
>;

function scriptCard(symbolCharacter: string, id: string): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		`question ${id}`,
		`answer ${id}`,
		[`answer ${id}`],
		SrsSchedule.initial(),
		symbolCharacter,
		"recognition",
		1,
		"/audio/card-specific.mp3",
	);
}

function sentenceCard(sentenceId: string, id: string): SentenceReviewCard {
	return new SentenceReviewCard(
		id,
		`question ${id}`,
		`answer ${id}`,
		[`answer ${id}`],
		SrsSchedule.initial(),
		sentenceId,
		"readingComprehension",
		undefined,
	);
}

function vocabCard(thai: string, id: string): VocabCard {
	return new VocabCard(
		id,
		`question ${id}`,
		`${thai}`,
		[`${thai}`],
		SrsSchedule.initial(),
		thai,
		"thaiToEnglish",
		"/audio/card-specific.mp3",
	);
}

function toneCard(
	thai: string,
	id: string,
	syllables?: { text: string; tone: string }[],
): VocabCard {
	return new VocabCard(
		id,
		`question ${id}`,
		`${thai}`,
		[`${thai}`],
		SrsSchedule.initial(),
		thai,
		"toneIdentification",
		"/audio/card-specific.mp3",
		undefined,
		syllables ?? [{ text: thai, tone: "1" }],
	);
}

interface CardsByPool {
	readonly script?: readonly ScriptPropertyCard[];
	readonly sentence?: readonly SentenceReviewCard[];
	readonly vocab?: readonly VocabCard[];
}

function repositoryOf(cardsByPool: CardsByPool): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => {
			if (pool === "script") return [...(cardsByPool.script ?? [])];
			if (pool === "sentence") return [...(cardsByPool.sentence ?? [])];
			if (pool === "vocab") return [...(cardsByPool.vocab ?? [])];
			return [];
		},
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

function fakeHistoryRepository(): GameHistoryRepository & {
	entries: GameHistoryEntry[];
} {
	const entries: GameHistoryEntry[] = [];
	return {
		entries,
		list: () => ({ status: "ok", entries: [...entries] }),
		save: (entry) => {
			entries.push(entry);
		},
	};
}

function scripted(values: readonly number[]): RandomSource {
	let index = 0;
	return () => values[index++ % values.length] as number;
}

const CONFIG: GameRoundConfig = {
	pools: ["script"],
	itemCount: 5,
	prioritizeWeakItems: false,
	inputMode: "paper",
};

function setUp(
	cardsByPool: CardsByPool = {},
	sourcesFactory?: (repo: CardRepository) => readonly GameItemSource[],
	toneSourceFactory?: (
		repo: CardRepository,
		words: readonly VocabEntry[],
	) => ToneGameItemSource,
	unlockedGrammarPoints?: () => readonly GrammarEntry[],
) {
	const cardRepository = repositoryOf(cardsByPool);
	const sources = sourcesFactory
		? sourcesFactory(cardRepository)
		: [new SymbolGameItemSource(cardRepository)];
	const toneSource = toneSourceFactory
		? toneSourceFactory(cardRepository, [])
		: undefined;
	const selectionService = new GameItemSelectionService(
		sources,
		cardRepository,
		toneSource,
	);
	const historyRepository = fakeHistoryRepository();
	const useCase = new PlayGameUseCase(
		selectionService,
		historyRepository,
		unlockedGrammarPoints ?? (() => []),
	);
	return { cardRepository, selectionService, historyRepository, useCase };
}

/**
 * A round wired over all three pools with one card/entry each — the fixture
 * shared by task 1.2's AC1-AC3, which each start from the identical
 * three-pool setup and differ only in the round they play.
 */
function setUpFullyWiredGame() {
	const symbolCards = SYMBOLS.slice(0, 2).map((symbol, index) =>
		scriptCard(symbol.character, `card-${index}`),
	);
	const sentenceCards = [sentenceCard("sentence-1", "sentence-card-1")];
	const vocabCards = [vocabCard("มา", "vocab:มา:thaiToEnglish")];
	const sentenceEntry: SentenceEntry = {
		id: "sentence-1",
		thai: "มา กิน",
		english: "come eat",
		romanization: "maa gin",
		words: ["มา", "กิน"],
		difficulty: 1,
		thai_audio_file: null,
		cards: { readingComprehension: { distractors: [] } },
	} as SentenceEntry;
	const vocabEntry = {
		thai: "มา",
		english: "come",
		difficulty: 1,
	} as VocabEntry;

	return setUp(
		{ script: symbolCards, sentence: sentenceCards, vocab: vocabCards },
		(cardRepository) => [
			new SymbolGameItemSource(cardRepository),
			new WordGameItemSource(cardRepository, [vocabEntry]),
			new SentenceGameItemSource(cardRepository, [sentenceEntry]),
		],
	);
}

function rateAll(
	useCase: PlayGameUseCase,
	items: readonly GameItem[],
	ratings: readonly RecallRating[],
) {
	return items.reduce(
		(acc, _item, index) =>
			useCase.recordRating(items, acc, index, ratings[index] as RecallRating),
		[] as ReturnType<PlayGameUseCase["recordRating"]>,
	);
}

describe("PlayGameUseCase", () => {
	it("AC1: starts a round matching what GameItemSelectionService itself would produce", () => {
		const cards = SYMBOLS.map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { selectionService, useCase } = setUp({ script: cards });
		const rng1 = scripted([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.05]);
		const rng2 = scripted([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.05]);

		const expected = selectionService.selectRound(CONFIG, rng1);
		const actual = useCase.startRound(CONFIG, rng2);

		expect(actual).toEqual(expected);
	});

	it("AC2: playing a full round leaves every underlying card's schedule untouched", () => {
		const cards = SYMBOLS.map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { cardRepository, useCase } = setUp({ script: cards });
		const before = cardRepository
			.findAll("script")
			.map((card) => card.schedule.toDTO());

		const items = useCase.startRound(
			CONFIG,
			scripted([0.1, 0.3, 0.5, 0.7, 0.9]),
		);
		expect(items).toHaveLength(5);

		const allRatings: readonly RecallRating[] = [1, 2, 3, 4, 5];
		const ratings = rateAll(useCase, items, allRatings);
		const summary = useCase.finishRound(ratings);
		useCase.saveHistory({ kind: "practice", ...CONFIG }, summary);

		const after = cardRepository
			.findAll("script")
			.map((card) => card.schedule.toDTO());
		expect(after).toEqual(before);
	});

	it("AC3: reports counts per rating and an integer accuracy rounded half-up", () => {
		const cards = SYMBOLS.map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase } = setUp({ script: cards });
		const items = useCase.startRound(
			CONFIG,
			scripted([0.1, 0.3, 0.5, 0.7, 0.9]),
		);

		const ratings = rateAll(useCase, items, [1, 2, 3, 4, 5]);
		const summary = useCase.finishRound(ratings);

		expect(summary.ratingCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
		expect(summary.ratedCount).toBe(5);
		// correct = ratings 4,5 -> 2 of 5 = 40%
		expect(summary.accuracy).toBe(40);
	});

	it("AC3b: rounds accuracy half-up on a fractional percentage", () => {
		const cards = SYMBOLS.slice(0, 3).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase } = setUp({ script: cards });
		const config: GameRoundConfig = { ...CONFIG, itemCount: 3 };
		const items = useCase.startRound(config, scripted([0.1, 0.3, 0.5]));

		// 2 of 3 correct (Good/Easy) -> 66.666...% -> rounds to 67.
		const ratings = rateAll(useCase, items, [4, 4, 1]);
		const summary = useCase.finishRound(ratings);

		expect(summary.accuracy).toBe(67);
	});

	it("AC4: two rounds on the same instance reflect only their own ratings", () => {
		const cards = SYMBOLS.map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase } = setUp({ script: cards });
		const config: GameRoundConfig = { ...CONFIG, itemCount: 2 };

		const itemsA = useCase.startRound(config, scripted([0.1, 0.6]));
		const ratingsA = rateAll(useCase, itemsA, [1, 1]);
		const summaryA = useCase.finishRound(ratingsA);

		const itemsB = useCase.startRound(config, scripted([0.2, 0.7]));
		const ratingsB = rateAll(useCase, itemsB, [5, 5]);
		const summaryB = useCase.finishRound(ratingsB);

		expect(summaryA.accuracy).toBe(0);
		expect(summaryA.ratingCounts[1]).toBe(2);
		expect(summaryB.accuracy).toBe(100);
		expect(summaryB.ratingCounts[5]).toBe(2);
	});

	it("AC5: a zero-rating round reports accuracy null, distinct from a rated 0% round", () => {
		const { useCase } = setUp({});

		const emptySummary = useCase.finishRound([]);
		expect(emptySummary.accuracy).toBeNull();
		expect(emptySummary.ratedCount).toBe(0);

		const cards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase: useCase2 } = setUp({ script: cards });
		const items = useCase2.startRound(
			{ ...CONFIG, itemCount: 2 },
			scripted([0.1, 0.6]),
		);
		const ratings = rateAll(useCase2, items, [1, 2]);
		const zeroPercentSummary = useCase2.finishRound(ratings);

		expect(zeroPercentSummary.accuracy).toBe(0);
		expect(zeroPercentSummary.ratedCount).toBe(2);
	});

	it("AC6: recording a rating twice for the same item index overwrites, never double-counts", () => {
		const cards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase } = setUp({ script: cards });
		const items = useCase.startRound(
			{ ...CONFIG, itemCount: 2 },
			scripted([0.1, 0.6]),
		);

		let ratings = useCase.recordRating(items, [], 0, 1);
		ratings = useCase.recordRating(items, ratings, 0, 5);
		const summary = useCase.finishRound(ratings);

		expect(summary.ratedCount).toBe(1);
		expect(summary.ratingCounts[1]).toBe(0);
		expect(summary.ratingCounts[5]).toBe(1);
	});

	it("AC6: finishing/saving an already-saved round twice does not duplicate history", () => {
		const cards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase, historyRepository } = setUp({ script: cards });
		const items = useCase.startRound(
			{ ...CONFIG, itemCount: 2 },
			scripted([0.1, 0.6]),
		);
		const ratings = rateAll(useCase, items, [4, 5]);
		const summary = useCase.finishRound(ratings);

		useCase.saveHistory({ kind: "practice", ...CONFIG, itemCount: 2 }, summary);
		useCase.saveHistory({ kind: "practice", ...CONFIG, itemCount: 2 }, summary);

		expect(historyRepository.entries).toHaveLength(1);

		const historyResult = useCase.getHistory();
		expect(historyResult).toEqual({
			status: "ok",
			entries: historyRepository.entries,
		});
	});

	it("getHistory forwards a failed read as unavailable, never as an empty ok list", () => {
		const failingHistoryRepository: GameHistoryRepository = {
			list: () => ({ status: "unavailable" }),
			save: () => {},
		};
		const useCase = new PlayGameUseCase(
			new GameItemSelectionService([]),
			failingHistoryRepository,
			() => [],
		);

		expect(useCase.getHistory()).toEqual({ status: "unavailable" });
	});

	it("Task 1.2 AC1: a sentence item's itemKey is sentence:{sentenceId} and does not collide with symbol/word keys", () => {
		const { useCase } = setUpFullyWiredGame();

		const items = useCase.startRound(
			{ pools: ["script", "vocab", "sentence"], itemCount: 4 },
			scripted([0.1, 0.2, 0.3, 0.4]),
		);

		// Verify we have at least one sentence item
		const sentenceItem = items.find((item) => item.kind === "sentence");
		expect(sentenceItem).toBeDefined();
		if (sentenceItem && sentenceItem.kind === "sentence") {
			expect(sentenceItem.sentenceId).toBe("sentence-1");
		}

		// Record ratings for items
		let ratings: ReturnType<PlayGameUseCase["recordRating"]> = [];
		items.forEach((_, index) => {
			ratings = useCase.recordRating(items, ratings, index, 4);
		});

		// Find the sentence rating record
		const sentenceRating = ratings.find((r) =>
			r.itemKey.startsWith("sentence:"),
		);
		expect(sentenceRating).toBeDefined();
		expect(sentenceRating?.itemKey).toBe("sentence:sentence-1");

		// Verify no collisions - all keys should be unique
		const recordedKeys = ratings.map((r) => r.itemKey);
		expect(new Set(recordedKeys).size).toBe(recordedKeys.length);
	});

	it("Task 1.2 AC2: starting a round with 'sentence' pool returns sentence items alongside symbol/word items", () => {
		const { useCase } = setUpFullyWiredGame();

		const items = useCase.startRound(
			{
				pools: ["script", "vocab", "sentence"],
				itemCount: 10,
				prioritizeWeakItems: false,
				inputMode: "paper",
			},
			scripted([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.05]),
		);

		// Verify we have items from all pools
		const kinds = new Set(items.map((item) => item.kind));
		expect(kinds).toContain("symbol");
		expect(kinds).toContain("word");
		expect(kinds).toContain("sentence");

		// Verify sentence item has correct properties
		const sentenceItem = items.find((item) => item.kind === "sentence");
		expect(sentenceItem).toBeDefined();
		if (sentenceItem && sentenceItem.kind === "sentence") {
			expect(sentenceItem.sentenceId).toBe("sentence-1");
			expect(sentenceItem.thaiText).toBe("มา กิน");
			expect(sentenceItem.englishMeaning).toBe("come eat");
			expect(sentenceItem.challengeDirection).toBe("reading"); // Because thai_audio_file is null
		}
	});

	it("Task 1.2 AC3: starting a round with only 'script' through the fully-wired service returns only symbol items", () => {
		const { useCase } = setUpFullyWiredGame();

		const items = useCase.startRound(
			{ pools: ["script"], itemCount: 2 },
			scripted([0.1, 0.3]),
		);

		// Verify only symbol items are returned
		expect(items).toHaveLength(2);
		items.forEach((item) => {
			expect(item.kind).toBe("symbol");
		});
	});

	it("Task 2.2 AC1: a tone item's itemKey is tone:{thaiWord} and does not collide with word item keys", () => {
		const thaiWord = "มา";
		const vocabEntry: VocabEntry = {
			thai: thaiWord,
			english: "come",
			difficulty: 1,
			syllables: [{ text: "มา", tone: "2" }],
		} as VocabEntry;

		const wordCards = [vocabCard(thaiWord, `vocab:${thaiWord}:thaiToEnglish`)];
		const toneCards = [
			toneCard(thaiWord, `vocab:${thaiWord}:toneIdentification`, [
				{ text: "มา", tone: "2" },
			]),
		];

		const { useCase } = setUp(
			{ vocab: [...wordCards, ...toneCards] },
			(cardRepository) => [
				new WordGameItemSource(cardRepository, [vocabEntry]),
			],
			(cardRepository, _words) =>
				new ToneGameItemSource(cardRepository, [vocabEntry]),
		);

		const items = useCase.startRound(
			{
				pools: ["vocab"],
				itemCount: 10,
				prioritizeWeakItems: false,
				inputMode: "paper",
				includeTonePractice: true,
			},
			scripted([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.05]),
		);

		// Verify we have both word and tone items
		const wordItem = items.find((item) => item.kind === "word");
		const toneItem = items.find((item) => item.kind === "tone");
		expect(wordItem).toBeDefined();
		expect(toneItem).toBeDefined();

		// Record ratings for all items
		let ratings: ReturnType<PlayGameUseCase["recordRating"]> = [];
		items.forEach((_, index) => {
			ratings = useCase.recordRating(items, ratings, index, 4);
		});

		// Verify tone and word items have different keys and don't collide
		const wordRating = ratings.find((r) => r.kind === "word");
		const toneRating = ratings.find((r) => r.kind === "tone");

		expect(wordRating?.itemKey).toBe(`word:${thaiWord}`);
		expect(toneRating?.itemKey).toBe(`tone:${thaiWord}`);
		expect(wordRating?.itemKey).not.toBe(toneRating?.itemKey);

		// Verify all keys are unique
		const recordedKeys = ratings.map((r) => r.itemKey);
		expect(new Set(recordedKeys).size).toBe(recordedKeys.length);
	});

	it("Task 2.2 AC2: with pools: ['script'] and includeTonePractice: true, tone items still appear even though 'vocab' is not in pools", () => {
		const thaiWord = "มา";
		const vocabEntry: VocabEntry = {
			thai: thaiWord,
			english: "come",
			difficulty: 1,
			syllables: [{ text: "มา", tone: "2" }],
		} as VocabEntry;

		const symbolCards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const toneCards = [
			toneCard(thaiWord, `vocab:${thaiWord}:toneIdentification`, [
				{ text: "มา", tone: "2" },
			]),
		];

		const { useCase } = setUp(
			{ script: symbolCards, vocab: toneCards },
			(cardRepository) => [new SymbolGameItemSource(cardRepository)],
			(cardRepository, _words) =>
				new ToneGameItemSource(cardRepository, [vocabEntry]),
		);

		// Request tone practice with only "script" pool, not "vocab"
		const items = useCase.startRound(
			{
				pools: ["script"],
				itemCount: 5,
				prioritizeWeakItems: false,
				inputMode: "paper",
				includeTonePractice: true,
			},
			scripted([0.1, 0.2, 0.3, 0.4, 0.5]),
		);

		// Verify we have both symbol and tone items
		const kinds = new Set(items.map((item) => item.kind));
		expect(kinds).toContain("symbol");
		expect(kinds).toContain("tone");

		// Verify at least one tone item exists
		const toneItem = items.find((item) => item.kind === "tone");
		expect(toneItem).toBeDefined();
		if (toneItem && toneItem.kind === "tone") {
			expect(toneItem.thaiWord).toBe(thaiWord);
			expect(toneItem.challengeDirection).toBe("identification");
		}
	});
});

/**
 * One grammar entry with a single, fully-glossed example — the shape
 * `selectCompositionRound` builds a composition item from.
 */
function grammarEntry(
	id: string,
	english: string,
	words: readonly string[],
): GrammarEntry {
	return {
		id,
		title: `title ${id}`,
		explanation: "explanation",
		pattern: "pattern",
		lessonNumber: 1,
		prerequisites: { minVocabByClass: {} },
		examples: [
			{
				thai: words.join(""),
				romanization: "romanization",
				english,
				words: words.map((thai) => ({ thai, gloss: `gloss ${thai}` })),
			},
		],
		cards: {
			recognition: { question: "q", correctAnswer: "a", distractors: [] },
			application: { question: "q", correctExample: 0, incorrectExamples: [] },
		},
	};
}

const GRAMMAR_FIXTURE: readonly GrammarEntry[] = [
	grammarEntry("grammar-eat", "I eat rice", ["ผม", "กิน", "ข้าว"]),
	grammarEntry("grammar-go", "He goes", ["เขา", "ไป"]),
];

/**
 * The rng consumed by `selectCompositionRound` over `GRAMMAR_FIXTURE`, in
 * order: three draws shuffling the first entry's tiles, two shuffling the
 * second's, then two choosing the round's items out of the two candidates.
 */
const COMPOSITION_SEED = [0.9, 0.0, 0.0, 0.5, 0.0, 0.6, 0.0];

describe("PlayGameUseCase composition rounds", () => {
	it("Task 3.2 AC2: startCompositionRound returns exactly this round for this fixture and seed", () => {
		const { useCase } = setUp({}, undefined, undefined, () => GRAMMAR_FIXTURE);

		const items = useCase.startCompositionRound(2, scripted(COMPOSITION_SEED));

		// Asserted as a literal, not against a second call to
		// `selectCompositionRound`: a delegation-mirroring assertion passes
		// for a broken wrapper as long as both sides share the bug.
		expect(items).toEqual([
			{
				kind: "composition",
				grammarId: "grammar-go",
				englishMeaning: "He goes",
				tiles: ["ไป", "เขา"],
				correctOrder: ["เขา", "ไป"],
				challengeDirection: "build",
			},
			{
				kind: "composition",
				grammarId: "grammar-eat",
				englishMeaning: "I eat rice",
				tiles: ["ข้าว", "ผม", "กิน"],
				correctOrder: ["ผม", "กิน", "ข้าว"],
				challengeDirection: "build",
			},
		]);
	});

	it("Task 3.2 AC2b: each round re-reads the unlocked grammar points", () => {
		let unlocked: readonly GrammarEntry[] = [];
		const { useCase } = setUp({}, undefined, undefined, () => unlocked);

		expect(useCase.startCompositionRound(2, scripted([0]))).toEqual([]);

		unlocked = GRAMMAR_FIXTURE;
		expect(
			useCase
				.startCompositionRound(2, scripted(COMPOSITION_SEED))
				.map((item) => (item.kind === "composition" ? item.grammarId : null)),
		).toEqual(["grammar-go", "grammar-eat"]);
	});

	it("Task 3.2 AC1: a composition item's itemKey is its grammarId prefixed composition", () => {
		const { useCase } = setUp({}, undefined, undefined, () => GRAMMAR_FIXTURE);
		const items = useCase.startCompositionRound(2, scripted(COMPOSITION_SEED));

		const ratings = rateAll(useCase, items, [5, 3]);

		expect(ratings.map((record) => record.itemKey)).toEqual([
			"composition:grammar-go",
			"composition:grammar-eat",
		]);
		expect(ratings.every((record) => record.kind === "composition")).toBe(true);
	});

	it("Task 3.2 AC5: a practice round and a composition round on one instance each save their own entry", () => {
		const cards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const { useCase, historyRepository } = setUp(
			{ script: cards },
			undefined,
			undefined,
			() => GRAMMAR_FIXTURE,
		);

		const practiceItems = useCase.startRound(
			{ ...CONFIG, itemCount: 2 },
			scripted([0.1, 0.6]),
		);
		const practiceSummary = useCase.finishRound(
			rateAll(useCase, practiceItems, [4, 5]),
		);
		useCase.saveHistory(
			{ kind: "practice", pools: ["script"], itemCount: practiceItems.length },
			practiceSummary,
		);

		const compositionItems = useCase.startCompositionRound(
			2,
			scripted(COMPOSITION_SEED),
		);
		const compositionSummary = useCase.finishRound(
			rateAll(useCase, compositionItems, [2, 3]),
		);
		useCase.saveHistory(
			{ kind: "composition", itemCount: compositionItems.length },
			compositionSummary,
		);

		expect(historyRepository.entries).toHaveLength(2);
		const [practiceEntry, compositionEntry] = historyRepository.entries;

		expect(practiceEntry).toMatchObject({
			kind: "practice",
			pools: ["script"],
			itemCount: 2,
			summary: practiceSummary,
		});
		expect(compositionEntry).toMatchObject({
			kind: "composition",
			itemCount: 2,
			summary: compositionSummary,
		});
		expect(compositionEntry && "pools" in compositionEntry).toBe(false);
		expect(practiceEntry?.id).not.toBe(compositionEntry?.id);
	});
});
