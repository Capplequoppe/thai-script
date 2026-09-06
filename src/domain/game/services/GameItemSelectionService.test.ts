import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import { consonants } from "../../script/data/symbols";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import realSentenceData from "../../sentence/data/sentences.json";
import { SentenceReviewCard } from "../../sentence/entities/SentenceReviewCard";
import type { SentenceEntry } from "../../sentence/types";
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
import { SentenceGameItemSource } from "./SentenceGameItemSource";
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

function sentenceContent(
	sentenceId: string,
	audioUrl?: string,
): GameItemContent {
	return {
		kind: "sentence",
		sentenceId,
		thaiText: `thai of ${sentenceId}`,
		englishMeaning: `meaning of ${sentenceId}`,
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

/** Like `vocabCard`, but with an explicit SRS history — for weighting tests. */
function vocabCardWith(
	id: string,
	promptWord: string,
	property: string,
	easeFactor: number,
	lapseCount: number,
	repetitions: number,
): VocabCard {
	return VocabCard.fromDTO({
		id,
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
		promptWord,
		property,
	});
}

function repositoryOf(
	scriptCards: readonly ScriptPropertyCard[],
	vocabCards: readonly VocabCard[],
	sentenceCards: readonly SentenceReviewCard[] = [],
): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => {
			if (pool === "script") return [...scriptCards];
			if (pool === "vocab") return [...vocabCards];
			if (pool === "sentence") return [...sentenceCards];
			return [];
		},
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

/** A `SentenceReviewCard` with an explicit SRS history — for weighting tests. */
function sentenceCardWith(
	sentenceId: string,
	property: string,
	easeFactor: number,
	lapseCount: number,
	repetitions: number,
): SentenceReviewCard {
	return SentenceReviewCard.fromDTO({
		id: `sentence:${sentenceId}:${property}`,
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
		sentenceId,
		property,
	});
}

/** Counts how many times the round asked for randomness. */
function countingSource(
	values: readonly number[],
): RandomSource & { calls: number } {
	let index = 0;
	const source = (() => {
		source.calls++;
		return values[index++ % values.length] as number;
	}) as RandomSource & { calls: number };
	source.calls = 0;
	return source;
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
			// same seed (roll 0.5 of 3 items -> index 1) would land on the
			// second item (fresh) instead, so this only passes because
			// weighting, not draw order, picked weak.
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

			// Confirms the wiring-level outcome AC5 states: weak wins, fresh
			// (never reviewed) does not out-rank it. The deeper claim — that a
			// never-reviewed item's weight ignores its own stored ease/lapse
			// fields rather than merely coming out low here by coincidence — is
			// proven directly in itemWeight.test.ts, where fresh's raw fields
			// are deliberately set to something other than the neutral case.
			const round = service.selectRound(
				{ ...SCRIPT_ONLY, itemCount: 1, prioritizeWeakItems: true },
				scripted([0.5]),
			);

			expect(round.map((item) => item.symbolCharacter)).toEqual([WEAK_SYMBOL]);
		});

		it("AC6: equal weight across all eligible items still returns the requested count, no NaN/undefined", () => {
			// Identical ease/lapse/repetitions -> identical, non-zero weight for
			// all three (itemWeight never actually reaches zero, see its own
			// tests) — this only checks that equal weights still behave like a
			// normal weighted draw: every distinct item, no NaN/undefined.
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

		it("weights vocab items too, keyed by thai word across several VocabProperty cards", () => {
			const weakEntry = vocabEntry("แมว", "/audio/maeo.mp3");
			const strongEntry = vocabEntry("หมา", "/audio/maa.mp3");
			// Two cards for the weak word (different properties): the worse of
			// the two (ease 1.3) is what should drive its weight, not the
			// better one (ease 2.9) — exercising `itemKeyOfCard`'s `VocabCard`
			// branch and `worstStats`' grouping together, neither of which any
			// other test in this file reaches.
			const cards = [
				vocabCardWith(
					"vocab:แมว:thaiToEnglish",
					"แมว",
					"thaiToEnglish",
					1.3,
					4,
					5,
				),
				vocabCardWith("vocab:แมว:spelling", "แมว", "spelling", 2.9, 0, 6),
				vocabCardWith(
					"vocab:หมา:thaiToEnglish",
					"หมา",
					"thaiToEnglish",
					2.8,
					0,
					8,
				),
			];
			const repository = repositoryOf([], cards);
			const service = new GameItemSelectionService(
				[new WordGameItemSource(repository, [weakEntry, strongEntry])],
				repository,
			);

			const round = service.selectRound(
				{ pools: ["vocab"], itemCount: 1, prioritizeWeakItems: true },
				scripted([0.5]),
			);

			expect(
				round.map((item) => (item.kind === "word" ? item.thaiWord : null)),
			).toEqual(["แมว"]);
		});
	});

	describe("sentence pool (task 1.1)", () => {
		const FIVE_SENTENCES = ["s1", "s2", "s3", "s4", "s5"].map((id) =>
			sentenceContent(id, `/audio/${id}.mp3`),
		);

		it("AC1: returns sentence items with the SentenceGameItem shape for pools including 'sentence'", () => {
			const service = new GameItemSelectionService([
				sourceOf("sentence", [
					sentenceContent("basic-001", "/audio/basic-001.mp3"),
				]),
			]);

			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: 1 },
				scripted([0.0, 0.9]),
			);

			expect(round).toEqual([
				{
					kind: "sentence",
					sentenceId: "basic-001",
					thaiText: "thai of basic-001",
					englishMeaning: "meaning of basic-001",
					audioUrl: "/audio/basic-001.mp3",
					challengeDirection: "reading",
				},
			]);
		});

		it("AC1: a Symbols + Sentence Reading round returns both kinds, and only those", () => {
			const service = new GameItemSelectionService([
				sourceOf("script", FIVE),
				sourceOf("vocab", [wordContent("unused", "/audio/unused.mp3")]),
				sourceOf("sentence", FIVE_SENTENCES),
			]);

			const round = service.selectRound(
				{ pools: ["script", "sentence"], itemCount: 10 },
				scripted([0.5]),
			);

			expect(round).toHaveLength(10);
			expect([...new Set(round.map((item) => item.kind))].sort()).toEqual([
				"sentence",
				"symbol",
			]);
		});

		it("AC1: returns only sentence items for pools:['sentence']", () => {
			const service = new GameItemSelectionService([
				sourceOf("script", FIVE),
				sourceOf("sentence", FIVE_SENTENCES),
			]);

			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: 10 },
				scripted([0.5]),
			);

			expect(round.map((item) => item.kind)).toEqual(Array(5).fill("sentence"));
		});

		it("AC3: an audio-less sentence is 'reading' and spends no randomness on its direction", () => {
			const service = new GameItemSelectionService([
				sourceOf("sentence", [sentenceContent("silent")]),
			]);
			const rng = countingSource([0.0]);

			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: 1 },
				rng,
			);

			expect(round.map((item) => item.challengeDirection)).toEqual(["reading"]);
			// Exactly one roll: the draw itself. Zero were spent assigning the
			// direction — the same rule the audio-less symbol follows.
			expect(rng.calls).toBe(1);
		});

		it("AC3: an audio-bearing sentence does spend one roll on its direction", () => {
			// The control for the case above: without it, `calls === 1` could
			// mean "the direction costs nothing" or "the draw costs nothing".
			const service = new GameItemSelectionService([
				sourceOf("sentence", [sentenceContent("loud", "/audio/loud.mp3")]),
			]);
			const rng = countingSource([0.0]);

			service.selectRound({ pools: ["sentence"], itemCount: 1 }, rng);

			expect(rng.calls).toBe(2);
		});

		it("AC3: every item from the real shipped sentences.json is assigned 'reading'", () => {
			// Not a statistical sample: today's data has no audio at all, so the
			// audio-gated rule makes "listening" unreachable. A future data drop
			// that adds audio makes this fail loudly rather than quietly
			// changing what a learner is asked to do.
			const sentences = realSentenceData as unknown as SentenceEntry[];
			expect(sentences.length).toBeGreaterThan(0);

			const cards = sentences.map((entry) =>
				sentenceCardWith(entry.id, "readingComprehension", 2.5, 0, 3),
			);
			const repository = repositoryOf([], [], cards);
			const service = new GameItemSelectionService([
				new SentenceGameItemSource(repository, sentences),
			]);

			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: sentences.length },
				scripted([0.0, 0.3, 0.6, 0.9]),
			);

			expect(round).toHaveLength(sentences.length);
			expect(
				round
					.map((item) => item.challengeDirection)
					.filter((d) => d !== "reading"),
			).toEqual([]);
		});

		it("AC4: assigns the exact sentence direction sequence a seeded source dictates", () => {
			const service = new GameItemSelectionService([
				sourceOf("sentence", FIVE_SENTENCES),
			]);

			// Draws: 0.0 of 5 -> "s1"; 0.75 of the remaining 4 -> "s5";
			// 0.5 of the remaining 3 -> "s3". Then one roll per item:
			// 0.1 < 0.5 -> listening, 0.9 -> reading, 0.49 < 0.5 -> listening.
			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: 3 },
				scripted([0.0, 0.75, 0.5, 0.1, 0.9, 0.49]),
			);

			expect(
				round.map((item) => [
					item.kind === "sentence" ? item.sentenceId : null,
					item.challengeDirection,
				]),
			).toEqual([
				["s1", "listening"],
				["s5", "reading"],
				["s3", "listening"],
			]);
		});

		it("treats a sentence with cards under several SentenceProperty values as one item", () => {
			const entry: SentenceEntry = {
				id: "basic-001",
				thai: "มา กิน กัน",
				romanization: "maa gin gan",
				english: "Come eat together",
				words: ["มา", "กิน", "กัน"],
				difficulty: 1,
				thai_audio_file: null,
				cards: { readingComprehension: { distractors: [] } },
			};
			const repository = repositoryOf(
				[],
				[],
				[
					sentenceCardWith("basic-001", "readingComprehension", 2.5, 0, 3),
					sentenceCardWith("basic-001", "listeningComprehension", 2.5, 0, 3),
				],
			);
			const service = new GameItemSelectionService([
				new SentenceGameItemSource(repository, [entry]),
			]);

			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: 5 },
				scripted([0.5]),
			);

			expect(round).toHaveLength(1);
		});

		it("AC7: weak-item weighting draws a low-ease sentence ahead of a high-ease one", () => {
			// Weak deliberately placed last, as in the symbol AC4 case above: a
			// plain uniform draw of 1 with roll 0.5 over three items lands on
			// the second, so only real weighting picks the weak sentence. This
			// is the direct proof that `itemKeyOfCard`'s new SentenceReviewCard
			// branch contributes a genuine weight rather than falling through
			// to `weightOfFor`'s neutral `?? 1`.
			const entries: SentenceEntry[] = ["strong", "fresh", "weak"].map(
				(id) => ({
					id,
					thai: `thai of ${id}`,
					romanization: id,
					english: `english of ${id}`,
					words: ["a"],
					difficulty: 1,
					thai_audio_file: null,
					cards: { readingComprehension: { distractors: [] } },
				}),
			);
			const cards = [
				sentenceCardWith("strong", "readingComprehension", 2.8, 0, 8),
				sentenceCardWith("fresh", "readingComprehension", 2.5, 0, 0),
				// Two cards for the weak sentence: the worse of the two drives
				// its weight, exercising `worstStats`' grouping by the new key.
				sentenceCardWith("weak", "readingComprehension", 1.3, 4, 5),
				sentenceCardWith("weak", "listeningComprehension", 2.9, 0, 6),
			];
			const repository = repositoryOf([], [], cards);
			const service = new GameItemSelectionService(
				[new SentenceGameItemSource(repository, entries)],
				repository,
			);

			const round = service.selectRound(
				{ pools: ["sentence"], itemCount: 1, prioritizeWeakItems: true },
				weightedSeed(),
			);

			expect(
				round.map((item) =>
					item.kind === "sentence" ? item.sentenceId : null,
				),
			).toEqual(["weak"]);
		});
	});
});

/** Like `weakStrongFixture.ts`'s own `scriptCard`, local to this file's AC6 case. */
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
