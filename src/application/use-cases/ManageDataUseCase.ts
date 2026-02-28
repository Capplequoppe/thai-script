import type { LearnerStateRepository } from "../../domain/ports/LearnerStateRepository";

export class ManageDataUseCase {
	constructor(private readonly stateRepo: LearnerStateRepository) {}

	reset(): void {
		this.stateRepo.reset();
	}

	exportData(): string {
		return this.stateRepo.exportData();
	}

	importData(json: string): void {
		this.stateRepo.importData(json);
	}
}
