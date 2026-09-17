import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	classifyConsonant,
	expectedAspiration,
	HIGH_CLASS_CONSONANTS,
	UNCLASSIFIED,
} from "./soundType";
import { consonants, getConsonant, ThaiSymbolClass } from "./symbols";

const SOUND_TYPES = [
	"sonorant",
	"unaspirated-obstruent",
	"aspirate-or-fricative",
];

describe("sound-type classification (the derivable class rule)", () => {
	// AC1
	it("classifies all 44 consonants and derives the declared class for each", () => {
		expect(consonants).toHaveLength(44);

		const bucketCounts = new Map<string, number>();
		for (const consonant of consonants) {
			const result = classifyConsonant(consonant);
			expect(
				result.state,
				`${consonant.character}: ${
					result.state === "unclassifiable" ? result.reason : ""
				}`,
			).toBe("classified");
			if (result.state !== "classified") continue;

			expect(SOUND_TYPES).toContain(result.soundType);
			expect(result.consonantClass, consonant.character).toBe(
				consonant.classType,
			);
			bucketCounts.set(
				result.soundType,
				(bucketCounts.get(result.soundType) ?? 0) + 1,
			);
		}

		// The phase's own arithmetic: 10 sonorants, 9 unaspirated obstruents
		// (including silent อ), 25 aspirates and fricatives.
		expect(bucketCounts.get("sonorant")).toBe(10);
		expect(bucketCounts.get("unaspirated-obstruent")).toBe(9);
		expect(bucketCounts.get("aspirate-or-fricative")).toBe(25);
	});

	// AC1 — the derivation is independent of what it is checked against: the
	// module never touches the declared class field, so the agreement above
	// is a real measurement rather than true by construction.
	it("derives without reading the declared class field", () => {
		const source = readFileSync(
			join(import.meta.dirname, "soundType.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/classType/);
	});

	// AC2
	it("isAspirated agrees with initialSound for all 44 — ฑ and ฒ included", () => {
		for (const consonant of consonants) {
			expect(
				consonant.isAspirated,
				`${consonant.character} (${consonant.initialSound})`,
			).toBe(expectedAspiration(consonant.initialSound));
		}

		// The two letters that shipped disagreeing with their own initialSound.
		expect(getConsonant("ฑ")?.isAspirated).toBe(true);
		expect(getConsonant("ฒ")?.isAspirated).toBe(true);
	});

	// AC3 — the first two buckets consult no per-letter table: a glyph the
	// repository has never seen classifies from its sound facts alone.
	it("derives the sonorant and unaspirated buckets from sound alone", () => {
		expect(
			classifyConsonant({
				character: "✘",
				initialSound: "ng (entirely made up)",
				isAspirated: false,
			}),
		).toEqual({
			state: "classified",
			soundType: "sonorant",
			consonantClass: ThaiSymbolClass.Low,
		});

		expect(
			classifyConsonant({
				character: "✘",
				initialSound: "bp (entirely made up)",
				isAspirated: false,
			}),
		).toEqual({
			state: "classified",
			soundType: "unaspirated-obstruent",
			consonantClass: ThaiSymbolClass.Mid,
		});

		expect(
			classifyConsonant({
				character: "✘",
				initialSound: "silent (entirely made up)",
				isAspirated: false,
			}),
		).toEqual({
			state: "classified",
			soundType: "unaspirated-obstruent",
			consonantClass: ThaiSymbolClass.Mid,
		});
	});

	// AC3 — only the aspirate/fricative bucket consults a list, and the list
	// is the irreducible 11-member residue.
	it("memorises exactly the 11 high aspirates and fricatives, nothing else", () => {
		expect(HIGH_CLASS_CONSONANTS).toHaveLength(11);

		for (const character of HIGH_CLASS_CONSONANTS) {
			const consonant = getConsonant(character);
			expect(consonant, character).toBeDefined();
			if (!consonant) continue;
			const result = classifyConsonant(consonant);
			expect(result.state, character).toBe("classified");
			if (result.state !== "classified") continue;
			// No sonorant and no unaspirated obstruent appears in the list.
			expect(result.soundType, character).toBe("aspirate-or-fricative");
		}

		// The list is exactly the declared high class — nothing missing (ศ
		// stays in on measurement), nothing extra.
		const declaredHigh = consonants
			.filter((consonant) => consonant.classType === ThaiSymbolClass.High)
			.map((consonant) => consonant.character);
		expect([...HIGH_CLASS_CONSONANTS].sort()).toEqual(declaredHigh.sort());
	});
});

describe("the three classification states", () => {
	// AC8 — state one: classified.
	it("reports a real consonant as classified", () => {
		const maaw = getConsonant("ม");
		expect(maaw).toBeDefined();
		if (!maaw) return;
		expect(classifyConsonant(maaw).state).toBe("classified");
	});

	// AC8 — state two: unclassifiable, and never disguised as unclassified.
	it("reports a letter the rule cannot place as unclassifiable, with the reason", () => {
		const unknown = classifyConsonant({
			character: "✘",
			initialSound: "zz (no such onset)",
			isAspirated: false,
		});
		expect(unknown.state).toBe("unclassifiable");
		expect(unknown.state).not.toBe("unclassified");
		if (unknown.state !== "unclassifiable") return;
		expect(unknown.reason).toContain("zz");

		// The exact shape ฑ shipped in: an initialSound naming an aspirated
		// stop over isAspirated: false is a contradiction, not a bucket.
		const contradiction = classifyConsonant({
			character: "ฑ",
			initialSound: "th (usually same as ท, sometimes d)",
			isAspirated: false,
		});
		expect(contradiction.state).toBe("unclassifiable");
		if (contradiction.state !== "unclassifiable") return;
		expect(contradiction.reason).toContain("isAspirated");
	});

	// AC8 — state three: not yet classified, distinct from the other two.
	it("keeps not-yet-classified a distinct third state", () => {
		expect(UNCLASSIFIED.state).toBe("unclassified");

		const maaw = getConsonant("ม");
		if (!maaw) return;
		const states = new Set([
			classifyConsonant(maaw).state,
			classifyConsonant({
				character: "✘",
				initialSound: "zz",
				isAspirated: false,
			}).state,
			UNCLASSIFIED.state,
		]);
		expect(states.size).toBe(3);
	});
});
