import type { CardRepository } from "../../domain/ports/CardRepository";
import type { CardPool } from "../../domain/shared/CardPool";
import type { SrsStage } from "../../domain/srs/value-objects/SrsStage";

export class ManageItemsUseCase {
	constructor(private readonly cardRepo: CardRepository) {}

	overrideCardStage(id: string, pool: CardPool, targetStage: SrsStage): void {
		const card = this.cardRepo.findById(id, pool);
		if (!card) return;
		card.overrideStage(targetStage);
		this.cardRepo.save(card);
	}
}
