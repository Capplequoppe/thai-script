import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import { consonants } from "../../script/data/symbols";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { CardPool } from "../../shared/CardPool";
import type { PropertyType } from "../../shared/types";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type {
	GameCardPool,
	GameItemContent,
	GameItemSource,
	RandomSource,
} from "../types";
import { GameItemSelectionService } from "./GameItemSelectionService";
import { SymbolGameItemSource } from "./SymbolGameItemSource";

function symbolContent(character: string, audioUrl?: string): GameItemContent {
	return {
		kind: "symbol",
		symbolCharacter: character,
		promptText: character,
		correctAnswer: `name of ${character}`,
		audioUrl,
	};
}

function sourceOf(
	pool: GameCardPool,
	content: readonly GameItemContent[],
): GameItemSource {
	return { pool, eligibleContent: () => [...content] };
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
});
