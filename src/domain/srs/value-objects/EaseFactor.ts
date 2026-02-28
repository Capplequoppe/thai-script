export class EaseFactor {
	static readonly MIN = 1.3;
	static readonly MAX = 3.0;
	static readonly DEFAULT = 2.0;

	private constructor(readonly value: number) {}

	static create(value: number = EaseFactor.DEFAULT): EaseFactor {
		const clamped = Math.max(EaseFactor.MIN, Math.min(EaseFactor.MAX, value));
		return new EaseFactor(clamped);
	}

	static default(): EaseFactor {
		return new EaseFactor(EaseFactor.DEFAULT);
	}

	adjust(delta: number): EaseFactor {
		return EaseFactor.create(this.value + delta);
	}
}
