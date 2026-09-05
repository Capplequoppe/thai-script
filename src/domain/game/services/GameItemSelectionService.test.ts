import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import { consonants } from "../../script/data/symbols";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { CardPool } from "../../shared/CardPool";
import type { PropertyType } from "../../shared/types";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { VocabEntry } from "../../vocabulary/types";
import {
	FRESH_SYMBOL,
	STRONG_SYMBOL,
	WEAK_STRONG_FRESH_CARDS,
	WEAK_SYMBOL,
	weightedSeed,
} from "../test-fixtures/weakStrongFixture";
import type {
	GameCardPool,
	GameItemContent,
	GameItemSource,
	RandomSource,
} from "../types";
import { GameItemSelectionService } from "./GameItemSelectionService";
import { SymbolGameItemSource } from "./SymbolGameItemSource";
import { WordGameItemSource } from "./WordGameItemSource";

function symbolContent(character: string, audioUrl?: string): GameItemContent {
	return {
		kind: "symbol",
		symbolCharacter: character,
		promptText: character,
		correctAnswer: `name of ${character}`,
		audioUrl,
	};
}

function wordContent(thaiWord: string, audioUrl?: string): GameItemContent {
	return {
		kind: "word",
		thaiWord,
		englishMeaning: `meaning of ${thaiWord}`,
		audioUrl,
	};
}

function sourceOf(
	pool: GameCardPool,
	content: readonly GameItemContent[],
): GameItemSource {
	return { pool, eligibleContent: () => [...content] };
}

function vocabEntry(thai: string, audioUrl?: string): VocabEntry {
	return {
		thai,
		romanization: thai,
		word_class: "noun",
		english: `meaning of ${thai}`,
		rank: null,
		frequency: 0,
		mnemonic: null,
		characters: [...thai],
		syllables: [],
		toneRules: [],
		thai_audio_file: audioUrl ?? null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
	};
}

function vocabCard(
	id: string,
	promptWord: string,
	property: string,
): VocabCard {
	return new VocabCard(
		id,
		"question",
		"answer",
		["answer"],
		SrsSchedule.initial(),
		promptWord,
		property,
	);
}

function repositoryOf(
	scriptCards: readonly ScriptPropertyCard[],
	vocabCards: readonly VocabCard[],
): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => {
			if (pool === "script") return [...scriptCards];
			if (pool === "vocab") return [...vocabCards];
			return [];
		},
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

function scripted(values: readonly number[]): RandomSource {
	let index = 0;
	return () => values[index++ % values.length] as number;
}

const FIVE = ["1", "2", "3", "4", "5"].map((character) =>
	symbolContent(character, `/audio/${character}.mp3`),
);

const SCRIPT_ONLY = { pools: ["script"] as const };

describe("GameItemSelectionService", () => {
	it("returns exactly the requested count, one per distinct symbol", () => {
		const service = new GameItemSelectionService([sourceOf("script", FIVE)]);

		const round = service.selectRound(
			{ ...SCRIPT_ONLY, itemCount: 3 },
			// A source that always names the first of what remains: only
			// removing each drawn item keeps the three distinct.
			scripted([0.0]),
		);

		expect(round).toHaveLength(3);
		expect(new Set(round.map((item) => item.symbolCharacter)).size).toBe(3);
	});

	it("returns every eligible item when more are requested than exist", () => {
		const service = new GameItemSelectionService([sourceOf("script", FIVE)]);

		const round = service.selectRound(
			{ ...SCRIPT_ONLY, itemCount: 50 },
			scripted([0.3, 0.8, 0.1]),
		);

		expect(round).toHaveLength(5);
		expect(new Set(round.map((item) => item.symbolCharacter)).size).toBe(5);
	});

	it("returns an empty round when nothing is eligible", () => {
		const service = new GameItemSelectionService([sourceOf("script", [])]);

		expect(
			service.selectRound({ ...SCRIPT_ONLY, itemCount: 5 }, scripted([0.5])),
		).toEqual([]);
	});

	it("assigns the exact direction sequence a seeded source dictates", () => {
		const service = new GameItemSelectionService([sourceOf("script", FIVE)]);

		// Draws: 0.0 of 5 -> "1"; 0.75 of the remaining 4 -> "5";
		// 0.5 of the remaining 3 -> "3". Then one roll per item:
		// 0.1 < 0.5 -> dictation, 0.9 -> reading, 0.49 < 0.5 -> dictation.
		const round = service.selectRound(
			{ ...SCRIPT_ONLY, itemCount: 3 },
			scripted([0.0, 0.75, 0.5, 0.1, 0.9, 0.49]),
		);

		expect(
			round.map((item) => [item.symbolCharacter, item.challengeDirection]),
		).toEqual([
			["1", "dictation"],
			["5", "reading"],
			["3", "dictation"],
		]);
	});

	it("treats a symbol with cards under several properties as one item", () => {
		const character = (consonants[0] as (typeof consonants)[number]).character;
		const cards = (
			["recognition", "class", "initialSound"] as PropertyType[]
		).map(
			(property, index) =>
				new ScriptPropertyCard(
					`card-${index}`,
					`question ${index}`,
					`answer ${index}`,
					[],
					SrsSchedule.initial(),
					character,
					property,
					1,
				),
		);
		const repository: CardRepository = {
			findById: () => null,
			findDue: () => [],
			findAll: (pool: CardPool) => (pool === "script" ? [...cards] : []),
			save: () => {},
			saveAll: () => {},
			remove: () => {},
		};
		const service = new GameItemSelectionService([
			new SymbolGameItemSource(repository),
		]);

		const round = service.selectRound(
			{ ...SCRIPT_ONLY, itemCount: 3 },
			scripted([0.0, 0.5]),
		);

		expect(
			round.filter((item) => item.symbolCharacter === character),
		).toHaveLength(1);
	});

	it("never assigns dictation to a symbol with no audio", () => {
		const service = new GameItemSelectionService([
			sourceOf("script", [
				symbolContent("silent"),
				symbolContent("loud", "/audio/loud.mp3"),
			]),
		]);
		const rng = scripted([0.0, 0.13, 0.27, 0.41, 0.55, 0.68, 0.82, 0.96]);
		const directions = new Set<string>();

		for (let round = 0; round < 200; round++) {
			for (const item of service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 2 },
				rng,
			)) {
				if (item.symbolCharacter === "silent") {
					expect(item.challengeDirection).toBe("reading");
				} else {
					directions.add(item.challengeDirection);
				}
			}
		}

		// The run really did vary — otherwise "always reading" proves nothing.
		expect([...directions].sort()).toEqual(["dictation", "reading"]);
	});

	it("clamps and floors a degenerate requested count", () => {
		const service = new GameItemSelectionService([sourceOf("script", FIVE)]);
		const cases: ReadonlyArray<readonly [number, number]> = [
			[0, 0],
			[-1, 0],
			[2.5, 2],
			[Number.NaN, 0],
			[1e9, 5],
		];

		for (const [requested, expected] of cases) {
			const startedAt = Date.now();
			const round = service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: requested },
				scripted([0.2, 0.4, 0.6, 0.8]),
			);
			expect(round).toHaveLength(expected);
			expect(Date.now() - startedAt).toBeLessThan(50);
		}
	});

	it("draws only from the pools the round asks for", () => {
		const service = new GameItemSelectionService([
			sourceOf("script", FIVE),
			sourceOf("vocab", [symbolContent("unused", "/audio/unused.mp3")]),
		]);

		const round = service.selectRound(
			{ ...SCRIPT_ONLY, itemCount: 10 },
			scripted([0.5]),
		);

		expect(round.map((item) => item.symbolCharacter)).not.toContain("unused");
		expect(round).toHaveLength(5);
	});

	describe("word pool and mix (task 2.1)", () => {
		const FIVE_WORDS = ["a", "b", "c", "d", "e"].map((word) =>
			wordContent(word, `/audio/${word}.mp3`),
		);

		it("returns only script items for pools:['script']", () => {
			const service = new GameItemSelectionService([
				sourceOf("script", FIVE),
				sourceOf("vocab", FIVE_WORDS),
			]);

			const round = service.selectRound(
				{ pools: ["script"], itemCount: 10 },
				scripted([0.5]),
			);

			expect(round.map((item) => item.kind)).toEqual(Array(5).fill("symbol"));
		});

		it("returns only word items for pools:['vocab']", () => {
			const service = new GameItemSelectionService([
				sourceOf("script", FIVE),
				sourceOf("vocab", FIVE_WORDS),
			]);

			const round = service.selectRound(
				{ pools: ["vocab"], itemCount: 10 },
				scripted([0.5]),
			);

			expect(round.map((item) => item.kind)).toEqual(Array(5).fill("word"));
		});

		it("returns both kinds for pools:['script','vocab']", () => {
			const service = new GameItemSelectionService([
				sourceOf("script", FIVE),
				sourceOf("vocab", FIVE_WORDS),
			]);

			const round = service.selectRound(
				{ pools: ["script", "vocab"], itemCount: 10 },
				scripted([0.5]),
			);

			const kinds = new Set(round.map((item) => item.kind));
			expect(round).toHaveLength(10);
			expect([...kinds].sort()).toEqual(["symbol", "word"]);
		});

		it("treats a word with cards under several VocabProperty values as one item", () => {
			const entry = vocabEntry("แมว", "/audio/maeo.mp3");
			const cards = [
				vocabCard("vocab:แมว:thaiToEnglish", "แมว", "thaiToEnglish"),
				vocabCard("vocab:แมว:spelling", "แมว", "spelling"),
			];
			const repository = repositoryOf([], cards);
			const service = new GameItemSelectionService([
				new WordGameItemSource(repository, [entry]),
			]);

			const round = service.selectRound(
				{ pools: ["vocab"], itemCount: 5 },
				scripted([0.5]),
			);

			expect(round).toHaveLength(1);
		});

		it("caps a combined-pool request at the size of the only eligible pool", () => {
			const service = new GameItemSelectionService([
				sourceOf("script", []),
				sourceOf("vocab", FIVE_WORDS),
			]);

			const round = service.selectRound(
				{ pools: ["script", "vocab"], itemCount: 50 },
				scripted([0.2, 0.4, 0.6, 0.8]),
			);

			expect(round).toHaveLength(5);
			expect(round.every((item) => item.kind === "word")).toBe(true);
		});

		it("assigns the exact word direction sequence a seeded source dictates", () => {
			const service = new GameItemSelectionService([
				sourceOf("vocab", FIVE_WORDS),
			]);

			// Draws: 0.0 of 5 -> "a"; 0.75 of the remaining 4 -> "e";
			// 0.5 of the remaining 3 -> "c". Then one roll per item:
			// 0.1 < 0.5 -> dictationTranslate, 0.9 -> production,
			// 0.49 < 0.5 -> dictationTranslate.
			const round = service.selectRound(
				{ pools: ["vocab"], itemCount: 3 },
				scripted([0.0, 0.75, 0.5, 0.1, 0.9, 0.49]),
			);

			expect(round.map((item) => [item.kind, item.challengeDirection])).toEqual(
				[
					["word", "dictationTranslate"],
					["word", "production"],
					["word", "dictationTranslate"],
				],
			);
		});

		it("never assigns dictationTranslate to a word with no audio", () => {
			const service = new GameItemSelectionService([
				sourceOf("vocab", [
					wordContent("silent"),
					wordContent("loud", "/a.mp3"),
				]),
			]);
			const rng = scripted([0.0, 0.13, 0.27, 0.41, 0.55, 0.68, 0.82, 0.96]);
			const directions = new Set<string>();

			for (let round = 0; round < 200; round++) {
				for (const item of service.selectRound(
					{ pools: ["vocab"], itemCount: 2 },
					rng,
				)) {
					if (item.kind === "word" && item.thaiWord === "silent") {
						expect(item.challengeDirection).toBe("production");
					} else {
						directions.add(item.challengeDirection);
					}
				}
			}

			expect([...directions].sort()).toEqual([
				"dictationTranslate",
				"production",
			]);
		});

		it("a deterministic mixed-pool draw contains at least one of each kind", () => {
			// Two script, two vocab, requesting 3 of 4: a uniform draw without
			// replacement from an evenly-split pool of 4, taking 3, cannot come
			// up all-one-kind — this seed is a witness, not a statistical claim.
			const service = new GameItemSelectionService([
				sourceOf("script", [
					symbolContent("s1", "/audio/s1.mp3"),
					symbolContent("s2", "/audio/s2.mp3"),
				]),
				sourceOf("vocab", [
					wordContent("w1", "/audio/w1.mp3"),
					wordContent("w2", "/audio/w2.mp3"),
				]),
			]);

			const round = service.selectRound(
				{ pools: ["script", "vocab"], itemCount: 3 },
				scripted([0.0, 0.5, 0.5]),
			);

			const kinds = new Set(round.map((item) => item.kind));
			expect(round).toHaveLength(3);
			expect([...kinds].sort()).toEqual(["symbol", "word"]);
		});
	});

	describe("weighted selection (task 3.1)", () => {
		it("AC1: without prioritizeWeakItems, behaves exactly as the unweighted draw", () => {
			const repository = repositoryOf([...WEAK_STRONG_FRESH_CARDS], []);
			const withCards = new GameItemSelectionService(
				[new SymbolGameItemSource(repository)],
				repository,
			);
			const withoutCards = new GameItemSelectionService([
				new SymbolGameItemSource(repository),
			]);

			// itemCount: 1, roll: 0.75 — a roll chosen so a *weighted* draw and a
			// *uniform* draw over this fixture disagree (weighted would land on
			// the middling-weight item, uniform on the last of the three), so
			// this only passes if `prioritizeWeakItems: false` truly disables
			// weighting even when a `cardRepository` was supplied.
			const roundWithCardsButUnweighted = withCards.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 1, prioritizeWeakItems: false },
				scripted([0.75]),
			);
			const roundWithNoCardsAtAll = withoutCards.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 1 },
				scripted([0.75]),
			);

			expect(
				roundWithCardsButUnweighted.map((item) => item.symbolCharacter),
			).toEqual(roundWithNoCardsAtAll.map((item) => item.symbolCharacter));
		});

		it("AC3: a full-set request with weighting on still returns every item exactly once", () => {
			const repository = repositoryOf([...WEAK_STRONG_FRESH_CARDS], []);
			const service = new GameItemSelectionService(
				[new SymbolGameItemSource(repository)],
				repository,
			);

			const round = service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 3, prioritizeWeakItems: true },
				scripted([0.0, 0.3, 0.6, 0.9]),
			);

			expect([...round.map((item) => item.symbolCharacter)].sort()).toEqual(
				[WEAK_SYMBOL, STRONG_SYMBOL, FRESH_SYMBOL].sort(),
			);
		});

		it("AC4: with the shared seeded fixture, under-sampling returns exactly the weak item", () => {
			// Weak deliberately placed last: a plain uniform draw against this
			// same seed would land on the first item (strong) instead, so this
			// only passes because weighting, not draw order, picked weak.
			const [weak, strong, fresh] = WEAK_STRONG_FRESH_CARDS;
			const repository = repositoryOf(
				[
					strong as ScriptPropertyCard,
					fresh as ScriptPropertyCard,
					weak as ScriptPropertyCard,
				],
				[],
			);
			const service = new GameItemSelectionService(
				[new SymbolGameItemSource(repository)],
				repository,
			);

			const round = service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 1, prioritizeWeakItems: true },
				weightedSeed(),
			);

			expect(round.map((item) => item.symbolCharacter)).toEqual([WEAK_SYMBOL]);
		});

		it("AC5: a never-reviewed item is not preferred over a genuinely weak one", () => {
			const repository = repositoryOf([...WEAK_STRONG_FRESH_CARDS], []);
			const service = new GameItemSelectionService(
				[new SymbolGameItemSource(repository)],
				repository,
			);

			// A roll just past the fresh+strong share of the total weight would
			// land on fresh if fresh were scored as maximally weak; it lands on
			// weak instead, because weak alone dominates the total.
			const round = service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 1, prioritizeWeakItems: true },
				scripted([0.5]),
			);

			expect(round.map((item) => item.symbolCharacter)).toEqual([WEAK_SYMBOL]);
		});

		it("AC6: equal weight across all eligible items still returns the requested count, no NaN/undefined", () => {
			const equalCards = [
				scriptCardWith("ม", 2.5, 0, 3),
				scriptCardWith("น", 2.5, 0, 3),
				scriptCardWith("ง", 2.5, 0, 3),
			];
			const repository = repositoryOf(equalCards, []);
			const service = new GameItemSelectionService(
				[new SymbolGameItemSource(repository)],
				repository,
			);

			const round = service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 3, prioritizeWeakItems: true },
				scripted([0.1, 0.4, 0.7]),
			);

			expect(round).toHaveLength(3);
			for (const item of round) {
				expect(item.symbolCharacter).not.toBeUndefined();
				expect(Number.isNaN(item.symbolCharacter as unknown as number)).toBe(
					false,
				);
			}
			expect(new Set(round.map((item) => item.symbolCharacter)).size).toBe(3);
		});
	});
});

function scriptCardWith(
	character: string,
	easeFactor: number,
	lapseCount: number,
	repetitions: number,
): ScriptPropertyCard {
	return ScriptPropertyCard.fromDTO({
		id: `${character}-recognition`,
		question: "question",
		correctAnswer: "answer",
		choices: ["answer"],
		srs: {
			easeFactor,
			interval: 10,
			repetitions,
			learningStep: null,
			nextReviewDate: "2026-01-01T00:00:00.000Z",
			lastReviewDate: "2026-01-01T00:00:00.000Z",
			lapseCount,
		},
		symbolCharacter: character,
		property: "recognition",
		lessonNumber: 1,
	});
}
