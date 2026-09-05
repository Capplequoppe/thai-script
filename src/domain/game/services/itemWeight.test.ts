import { describe, expect, it } from "vitest";
import { EaseFactor } from "../../srs/value-objects/EaseFactor";
import {
	STRONG_SYMBOL,
	WEAK_STRONG_FRESH_CARDS,
	WEAK_SYMBOL,
} from "../test-fixtures/weakStrongFixture";
import { itemWeight, type ScheduleStats, worstStats } from "./itemWeight";

function statsOf(symbolCharacter: string): ScheduleStats {
	const card = WEAK_STRONG_FRESH_CARDS.find(
		(c) => c.symbolCharacter === symbolCharacter,
	);
	if (!card) throw new Error(`no fixture card for ${symbolCharacter}`);
	return {
		easeFactor: card.schedule.easeFactor.value,
		lapseCount: card.schedule.lapseCount,
		repetitions: card.schedule.repetitions,
	};
}

describe("itemWeight", () => {
	it("AC2: a lower-ease, higher-lapse item weighs strictly more than a higher-ease, lapse-free one", () => {
		const weak = itemWeight(statsOf(WEAK_SYMBOL));
		const strong = itemWeight(statsOf(STRONG_SYMBOL));

		expect(weak).toBeGreaterThan(strong);
	});

	it("AC5: a never-reviewed item gets a neutral weight, not preferred over a weak one", () => {
		const fresh = itemWeight({
			easeFactor: EaseFactor.DEFAULT,
			lapseCount: 0,
			repetitions: 0,
		});
		const weak = itemWeight(statsOf(WEAK_SYMBOL));

		expect(fresh).toBeLessThan(weak);
		// Neutral, not the minimum either — a mid-range known item's weight.
		expect(fresh).toBeGreaterThan(0);
		expect(Number.isFinite(fresh)).toBe(true);
	});

	it("AC5: a never-reviewed item ignores whatever ease/lapse values happen to be stored on it", () => {
		// repetitions === 0 must short-circuit to the neutral case regardless
		// of easeFactor/lapseCount — this is what makes the rule explicit
		// rather than an accident of a formula that happens to behave.
		const freshWithOddStoredFields = itemWeight({
			easeFactor: EaseFactor.MIN,
			lapseCount: 9,
			repetitions: 0,
		});
		const plainFresh = itemWeight({
			easeFactor: EaseFactor.DEFAULT,
			lapseCount: 0,
			repetitions: 0,
		});

		expect(freshWithOddStoredFields).toBe(plainFresh);
	});

	it("AC6: every finite weight is a positive, non-NaN number", () => {
		for (const stats of [
			statsOf(WEAK_SYMBOL),
			statsOf(STRONG_SYMBOL),
			{ easeFactor: EaseFactor.DEFAULT, lapseCount: 0, repetitions: 0 },
			{ easeFactor: EaseFactor.MAX, lapseCount: 0, repetitions: 1 },
		]) {
			const weight = itemWeight(stats);
			expect(Number.isFinite(weight)).toBe(true);
			expect(weight).toBeGreaterThan(0);
		}
	});
});

describe("worstStats", () => {
	it("picks the lowest-ease-factor entry among several cards for one item", () => {
		const cards: ScheduleStats[] = [
			{ easeFactor: 2.2, lapseCount: 0, repetitions: 4 },
			{ easeFactor: 1.4, lapseCount: 3, repetitions: 6 },
			{ easeFactor: 2.9, lapseCount: 0, repetitions: 2 },
		];

		expect(worstStats(cards)).toEqual(cards[1]);
	});

	it("returns undefined for an empty list", () => {
		expect(worstStats([])).toBeUndefined();
	});
});
