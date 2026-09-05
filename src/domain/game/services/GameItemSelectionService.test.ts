import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import { consonants } from "../../script/data/symbols";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { CardPool } from "../../shared/CardPool";
import type { PropertyType } from "../../shared/types";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { VocabEntry } from "../../vocabulary/types";
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
});
