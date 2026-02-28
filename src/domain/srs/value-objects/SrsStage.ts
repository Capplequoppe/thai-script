export class SrsStage {
	static readonly APPRENTICE = new SrsStage("Apprentice");
	static readonly GURU = new SrsStage("Guru");
	static readonly MASTER = new SrsStage("Master");
	static readonly ENLIGHTENED = new SrsStage("Enlightened");
	static readonly BURNED = new SrsStage("Burned");

	// Thresholds in minutes
	static readonly GURU_THRESHOLD = 20_160; // 14 days
	static readonly MASTER_THRESHOLD = 60_480; // 42 days
	static readonly ENLIGHTENED_THRESHOLD = 120_960; // 84 days

	private constructor(readonly name: string) {}

	static fromScheduleData(
		learningStep: number | null,
		interval: number,
	): SrsStage {
		if (learningStep !== null) return SrsStage.APPRENTICE;
		if (interval >= SrsStage.ENLIGHTENED_THRESHOLD) return SrsStage.BURNED;
		if (interval >= SrsStage.MASTER_THRESHOLD) return SrsStage.ENLIGHTENED;
		if (interval >= SrsStage.GURU_THRESHOLD) return SrsStage.MASTER;
		return SrsStage.GURU;
	}

	get isBurned(): boolean {
		return this === SrsStage.BURNED;
	}

	get isApprentice(): boolean {
		return this === SrsStage.APPRENTICE;
	}

	toString(): string {
		return this.name;
	}
}
