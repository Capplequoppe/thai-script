/**
 * The vowel formula, checked against the vowels.
 *
 * The claim is that a Thai vowel is a placement of parts around the consonant,
 * and that where it is written follows from which parts it has rather than
 * being a separate fact. That is either true of all thirty or it is a story,
 * and a story would be worse than nothing here: a learner told to write a mark
 * in the wrong place practises it there.
 *
 * So the derived position is asserted against the stored one for every vowel.
 * The check has already earned itself — it found three short compounds
 * recorded as `around` whose parts put them elsewhere, and the symbol card was
 * showing those values to learners.
 */
import { describe, expect, it } from "vitest";
import { vowels } from "./symbols";
import {
	isMarkedShort,
	PART_SLOT,
	partsOf,
	positionFromParts,
	ROOM_FOR_POSITION,
	SHORTENER,
} from "./vowelParts";

describe("every vowel is made of known parts", () => {
	it("contains no character the table does not place", () => {
		const unplaced = new Set<string>();
		for (const vowel of vowels) {
			for (const part of partsOf(vowel.character)) {
				if (!PART_SLOT[part]) unplaced.add(part);
			}
		}
		// An unlisted part would be silently treated as "nowhere", which reads
		// as a position rather than as the gap it is.
		expect([...unplaced]).toEqual([]);
	});

	it("builds thirty vowels out of under twenty parts", () => {
		const used = new Set(vowels.flatMap((v) => partsOf(v.character)));
		expect(vowels.length).toBeGreaterThanOrEqual(30);
		expect(used.size).toBeLessThan(20);
	});
});

describe("position follows from the parts", () => {
	it.each(vowels.map((v) => [v.character, v.name, v.position] as const))(
		"%s (%s) is written %s",
		(character, _name, position) => {
			expect(positionFromParts(partsOf(character))).toBe(position);
		},
	);

	it("gives every position a room in the house", () => {
		for (const vowel of vowels) {
			expect(ROOM_FOR_POSITION[vowel.position]).toBeTruthy();
		}
	});
});

describe("the shortener, in the direction it actually runs", () => {
	it("means short wherever it appears", () => {
		const marked = vowels.filter((v) => isMarkedShort(v.character));
		expect(marked.length).toBeGreaterThan(0);
		for (const vowel of marked) {
			expect(vowel.length).toBe("short");
		}
	});

	it("is not required by a short vowel, which is why it is a one-way rule", () => {
		// Teaching "short => carries the mark" would strand every short vowel
		// written above or below the line. The absence of this assertion's
		// inverse is the point of it.
		const shortWithout = vowels.filter(
			(v) => v.length === "short" && !isMarkedShort(v.character),
		);
		expect(shortWithout.length).toBeGreaterThan(0);
	});

	it("adds itself behind the consonant, never in front", () => {
		// The rule that caught the three bad positions: a long vowel and its
		// short twin differ by a mark at the back, so the twin cannot acquire a
		// part in front — and therefore cannot become more "around" than it was.
		for (const vowel of vowels) {
			if (!isMarkedShort(vowel.character)) continue;
			expect(PART_SLOT[SHORTENER]).toBe("back");
			const withoutShortener = vowel.character.split(SHORTENER).join("");
			const twin = vowels.find((v) => v.character === withoutShortener);
			if (!twin) continue;
			// Same parts bar the shortener, so the same slots bar "back".
			const slotsOf = (c: string) =>
				new Set(partsOf(c).map((p) => PART_SLOT[p]).filter((s) => s !== "back"));
			expect([...slotsOf(vowel.character)].sort()).toEqual(
				[...slotsOf(twin.character)].sort(),
			);
		}
	});
});
