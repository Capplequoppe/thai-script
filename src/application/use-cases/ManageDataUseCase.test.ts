import { describe, expect, it, vi } from "vitest";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";
import { ManageDataUseCase } from "./ManageDataUseCase";

describe("ManageDataUseCase", () => {
	it("delegates reset to the state repo", () => {
		const stateRepo = { reset: vi.fn() };
		const useCase = new ManageDataUseCase(stateRepo as never);
		useCase.reset();
		expect(stateRepo.reset).toHaveBeenCalledTimes(1);
	});

	it("delegates exportData to the state repo", () => {
		const stateRepo = { exportData: vi.fn(() => "{}") };
		const useCase = new ManageDataUseCase(stateRepo as never);
		expect(useCase.exportData()).toBe("{}");
	});

	it("delegates importData to the state repo", () => {
		const stateRepo = { importData: vi.fn() };
		const useCase = new ManageDataUseCase(stateRepo as never);
		useCase.importData("{}");
		expect(stateRepo.importData).toHaveBeenCalledWith("{}");
	});

	it("gets and sets apprentice limits through a real repository", () => {
		const stateRepo = new StorageLearnerStateRepository(new InMemoryStorage());
		const useCase = new ManageDataUseCase(stateRepo);

		useCase.setApprenticeLimits({ general: 120, script: 40, sentence: 70 });

		expect(useCase.getApprenticeLimits()).toEqual({
			general: 120,
			script: 40,
			sentence: 70,
		});
	});
});
