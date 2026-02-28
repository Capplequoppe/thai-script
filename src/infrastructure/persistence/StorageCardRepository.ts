import type { CardRepository } from "../../application/ports/CardRepository";
import { GrammarReviewCard } from "../../domain/grammar/entities/GrammarReviewCard";
import type { GrammarCard } from "../../domain/grammar/types";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import type { CardPool } from "../../domain/shared/CardPool";
import type { LearnerState, PropertyCard } from "../../domain/shared/types";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import type { VocabularyCard } from "../../domain/vocabulary/types";
import type { IStorage } from "./Storage";

function getCardsDict(
	state: LearnerState,
	pool: CardPool,
): Record<string, PropertyCard | VocabularyCard | GrammarCard> {
	switch (pool) {
		case "script":
			return state.cards;
		case "vocab":
			return state.vocabCards;
		case "grammar":
			return state.grammarCards;
	}
}

function toDomain(pool: CardPool, raw: unknown): ReviewableCard {
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

function cardToDTO(
	card: ReviewableCard,
): PropertyCard | VocabularyCard | GrammarCard {
	if (card instanceof ScriptPropertyCard) return card.toDTO() as PropertyCard;
	if (card instanceof VocabCard) return card.toDTO() as VocabularyCard;
	if (card instanceof GrammarReviewCard) return card.toDTO() as GrammarCard;
	throw new Error(`Unknown card type: ${card.pool}`);
}

export class StorageCardRepository implements CardRepository {
	constructor(private readonly storage: IStorage) {}

	findById(id: string, pool: CardPool): ReviewableCard | null {
		const state = this.storage.load();
		const dict = getCardsDict(state, pool);
		const raw = dict[id];
		if (!raw) return null;
		return toDomain(pool, raw);
	}

	findDue(now: string, pool: CardPool): ReviewableCard[] {
		return this.findAll(pool).filter((card) => card.isDue(now));
	}

	findAll(pool: CardPool): ReviewableCard[] {
		const state = this.storage.load();
		const dict = getCardsDict(state, pool);
		return Object.values(dict).map((raw) => toDomain(pool, raw));
	}

	save(card: ReviewableCard): void {
		const state = this.storage.load();
		this.assignToState(state, card);
		this.storage.save(state);
	}

	saveAll(cards: ReviewableCard[]): void {
		if (cards.length === 0) return;
		const state = this.storage.load();
		for (const card of cards) {
			this.assignToState(state, card);
		}
		this.storage.save(state);
	}

	remove(id: string, pool: CardPool): void {
		const state = this.storage.load();
		const dict = getCardsDict(state, pool);
		delete dict[id];
		this.storage.save(state);
	}

	private assignToState(state: LearnerState, card: ReviewableCard): void {
		const pool = card.pool;
		const dto = cardToDTO(card);
		getCardsDict(state, pool)[card.id] = dto;
	}
}
