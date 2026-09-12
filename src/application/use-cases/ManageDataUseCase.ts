import type { LearnerStateRepository } from "../../domain/ports/LearnerStateRepository";
import type { ApprenticeLimits } from "../../domain/shared/types";

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

	getApprenticeLimits(): ApprenticeLimits {
		return this.stateRepo.getApprenticeLimits();
	}

	setApprenticeLimits(limits: ApprenticeLimits): void {
		this.stateRepo.setApprenticeLimits(limits);
	}
}
