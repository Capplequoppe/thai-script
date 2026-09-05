import { describe, expect, it } from "vitest";
import type { RandomSource } from "../types";
import { normalizeRequestedCount, sampleWithoutReplacement } from "./sampling";

const ITEMS = ["A", "B", "C"] as const;

function scripted(values: readonly number[]): RandomSource {
	let index = 0;
	return () => values[index++] ?? 0;
}

/**
 * Turns a sequence of "pick the item at this index of what remains" into
 * the rng values that produce it: the midpoint of the bucket that index
 * owns.
 */
function rngForPicks(picks: readonly number[], poolSize: number): RandomSource {
	return scripted(picks.map((pick, step) => (pick + 0.5) / (poolSize - step)));
}

describe("sampleWithoutReplacement", () => {
	it("samples uniformly with no weightOf, reaching every permutation", () => {
		const permutations = new Set<string>();

		for (const first of [0, 1, 2]) {
			for (const second of [0, 1]) {
				const drawn = sampleWithoutReplacement(ITEMS, 3, {
					rng: rngForPicks([first, second, 0], ITEMS.length),
				});
				expect(drawn).toHaveLength(3);
				permutations.add(drawn.join(""));
			}
		}

		expect([...permutations].sort()).toEqual([
			"ABC",
			"ACB",
			"BAC",
			"BCA",
			"CAB",
			"CBA",
		]);
	});

	it("gives each remaining item an equal share of the random space", () => {
		const cases: ReadonlyArray<readonly [number, string]> = [
			[0, "A"],
			[0.3332, "A"],
			[0.3334, "B"],
			[0.6665, "B"],
			[0.6668, "C"],
			[0.9999, "C"],
		];

		for (const [value, expected] of cases) {
			expect(sampleWithoutReplacement(ITEMS, 1, { rng: () => value })).toEqual([
				expected,
			]);
		}
	});

	it("never draws the same item twice", () => {
		const drawn = sampleWithoutReplacement(ITEMS, 3, { rng: () => 0 });
		expect(new Set(drawn).size).toBe(3);
	});

	it("returns at most the number of items available", () => {
		expect(sampleWithoutReplacement(ITEMS, 10, { rng: () => 0 })).toHaveLength(
			3,
		);
		expect(sampleWithoutReplacement([], 5, { rng: () => 0 })).toEqual([]);
	});

	it("favours heavier items when weightOf is supplied", () => {
		const weights: Record<string, number> = { A: 1, B: 0, C: 9 };
		const drawn = sampleWithoutReplacement(ITEMS, 1, {
			weightOf: (item) => weights[item] ?? 0,
			rng: () => 0.5,
		});
		expect(drawn).toEqual(["C"]);
	});

	it("falls back to uniform when every weight is zero", () => {
		const drawn = sampleWithoutReplacement(ITEMS, 3, {
			weightOf: () => 0,
			rng: rngForPicks([2, 1, 0], ITEMS.length),
		});
		expect(drawn).toEqual(["C", "B", "A"]);
	});
});

describe("normalizeRequestedCount", () => {
	it("floors and clamps into [0, available]", () => {
		expect(normalizeRequestedCount(0, 5)).toBe(0);
		expect(normalizeRequestedCount(-1, 5)).toBe(0);
		expect(normalizeRequestedCount(2.5, 5)).toBe(2);
		expect(normalizeRequestedCount(1e9, 5)).toBe(5);
		expect(normalizeRequestedCount(Number.NaN, 5)).toBe(0);
		expect(normalizeRequestedCount(Number.POSITIVE_INFINITY, 5)).toBe(0);
	});
});
