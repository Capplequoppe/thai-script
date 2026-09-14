import { describe, expect, it } from "vitest";
import {
	CHARACTER_IDS,
	CHARACTERS,
	characterFor,
	REGISTERS,
	registerViolations,
} from "./characters";

// ---------------------------------------------------------------------------
// AC1 — the register is a declared decision per character, not whatever form
// a given mnemonic happened to reach for.
// ---------------------------------------------------------------------------

describe("the recurring cast", () => {
	it("declares a fixed politeness register on every character", () => {
		expect(CHARACTERS).toHaveLength(CHARACTER_IDS.length);
		for (const character of CHARACTERS) {
			expect(REGISTERS, character.name).toContain(character.register);
		}
		expect(CHARACTERS.map((c) => c.register)).toEqual(["polite", "informal"]);
	});

	it("declares the off-register forms it is fixed against", () => {
		for (const character of CHARACTERS) {
			expect(character.registerVariants.length, character.name).toBeGreaterThan(
				0,
			);
			for (const variant of character.registerVariants) {
				expect(variant.form, character.name).not.toBe(character.pronoun);
				expect(variant.note.trim(), variant.form).not.toBe("");
			}
			// ฉัน / ดิฉัน is the pair this field exists for: a variant that sat on
			// the same rung would record nothing.
			expect(
				character.registerVariants.some(
					(v) => v.register !== character.register,
				),
				character.name,
			).toBe(true);
		}
	});

	it("names each character for a distinct first-person pronoun", () => {
		expect(new Set(CHARACTERS.map((c) => c.pronoun)).size).toBe(
			CHARACTERS.length,
		);
		expect(characterFor("pom").pronoun).toBe("ผม");
		expect(characterFor("chan").pronoun).toBe("ฉัน");
	});

	// Both ผ and ฉ are high class, and a character native to the high district
	// would be unusable in the other two — see the module comment.
	it("pins no character to a room", () => {
		for (const character of CHARACTERS) {
			expect(character.homeRoom, character.name).toBeNull();
		}
	});

	it("refuses an id outside the closed set", () => {
		expect(() =>
			characterFor("somchai" as unknown as (typeof CHARACTER_IDS)[number]),
		).toThrow(/unknown character/);
	});
});

describe("register consistency of prose", () => {
	it("passes prose that uses a character's declared pronoun", () => {
		expect(
			registerViolations("Pom introduces himself as ผม.", ["pom"]),
		).toEqual([]);
	});

	it("catches an off-register form of a declared character", () => {
		const violations = registerViolations("Chan says ดิฉัน at the door.", [
			"chan",
		]);

		expect(violations.join(" ")).toContain("ดิฉัน");
		expect(violations.join(" ")).toContain("informal");
	});

	it("catches a pronoun staged without the character that governs it", () => {
		const violations = registerViolations("Someone says ผม in the hallway.", [
			"chan",
		]);

		expect(violations.join(" ")).toContain("Pom");
	});
});
