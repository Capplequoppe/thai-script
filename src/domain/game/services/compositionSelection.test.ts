import { describe, expect, it } from "vitest";
import type { GrammarEntry } from "../../grammar/types";
import type { RandomSource } from "../types";
import { selectCompositionRound } from "./compositionSelection";

function scripted(values: readonly number[]): RandomSource {
	let index = 0;
	return () => values[index++] ?? 0;
}

/**
 * Turns a sequence of "pick the item at this index of what remains" into
 * the rng values that produce it — same helper as `sampling.test.ts`.
 */
function rngForPicks(picks: readonly number[], poolSize: number): RandomSource {
	return scripted(picks.map((pick, step) => (pick + 0.5) / (poolSize - step)));
}

function entry(overrides: Partial<GrammarEntry> = {}): GrammarEntry {
	return {
		id: "grammar-1",
		title: "Title",
		explanation: "Explanation",
		pattern: "Pattern",
		lessonNumber: 1,
		prerequisites: { minVocabByClass: {} },
		examples: [
			{
				thai: "ผมกินข้าว",
				romanization: "phom kin khao",
				english: "I eat rice",
				words: [
					{ thai: "ผม", gloss: "I" },
					{ thai: "กิน", gloss: "eat" },
					{ thai: "ข้าว", gloss: "rice" },
				],
			},
		],
		cards: {
			recognition: {
				question: "q",
				correctAnswer: "a",
				distractors: [],
			},
			application: {
				question: "q",
				correctExample: 0,
				incorrectExamples: [],
			},
		},
		...overrides,
	};
}

describe("selectCompositionRound", () => {
	it("produces tiles that are a permutation of the canonical example's words (AC1)", () => {
		const [item] = selectCompositionRound([entry()], 1);

		expect(item?.correctOrder).toEqual(["ผม", "กิน", "ข้าว"]);
		expect([...(item?.tiles ?? [])].sort()).toEqual(
			[...(item?.correctOrder ?? [])].sort(),
		);
		expect(item?.englishMeaning).toBe("I eat rice");
		expect(item?.grammarId).toBe("grammar-1");
		expect(item?.kind).toBe("composition");
		expect(item?.challengeDirection).toBe("build");
	});

	it("falls back to a later example when the canonical one has no words (AC2)", () => {
		const withFallback = entry({
			examples: [
				{
					thai: "no breakdown here",
					romanization: "r",
					english: "no breakdown",
				},
				{
					thai: "มีคำแปล",
					romanization: "r2",
					english: "has a breakdown",
					words: [
						{ thai: "มี", gloss: "has" },
						{ thai: "คำแปล", gloss: "a breakdown" },
					],
				},
			],
			cards: {
				recognition: { question: "q", correctAnswer: "a", distractors: [] },
				application: {
					question: "q",
					correctExample: 0,
					incorrectExamples: [],
				},
			},
		});

		const [item] = selectCompositionRound([withFallback], 1);

		expect(item?.correctOrder).toEqual(["มี", "คำแปล"]);
		expect(item?.englishMeaning).toBe("has a breakdown");
	});

	it("excludes an entry with no example carrying a words breakdown (AC3)", () => {
		const noWords = entry({
			examples: [
				{ thai: "no breakdown", romanization: "r", english: "no breakdown" },
			],
		});

		const result = selectCompositionRound([noWords], 1);

		expect(result).toEqual([]);
	});

	it("returns an empty result for zero unlocked entries, without throwing (AC4)", () => {
		expect(() => selectCompositionRound([], 5)).not.toThrow();
		expect(selectCompositionRound([], 5)).toEqual([]);
	});

	it("shuffles tiles into the exact permutation a seeded source picks (AC5)", () => {
		// Three words: pick index 2 then index 1 then index 0 of what remains
		// -> ["ข้าว", "กิน", "ผม"], then the final sample picks the single
		// eligible item (index 0 of 1).
		const rng = rngForPicks([2, 1, 0, 0], 3);

		const [item] = selectCompositionRound([entry()], 1, rng);

		expect(item?.tiles).toEqual(["ข้าว", "กิน", "ผม"]);
	});

	it("caps the result at the number of eligible entries when over-requested (AC6)", () => {
		const result = selectCompositionRound(
			[entry({ id: "a" }), entry({ id: "b" })],
			10,
		);

		expect(result).toHaveLength(2);
	});

	it("falls back rather than throwing when correctExample is out of range (AC7)", () => {
		const outOfRange = entry({
			cards: {
				recognition: { question: "q", correctAnswer: "a", distractors: [] },
				application: {
					question: "q",
					correctExample: 99,
					incorrectExamples: [],
				},
			},
		});

		const result = selectCompositionRound([outOfRange], 1);

		expect(result).toHaveLength(1);
		expect(result[0]?.correctOrder).toEqual(["ผม", "กิน", "ข้าว"]);
	});
});
