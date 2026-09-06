import { describe, expect, it } from "vitest";
import type { GameHistoryRepository } from "../../domain/game/ports/GameHistoryRepository";
import { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import { SentenceGameItemSource } from "../../domain/game/services/SentenceGameItemSource";
import { SymbolGameItemSource } from "../../domain/game/services/SymbolGameItemSource";
import { WordGameItemSource } from "../../domain/game/services/WordGameItemSource";
import type {
	GameHistoryEntry,
	GameItem,
	GameRoundConfig,
	RandomSource,
} from "../../domain/game/types";
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
	sourcesFactory?: (repo: CardRepository) => any,
) {
	const cardRepository = repositoryOf(cardsByPool);
	const sources = sourcesFactory
		? sourcesFactory(cardRepository)
		: [new SymbolGameItemSource(cardRepository)];
	const selectionService = new GameItemSelectionService(sources, cardRepository);
	const historyRepository = fakeHistoryRepository();
	const useCase = new PlayGameUseCase(selectionService, historyRepository);
	return { cardRepository, selectionService, historyRepository, useCase };
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
		useCase.saveHistory(CONFIG, summary);

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

		useCase.saveHistory({ ...CONFIG, itemCount: 2 }, summary);
		useCase.saveHistory({ ...CONFIG, itemCount: 2 }, summary);

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
		);

		expect(useCase.getHistory()).toEqual({ status: "unavailable" });
	});

	it("Task 1.2 AC1: a sentence item's itemKey is sentence:{sentenceId} and does not collide with symbol/word keys", () => {
		const symbolCards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const sentenceCards = [sentenceCard("sentence-1", "sentence-card-1")];
		const vocabCards = [vocabCard("มา", "vocab:มา:thaiToEnglish")];

		const { useCase } = setUp(
			{
				script: symbolCards,
				sentence: sentenceCards,
				vocab: vocabCards,
			},
			(cardRepository) => [
				new SymbolGameItemSource(cardRepository),
				new WordGameItemSource(
					cardRepository,
					[{ thai: "มา", english: "come", difficulty: 1 } as VocabEntry],
				),
				new SentenceGameItemSource(
					cardRepository,
					[
						{
							id: "sentence-1",
							thai: "มา กิน",
							english: "come eat",
							romanization: "maa gin",
							words: ["มา", "กิน"],
							difficulty: 1,
							thai_audio_file: null,
							cards: { readingComprehension: { distractors: [] } },
						} as SentenceEntry,
					],
				),
			],
		);

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
		let ratings: any[] = [];
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
		const symbolCards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const sentenceCards = [sentenceCard("sentence-1", "sentence-card-1")];
		const vocabCards = [vocabCard("มา", "vocab:มา:thaiToEnglish")];

		const { useCase } = setUp(
			{
				script: symbolCards,
				sentence: sentenceCards,
				vocab: vocabCards,
			},
			(cardRepository) => [
				new SymbolGameItemSource(cardRepository),
				new WordGameItemSource(
					cardRepository,
					[{ thai: "มา", english: "come", difficulty: 1 } as VocabEntry],
				),
				new SentenceGameItemSource(
					cardRepository,
					[
						{
							id: "sentence-1",
							thai: "มา กิน",
							english: "come eat",
							romanization: "maa gin",
							words: ["มา", "กิน"],
							difficulty: 1,
							thai_audio_file: null,
							cards: { readingComprehension: { distractors: [] } },
						} as SentenceEntry,
					],
				),
			],
		);

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
		const symbolCards = SYMBOLS.slice(0, 2).map((symbol, index) =>
			scriptCard(symbol.character, `card-${index}`),
		);
		const sentenceCards = [sentenceCard("sentence-1", "sentence-card-1")];
		const vocabCards = [vocabCard("มา", "vocab:มา:thaiToEnglish")];

		const { useCase } = setUp(
			{
				script: symbolCards,
				sentence: sentenceCards,
				vocab: vocabCards,
			},
			(cardRepository) => [
				new SymbolGameItemSource(cardRepository),
				new WordGameItemSource(
					cardRepository,
					[{ thai: "มา", english: "come", difficulty: 1 } as VocabEntry],
				),
				new SentenceGameItemSource(
					cardRepository,
					[
						{
							id: "sentence-1",
							thai: "มา กิน",
							english: "come eat",
							romanization: "maa gin",
							words: ["มา", "กิน"],
							difficulty: 1,
							thai_audio_file: null,
							cards: { readingComprehension: { distractors: [] } },
						} as SentenceEntry,
					],
				),
			],
		);

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
});
