export class Accuracy {
	private constructor(readonly percentage: number) {}

	static fromCounts(correct: number, total: number): Accuracy {
		return new Accuracy(total > 0 ? Math.round((correct / total) * 100) : 0);
	}
}
