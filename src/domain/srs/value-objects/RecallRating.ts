type RawRecallRating = 1 | 2 | 3 | 4 | 5;

export class RecallRating {
	static readonly AGAIN = new RecallRating(1);
	static readonly WRONG = new RecallRating(2);
	static readonly HARD = new RecallRating(3);
	static readonly GOOD = new RecallRating(4);
	static readonly EASY = new RecallRating(5);

	private constructor(readonly value: RawRecallRating) {}

	static fromRaw(n: RawRecallRating): RecallRating {
		switch (n) {
			case 1:
				return RecallRating.AGAIN;
			case 2:
				return RecallRating.WRONG;
			case 3:
				return RecallRating.HARD;
			case 4:
				return RecallRating.GOOD;
			case 5:
				return RecallRating.EASY;
		}
	}

	static fromCorrectness(correct: boolean): RecallRating {
		return correct ? RecallRating.GOOD : RecallRating.WRONG;
	}

	get isCorrect(): boolean {
		return this.value >= 3;
	}

	get isLapse(): boolean {
		return this.value <= 2;
	}
}

export type { RawRecallRating };
