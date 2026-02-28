export class Accuracy {
	private constructor(readonly percentage: number) {}

	static fromCounts(correct: number, total: number): Accuracy {
		return new Accuracy(total > 0 ? Math.round((correct / total) * 100) : 0);
	}

	get emoji(): string {
		if (this.percentage >= 80) return "🎉";
		if (this.percentage >= 50) return "💪";
		return "📚";
	}
}
