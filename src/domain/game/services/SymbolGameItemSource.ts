import type { CardRepository } from "../../ports/CardRepository";
import {
	consonants,
	type ThaiSymbol,
	toneMarks,
	vowels,
} from "../../script/data/symbols";
import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { GameCardPool, GameItemContent, GameItemSource } from "../types";

/**
 * Cards decide eligibility; `symbols.ts` decides content. A symbol's cards
 * disagree with each other by design — they cover different reviewable
 * properties — so a card's own `question`/`correctAnswer` would make the
 * reveal nondeterministic and sometimes plain wrong (a "class" card answers
 * "low class", which is not the symbol's name).
 */
export class SymbolGameItemSource implements GameItemSource {
	readonly pool: GameCardPool = "script";

	constructor(private readonly cards: CardRepository) {}

	eligibleContent(): GameItemContent[] {
		const content: GameItemContent[] = [];
		const seen = new Set<string>();

		for (const card of this.cards.findAll("script")) {
			if (!(card instanceof ScriptPropertyCard)) continue;
			if (seen.has(card.symbolCharacter)) continue;
			seen.add(card.symbolCharacter);

			const symbol = symbolsByCharacter.get(card.symbolCharacter);
			if (!symbol) continue;

			content.push({
				kind: "symbol",
				symbolCharacter: symbol.character,
				promptText: symbol.character,
				correctAnswer: symbol.name,
				audioUrl: symbol.audioUrl,
			});
		}

		return content;
	}
}

const symbolsByCharacter: ReadonlyMap<string, ThaiSymbol> = new Map(
	[...consonants, ...vowels, ...toneMarks].map((symbol) => [
		symbol.character,
		symbol,
	]),
);
