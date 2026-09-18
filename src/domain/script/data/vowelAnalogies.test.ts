/**
 * The Swedish analogies, checked against the vowels they claim to be about.
 *
 * The risk here is not a wrong sound — a native speaker supplies those — but a
 * mapping keyed to a character string that no longer exists, or that never
 * did. That fails silently: the entry is simply never found, the English
 * approximation is shown instead, and nobody notices the better answer went
 * missing.
 */
import { describe, expect, it } from "vitest";
import { vowels } from "./symbols";
import {
	describeSwedish,
	SWEDISH_ANALOGY,
	type SwedishSound,
	swedishFor,
} from "./vowelAnalogies";
import { STROKE_LENGTH_PAIR, vowelKey } from "./vowelParts";

const found = (character: string): SwedishSound => {
	const sound = swedishFor(character);
	if (!sound) throw new Error(`no Swedish analogy for ${character}`);
	return sound;
};

describe("every analogy names a vowel that exists", () => {
	it.each(Object.keys(SWEDISH_ANALOGY))("%s is a real vowel", (character) => {
		expect(vowels.some((v) => vowelKey(v.character) === character)).toBe(true);
	});

	it("maps long forms only, leaving short twins to inherit", () => {
		for (const character of Object.keys(SWEDISH_ANALOGY)) {
			const vowel = vowels.find((v) => vowelKey(v.character) === character);
			expect(vowel?.length).toBe("long");
		}
	});

	it("names two example words for each, so the sound is shown twice", () => {
		for (const analogy of Object.values(SWEDISH_ANALOGY)) {
			expect(analogy.words).toHaveLength(2);
			expect(new Set(analogy.words).size).toBe(2);
		}
	});
});

describe("a short vowel inherits from its long twin", () => {
	it("follows the shortener, for the family that carries one", () => {
		expect(describeSwedish(found("เ-อ"))).toBe("ö as in öra, söt");
		expect(describeSwedish(found("เ-อะ"))).toBe("ö as in öra, söt, cut short");
	});

	it("follows the stroke, for the family that does not", () => {
		// The gap this closes: ึ carries no ะ, so stripping the shortener finds
		// nothing, and the one vowel English cannot gloss at all would be the
		// only short vowel left without help.
		for (const [short, long] of Object.entries(STROKE_LENGTH_PAIR)) {
			if (!SWEDISH_ANALOGY[long]) continue;
			expect(found(short).vowel).toBe(SWEDISH_ANALOGY[long].vowel);
			expect(found(short).cutShort).toBe(true);
		}
		expect(found("ึ").vowel).toBe("u");
		expect(found("ุ").vowel).toBe("o");
	});

	it("offers nothing for a vowel nobody has mapped", () => {
		// Silence rather than a guess. An English gloss is a known
		// approximation; an invented Swedish one reads as an exact match and
		// would be practised as one.
		expect(swedishFor("า")).toBeUndefined();
		expect(swedishFor("อ (as vowel)")).toBeUndefined();
	});

	it("does not invent a twin for a short vowel with no long form listed", () => {
		expect(swedishFor("เ-าะ")).toBeUndefined();
	});
});

describe("the stroke pairs are what they claim to be", () => {
	it.each(
		Object.entries(STROKE_LENGTH_PAIR),
	)("%s is the short of %s", (short, long) => {
		const of = (c: string) =>
			vowels.find((v) => vowelKey(v.character) === c)?.length;
		expect(of(short)).toBe("short");
		expect(of(long)).toBe("long");
	});

	it("covers only pairs the shortener cannot reach", () => {
		// If one of these ever carried ะ it would have two routes to its twin,
		// and the two could disagree.
		for (const short of Object.keys(STROKE_LENGTH_PAIR)) {
			expect(short.includes("ะ")).toBe(false);
		}
	});
});

describe("the line a learner reads", () => {
	it("appends the adjustment rather than folding it in", () => {
		// ื is the one close-but-not-exact match, so the learner is told to
		// start from a word they already say and change one thing about it.
		expect(describeSwedish(found("ื"))).toBe(
			"u as in hus, ut — say it with your lips unrounded — pulled back, not pushed out",
		);
	});

	it("says nothing about adjusting a vowel that needs none", () => {
		for (const character of ["เ", "แ", "โ", "ู", "เ-อ"]) {
			expect(describeSwedish(found(character))).not.toContain("lips");
		}
	});
});
