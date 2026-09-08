/** Result of comparing two contours: the raw path-normalized distance and a 0-100 score derived from it. */
export interface DtwResult {
	readonly distance: number;
	readonly score: number;
}

/**
 * A per-step semitone distance at or above this scores 0 — two contours this
 * far apart in shape are not a tone match by any reasonable reading (e.g. a
 * rising tone attempted as a falling one). Tuned against semitone gaps
 * between this app's five tone shapes, not derived from any formal model.
 */
const DISTANCE_AT_ZERO_SCORE = 6;

/**
 * Dynamic time warping distance between two numeric sequences, using
 * absolute difference as the per-step cost. The result is normalized by the
 * warping path's length so it reads as an average per-step distance,
 * independent of either sequence's length — both inputs here are always
 * `NormalizedContour`s of the same fixed length, but this stays a general
 * comparator rather than assuming that.
 *
 * The 0-100 `score` is a straight linear falloff from that average distance:
 * 0 semitones apart scores 100, `DISTANCE_AT_ZERO_SCORE`-or-more scores 0.
 */
export function dtwScore(
	a: readonly number[],
	b: readonly number[],
): DtwResult {
	if (a.length === 0 || b.length === 0) return { distance: Infinity, score: 0 };

	const n = a.length;
	const m = b.length;
	// cost[i][j] = best cumulative distance aligning a[0..i) with b[0..j)
	const cost: number[][] = Array.from({ length: n + 1 }, () =>
		new Array<number>(m + 1).fill(Infinity),
	);
	// pathLength[i][j] = number of steps on the path achieving cost[i][j]
	const pathLength: number[][] = Array.from({ length: n + 1 }, () =>
		new Array<number>(m + 1).fill(0),
	);
	cost[0]![0] = 0;

	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			const d = Math.abs(a[i - 1]! - b[j - 1]!);
			const candidates: [number, number][] = [
				[cost[i - 1]![j]!, pathLength[i - 1]![j]!],
				[cost[i]![j - 1]!, pathLength[i]![j - 1]!],
				[cost[i - 1]![j - 1]!, pathLength[i - 1]![j - 1]!],
			];
			let best = candidates[0]!;
			for (const candidate of candidates) {
				if (candidate[0] < best[0]) best = candidate;
			}
			cost[i]![j] = best[0] + d;
			pathLength[i]![j] = best[1] + 1;
		}
	}

	const totalCost = cost[n]![m]!;
	const steps = pathLength[n]![m]!;
	const distance = steps === 0 ? 0 : totalCost / steps;
	const score = Math.max(
		0,
		Math.min(100, 100 * (1 - distance / DISTANCE_AT_ZERO_SCORE)),
	);

	return { distance, score };
}
