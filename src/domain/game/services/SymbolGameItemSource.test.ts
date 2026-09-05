import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import { consonants } from "../../script/data/symbols";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { CardPool } from "../../shared/CardPool";
import type { PropertyType } from "../../shared/types";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { SymbolGameItemSource } from "./SymbolGameItemSource";

const SYMBOL = consonants[0] as (typeof consonants)[number];

function scriptCard(
	id: string,
	symbolCharacter: string,
	property: PropertyType,
	question: string,
	correctAnswer: string,
): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		question,
		correctAnswer,
		[correctAnswer],
		SrsSchedule.initial(),
		symbolCharacter,
		property,
		1,
		"/audio/card-specific.mp3",
	);
}

function repositoryOf(cards: readonly ReviewableCard[]): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => (pool === "script" ? [...cards] : []),
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

describe("SymbolGameItemSource", () => {
	it("takes content from symbols.ts, never from any card's own fields", () => {
		const cards = [
			scriptCard("a", SYMBOL.character, "recognition", "Q1", "A1"),
			scriptCard("b", SYMBOL.character, "class", "Q2", "A2"),
			scriptCard("c", SYMBOL.character, "initialSound", "Q3", "A3"),
		];
		const source = new SymbolGameItemSource(repositoryOf(cards));

		const content = source.eligibleContent();

		expect(content).toEqual([
			{
				kind: "symbol",
				symbolCharacter: SYMBOL.character,
				promptText: SYMBOL.character,
				correctAnswer: SYMBOL.name,
				audioUrl: SYMBOL.audioUrl,
			},
		]);

		const cardValues = cards.flatMap((card) => [
			card.question,
			card.correctAnswer,
			card.audioUrl,
		]);
		expect(cardValues).not.toContain(content[0]?.correctAnswer);
		expect(cardValues).not.toContain(content[0]?.audioUrl);
	});

	it("reports the script pool", () => {
		expect(new SymbolGameItemSource(repositoryOf([])).pool).toBe("script");
	});

	it("is empty when no script cards exist", () => {
		expect(
			new SymbolGameItemSource(repositoryOf([])).eligibleContent(),
		).toEqual([]);
	});

	it("ignores cards whose symbol is not in symbols.ts", () => {
		const source = new SymbolGameItemSource(
			repositoryOf([
				scriptCard("x", "not-a-thai-symbol", "recognition", "Q", "A"),
			]),
		);
		expect(source.eligibleContent()).toEqual([]);
	});
});
