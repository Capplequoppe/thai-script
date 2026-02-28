import type { CardRepository } from "../../application/ports/CardRepository";
import { GrammarReviewCard } from "../../domain/grammar/entities/GrammarReviewCard";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import type { CardPool } from "../../domain/shared/CardPool";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import type { GrammarCard } from "../../grammar-types";
import type { IStorage } from "../../storage";
import type { PropertyCard } from "../../types";
import type { VocabularyCard } from "../../vocabulary-types";

type StorageCardRecord =
	| Record<string, PropertyCard>
	| Record<string, VocabularyCard>
	| Record<string, GrammarCard>;

function getCardsDict(
	state: ReturnType<IStorage["load"]>,
	pool: CardPool,
): StorageCardRecord {
	switch (pool) {
		case "script":
			return state.cards;
		case "vocab":
			return state.vocabCards;
		case "grammar":
			return state.grammarCards;
	}
}

function toDomain(pool: CardPool, _id: string, raw: unknown): ReviewableCard {
	switch (pool) {
		case "script":
			return ScriptPropertyCard.fromDTO(
				raw as ReturnType<ScriptPropertyCard["toDTO"]>,
			);
		case "vocab":
			return VocabCard.fromDTO(raw as ReturnType<VocabCard["toDTO"]>);
		case "grammar":
			return GrammarReviewCard.fromDTO(
				raw as ReturnType<GrammarReviewCard["toDTO"]>,
			);
	}
}

export class StorageCardRepository implements CardRepository {
	constructor(private readonly storage: IStorage) {}

	findById(id: string, pool: CardPool): ReviewableCard | null {
		const state = this.storage.load();
		const dict = getCardsDict(state, pool);
		const raw = dict[id];
		if (!raw) return null;
		return toDomain(pool, id, raw);
	}

	findDue(now: string, pool: CardPool): ReviewableCard[] {
		return this.findAll(pool).filter((card) => card.isDue(now));
	}

	findAll(pool: CardPool): ReviewableCard[] {
		const state = this.storage.load();
		const dict = getCardsDict(state, pool);
		return Object.entries(dict).map(([id, raw]) => toDomain(pool, id, raw));
	}

	save(card: ReviewableCard): void {
		const pool = card.pool as CardPool;
		const state = this.storage.load();
		const dto = this.toDTO(card);
		switch (pool) {
			case "script":
				state.cards[card.id] = dto as PropertyCard;
				break;
			case "vocab":
				state.vocabCards[card.id] = dto as VocabularyCard;
				break;
			case "grammar":
				state.grammarCards[card.id] = dto as GrammarCard;
				break;
		}
		this.storage.save(state);
	}

	saveAll(cards: ReviewableCard[]): void {
		if (cards.length === 0) return;
		const state = this.storage.load();
		for (const card of cards) {
			const pool = card.pool as CardPool;
			const dto = this.toDTO(card);
			switch (pool) {
				case "script":
					state.cards[card.id] = dto as PropertyCard;
					break;
				case "vocab":
					state.vocabCards[card.id] = dto as VocabularyCard;
					break;
				case "grammar":
					state.grammarCards[card.id] = dto as GrammarCard;
					break;
			}
		}
		this.storage.save(state);
	}

	remove(id: string, pool: CardPool): void {
		const state = this.storage.load();
		switch (pool) {
			case "script":
				delete state.cards[id];
				break;
			case "vocab":
				delete state.vocabCards[id];
				break;
			case "grammar":
				delete state.grammarCards[id];
				break;
		}
		this.storage.save(state);
	}

	private toDTO(
		card: ReviewableCard,
	): PropertyCard | VocabularyCard | GrammarCard {
		if (card instanceof ScriptPropertyCard) return card.toDTO() as PropertyCard;
		if (card instanceof VocabCard) return card.toDTO() as VocabularyCard;
		if (card instanceof GrammarReviewCard) return card.toDTO() as GrammarCard;
		throw new Error(`Unknown card type: ${card.pool}`);
	}
}
