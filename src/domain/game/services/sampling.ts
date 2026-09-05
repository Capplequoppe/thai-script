import type { RandomSource } from "../types";

export interface SampleOptions<T> {
	/**
	 * Relative likelihood of each item. Omitted means uniform. Weights that
	 * are not finite positive numbers count as zero; if every remaining
	 * weight is zero the draw falls back to uniform, so a bad weight
	 * function can never make a round come up short.
	 */
	weightOf?: (item: T) => number;
	rng?: RandomSource;
}

/**
 * The one rule for a requested item count, shared by every caller: floor
 * it, then clamp it into `[0, available]`. A non-finite request (`NaN`,
 * `Infinity`) is zero. No request can ever produce a loop or an allocation
 * larger than `available`.
 */
export function normalizeRequestedCount(
	requested: number,
	available: number,
): number {
	if (!Number.isFinite(requested)) return 0;
	return Math.max(0, Math.min(Math.floor(requested), Math.max(0, available)));
}

/**
 * Draws up to `count` distinct items, in draw order. Each draw removes the
 * chosen item from the remaining pool, so no item can appear twice.
 */
export function sampleWithoutReplacement<T>(
	items: readonly T[],
	count: number,
	options: SampleOptions<T> = {},
): T[] {
	const rng = options.rng ?? Math.random;
	const remaining = [...items];
	const wanted = normalizeRequestedCount(count, remaining.length);
	const drawn: T[] = [];

	while (drawn.length < wanted) {
		const index = options.weightOf
			? weightedIndex(remaining, options.weightOf, rng)
			: uniformIndex(remaining.length, rng);
		drawn.push(remaining[index] as T);
		remaining.splice(index, 1);
	}

	return drawn;
}

function uniformIndex(length: number, rng: RandomSource): number {
	return Math.floor(roll(rng) * length);
}

function weightedIndex<T>(
	items: readonly T[],
	weightOf: (item: T) => number,
	rng: RandomSource,
): number {
	const weights = items.map((item) => sanitizeWeight(weightOf(item)));
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	if (total <= 0) return uniformIndex(items.length, rng);

	let threshold = roll(rng) * total;
	for (let index = 0; index < weights.length; index++) {
		threshold -= weights[index] as number;
		if (threshold < 0) return index;
	}
	return items.length - 1;
}

function sanitizeWeight(weight: number): number {
	return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

/** Tolerates a `RandomSource` that strays outside `[0, 1)`. */
function roll(rng: RandomSource): number {
	const value = rng();
	if (!Number.isFinite(value)) return 0;
	return Math.min(Math.max(value, 0), 0.999999999);
}
