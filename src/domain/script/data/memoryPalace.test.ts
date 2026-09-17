/**
 * The palace's promises, which are all of the form "this is complete" or
 * "these do not overlap" — the two things a memory scheme cannot be caught
 * getting wrong later, because by then the wrong version has been memorised.
 */
import { describe, expect, it } from "vitest";
import { ROOMS } from "../../vocabulary/types";
import {
	ALL_RULE_IDS,
	CLASS_CAST,
	characterForClass,
	EVERY_RULE_HAS_ONE_SCENE,
	EVERY_TONE_HAS_A_PLACE,
	markRuleId,
	PLACE_VOCABULARIES_ARE_DISJOINT,
	placeForTone,
	TONE_PLACE_NAMES,
	TONE_PLACES,
	TONE_SCENES,
} from "./memoryPalace";
import { DISTRICTS, districtForClass } from "./sceneGrammar";
import { ThaiSymbolClass, toneMarkRules, toneRules } from "./symbols";

describe("the three place vocabularies", () => {
	it("share no word between them", () => {
		expect(PLACE_VOCABULARIES_ARE_DISJOINT).toBe(true);
	});

	it("keeps tone places clear of the class districts in particular", () => {
		// The near-miss worth naming: a temple has steps, and "temple steps"
		// would have been a natural home for the rising tone — while temple
		// already means high class.
		for (const name of TONE_PLACE_NAMES) {
			expect(DISTRICTS).not.toContain(name);
			expect(ROOMS).not.toContain(name);
		}
	});
});

describe("tone places", () => {
	it("gives every tone somewhere to happen", () => {
		expect(EVERY_TONE_HAS_A_PLACE).toBe(true);
	});

	it("puts each place at the height its tone is spoken at", () => {
		expect(placeForTone("low").from).toBeLessThan(placeForTone("mid").from);
		expect(placeForTone("mid").from).toBeLessThan(placeForTone("high").from);
	});

	it("draws the two contour tones as movement, and the rest as points", () => {
		const falling = placeForTone("falling");
		const rising = placeForTone("rising");
		expect(falling.from).toBeGreaterThan(falling.to);
		expect(rising.from).toBeLessThan(rising.to);

		for (const tone of ["mid", "low", "high"] as const) {
			const place = placeForTone(tone);
			expect(place.from).toBe(place.to);
		}
	});

	it("starts falling where high sits and ends it where low sits", () => {
		// The map is only teaching pitch if the contour tones land on the level
		// tones' heights rather than near them.
		expect(placeForTone("falling").from).toBe(placeForTone("high").from);
		expect(placeForTone("falling").to).toBe(placeForTone("low").from);
		expect(placeForTone("rising").to).toBe(placeForTone("high").from);
	});
});

describe("the cast", () => {
	it("draws each figure from the district that already means their class", () => {
		for (const entry of CLASS_CAST) {
			expect(entry.district).toBe(districtForClass(entry.classType));
		}
	});

	it("covers all three classes with distinct figures", () => {
		const characters = CLASS_CAST.map((entry) => entry.character);
		expect(new Set(characters).size).toBe(3);
		expect(characterForClass(ThaiSymbolClass.Low)).toBe("fisherman");
		expect(characterForClass(ThaiSymbolClass.High)).toBe("monk");
	});
});

describe("scenes against the rules", () => {
	it("pictures every rule exactly once", () => {
		expect(EVERY_RULE_HAS_ONE_SCENE).toBe(true);
	});

	it("covers all seventeen rules with eleven scenes", () => {
		// Recorded rather than asserted as a target: if a rule is added to
		// `symbols.ts` these numbers must both move, and the test above is what
		// makes that mandatory. This one says what the current shape is.
		expect(ALL_RULE_IDS).toHaveLength(17);
		expect(TONE_SCENES).toHaveLength(11);
	});

	it("resolves each scene at the place of the tone its rules produce", () => {
		const toneOfRule = new Map<string, string>([
			...toneRules.map((rule) => [rule.id, rule.resultingTone] as const),
			...toneMarkRules.map(
				(rule) =>
					[
						markRuleId(rule.consonantClass, rule.toneMarkName),
						rule.resultingTone,
					] as const,
			),
		]);

		for (const scene of TONE_SCENES) {
			for (const ruleId of scene.covers) {
				// A scene that merges two rules is only honest if they really do
				// produce the same tone — this is the check that keeps a merge
				// from quietly swallowing a difference.
				expect(toneOfRule.get(ruleId)).toBe(scene.tone);
			}
		}
	});

	it("casts each scene with exactly the classes its rules belong to", () => {
		const classOfRule = new Map<string, ThaiSymbolClass>([
			...toneRules.map((rule) => [rule.id, rule.consonantClass] as const),
			...toneMarkRules.map(
				(rule) =>
					[
						markRuleId(rule.consonantClass, rule.toneMarkName),
						rule.consonantClass,
					] as const,
			),
		]);

		for (const scene of TONE_SCENES) {
			const classesInRules = new Set(
				scene.covers.map((ruleId) => classOfRule.get(ruleId)),
			);
			expect([...classesInRules].sort()).toEqual([...scene.cast].sort());
		}
	});

	it("gives a counted prop to every marked scene and to no other", () => {
		for (const scene of TONE_SCENES) {
			if (scene.fate === "marked") {
				expect(scene.prop).toBeTruthy();
			} else {
				expect(scene.prop).toBeUndefined();
			}
		}
	});

	it("uses the same prop for the same mark across classes", () => {
		// One spear always means mai ek, whoever it goes through. A prop that
		// meant different marks in different scenes would be worse than none.
		const propForMark = new Map<string, string>();
		for (const scene of TONE_SCENES) {
			if (!scene.prop) continue;
			for (const ruleId of scene.covers) {
				const mark = ruleId.replace(/^(high|mid|low)-/, "");
				const seen = propForMark.get(mark);
				if (seen) expect(scene.prop).toBe(seen);
				else propForMark.set(mark, scene.prop);
			}
		}
		expect(propForMark.get("mai-ek")).toBe("one spear");
		expect(propForMark.get("mai-tho")).toBe("two hooks");
	});

	it("spends vowel length in exactly one pair of scenes", () => {
		// The finding the whole scheme is shaped around: long-vs-short changes
		// the answer only for a low-class dead syllable. If that ever stops
		// being true this count moves and the scheme needs rethinking.
		const lengthSensitive = TONE_SCENES.filter(
			(scene) => scene.fate === "dies-fast" || scene.fate === "dies-slowly",
		).filter((scene) => scene.cast.includes(ThaiSymbolClass.Low));
		expect(lengthSensitive).toHaveLength(2);
		expect(new Set(lengthSensitive.map((scene) => scene.tone))).toEqual(
			new Set(["high", "falling"]),
		);
	});

	it("gives every scene a unique id, a picture and a reason", () => {
		expect(new Set(TONE_SCENES.map((scene) => scene.id)).size).toBe(
			TONE_SCENES.length,
		);
		for (const scene of TONE_SCENES) {
			expect(scene.scene.length).toBeGreaterThan(30);
			expect(scene.teaches.length).toBeGreaterThan(20);
		}
	});
});

describe("tone places carry their reason", () => {
	it("says why each place, so the map can show it", () => {
		for (const place of TONE_PLACES) {
			expect(place.reason.length).toBeGreaterThan(20);
		}
	});
});
