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
	EVERY_LOCATION_HAS_AN_OVERVIEW,
	EVERY_RULE_HAS_ONE_SCENE,
	EVERY_TONE_HAS_A_PLACE,
	markRuleId,
	OVERVIEW_NAMES_MATCH_THE_STRUCTURE,
	PALACE_PLACES,
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
		expect(propForMark.get("mai-ek")).toBe("a plain one-pointed spear");
		expect(propForMark.get("mai-tho")).toBe("a two-pronged spear");
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

describe("scene prompts", () => {
	/** The cast, spelled as the prompts spell them so a face stays one face. */
	const CAST_TAGS: Record<string, string> = {
		low: "fisherman",
		mid: "market vendor",
		high: "monk",
	};

	it("writes a prompt for every scene, distinct from its prose", () => {
		for (const scene of TONE_SCENES) {
			expect(scene.prompt.length).toBeGreaterThan(40);
			// Equal strings would mean the prose was copied across, which is the
			// exact defect the second field exists to fix.
			expect(scene.prompt).not.toBe(scene.scene);
		}
	});

	it("names every character the scene casts, in the prompt the model sees", () => {
		// A prompt that forgets one of its two characters renders one of them,
		// and a scene that merges two rules stops teaching that they agree.
		for (const scene of TONE_SCENES) {
			for (const classType of scene.cast) {
				expect(scene.prompt.toLowerCase()).toContain(CAST_TAGS[classType]);
			}
		}
	});

	it("keeps narration out of the prompts", () => {
		// The words that made the first batch fail: they refer to something
		// before or after the instant drawn, which a still image cannot hold.
		for (const scene of TONE_SCENES) {
			expect(scene.prompt).not.toMatch(
				/\bthe same\b|\binstead\b|\balready\b|\bdo not come back\b/i,
			);
		}
	});

	it("names the counted prop in the prompt of every marked scene", () => {
		// Each prop is one object whose silhouette carries its number, which
		// is what the mark is named after: ek, tho, tri and chattawa are the
		// Sanskrit one, two, three, four. N copies of an object was the first
		// scheme and the model could not count them.
		const COUNT_WORD: Record<string, RegExp> = {
			"a plain one-pointed spear": /\bone-pointed\b/i,
			"a two-pronged spear": /\btwo-pronged\b/i,
			"a three-pronged trident": /\bthree-pronged trident\b/i,
			"a four-tined pitchfork": /\bfour[- ]tined\b/i,
		};
		for (const scene of TONE_SCENES) {
			if (!scene.prop) continue;
			expect(scene.prompt).toMatch(COUNT_WORD[scene.prop]);
		}
	});
});

describe("places and maps", () => {
	it("draws an establishing shot for every location, and both maps", () => {
		expect(EVERY_LOCATION_HAS_AN_OVERVIEW).toBe(true);
	});

	it("calls a place the same thing in its picture as on the map", () => {
		expect(OVERVIEW_NAMES_MATCH_THE_STRUCTURE).toBe(true);
	});

	it("gives every place a prompt and a caption", () => {
		for (const place of PALACE_PLACES) {
			expect(place.prompt.length).toBeGreaterThan(40);
			expect(place.caption.length).toBeGreaterThan(20);
		}
	});

	it("keeps people out of the establishing shots", () => {
		// A place is the empty room. Putting the cast in one would make it a
		// twelfth scene competing with the eleven that carry the rules.
		for (const place of PALACE_PLACES) {
			if (place.kind === "map") continue;
			expect(place.prompt).toMatch(/no people|empty of shoppers/i);
		}
	});

	it("points each district and tone place at what it stands for", () => {
		const districts = PALACE_PLACES.filter((p) => p.kind === "district");
		const tones = PALACE_PLACES.filter((p) => p.kind === "tone");
		expect(districts).toHaveLength(3);
		expect(tones).toHaveLength(TONE_PLACES.length);
		for (const place of [...districts, ...tones]) {
			expect(place.for).toBeTruthy();
		}
	});

	it("keeps every place id unique, including against the scenes", () => {
		// They share one directory and one manifest, so a collision would have
		// one image silently overwrite another.
		const ids = [
			...PALACE_PLACES.map((place) => place.id),
			...TONE_SCENES.map((scene) => scene.id),
		];
		expect(new Set(ids).size).toBe(ids.length);
	});
});
