import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import type { CardPool } from "../../domain/shared/CardPool";

export interface CardRepository {
	findById(id: string, pool: CardPool): ReviewableCard | null;
	findDue(now: string, pool: CardPool): ReviewableCard[];
	findAll(pool: CardPool): ReviewableCard[];
	save(card: ReviewableCard): void;
	saveAll(cards: ReviewableCard[]): void;
	remove(id: string, pool: CardPool): void;
}
