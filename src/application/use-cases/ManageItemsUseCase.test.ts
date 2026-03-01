import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardRepository } from "../../domain/ports/CardRepository";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import { SrsSchedule } from "../../domain/srs/value-objects/SrsSchedule";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import { ManageItemsUseCase } from "./ManageItemsUseCase";

function makeScriptCard(id: string): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		"What is this?",
		"ก",
		["ก", "ข", "ค", "ง"],
		SrsSchedule.initial(),
		"ก",
		"recognition",
		1,
	);
}

function makeVocabCard(id: string): VocabCard {
	return new VocabCard(
		id,
		"What does this mean?",
		"come",
		["come", "go", "eat", "drink"],
		SrsSchedule.initial(),
		"มา",
		"thaiToEnglish",
	);
}

function createMockCardRepo(): {
	[K in keyof CardRepository]: ReturnType<typeof vi.fn>;
} {
	return {
		findById: vi.fn().mockReturnValue(null),
		findDue: vi.fn().mockReturnValue([]),
		findAll: vi.fn().mockReturnValue([]),
		save: vi.fn(),
		saveAll: vi.fn(),
		remove: vi.fn(),
	};
}

describe("ManageItemsUseCase", () => {
	let useCase: ManageItemsUseCase;
	let mockCardRepo: ReturnType<typeof createMockCardRepo>;

	beforeEach(() => {
		mockCardRepo = createMockCardRepo();
		useCase = new ManageItemsUseCase(mockCardRepo as unknown as CardRepository);
	});

	describe("overrideCardStage", () => {
		it("loads the card, applies the stage override, and saves it", () => {
			const card = makeScriptCard("script-1");
			mockCardRepo.findById.mockReturnValue(card);

			useCase.overrideCardStage("script-1", "script", SrsStage.GURU);

			expect(mockCardRepo.findById).toHaveBeenCalledWith("script-1", "script");
			expect(mockCardRepo.save).toHaveBeenCalledTimes(1);

			const savedCard = mockCardRepo.save.mock
				.calls[0][0] as ScriptPropertyCard;
			expect(savedCard.stage).toBe(SrsStage.GURU);
		});

		it("is a no-op when the card id is not found", () => {
			mockCardRepo.findById.mockReturnValue(null);

			useCase.overrideCardStage("unknown-id", "script", SrsStage.MASTER);

			expect(mockCardRepo.save).not.toHaveBeenCalled();
		});

		it("works for the script pool", () => {
			const card = makeScriptCard("script-2");
			mockCardRepo.findById.mockReturnValue(card);

			useCase.overrideCardStage("script-2", "script", SrsStage.ENLIGHTENED);

			expect(mockCardRepo.findById).toHaveBeenCalledWith("script-2", "script");
			expect(mockCardRepo.save).toHaveBeenCalledTimes(1);

			const savedCard = mockCardRepo.save.mock
				.calls[0][0] as ScriptPropertyCard;
			expect(savedCard.stage).toBe(SrsStage.ENLIGHTENED);
		});

		it("works for the vocab pool", () => {
			const card = makeVocabCard("vocab-1");
			mockCardRepo.findById.mockReturnValue(card);

			useCase.overrideCardStage("vocab-1", "vocab", SrsStage.BURNED);

			expect(mockCardRepo.findById).toHaveBeenCalledWith("vocab-1", "vocab");
			expect(mockCardRepo.save).toHaveBeenCalledTimes(1);

			const savedCard = mockCardRepo.save.mock.calls[0][0] as VocabCard;
			expect(savedCard.stage).toBe(SrsStage.BURNED);
		});
	});
});
