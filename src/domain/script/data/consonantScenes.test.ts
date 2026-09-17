/**
 * The consonant illustrations, checked on the one thing that makes them work.
 *
 * A Thai consonant is learned as its name — ม ม้า, mo *maa*, horse. The
 * picture's job is to put that word in front of the learner, in the district
 * its class lives in. Everything here asks whether a scene still does that, and
 * nothing asks whether the picture is good, which is not a thing a test knows.
 */
import { describe, expect, it } from "vitest";
import {
	CONSONANT_SCENES,
	consonantImageFor,
	consonantSceneFor,
	consonantScenesIn,
} from "./consonantScenes";
import { districtForClass } from "./sceneGrammar";
import { consonants } from "./symbols";

describe("consonant scenes", () => {
	it("covers every consonant in the alphabet, exactly once", () => {
		expect(CONSONANT_SCENES).toHaveLength(consonants.length);
		const chars = CONSONANT_SCENES.map((scene) => scene.char);
		expect(new Set(chars).size).toBe(chars.length);
		for (const consonant of consonants) {
			expect(consonantSceneFor(consonant.character)).toBeDefined();
		}
	});

	it("stages each letter in the district its class already lives in", () => {
		// The scene cannot invent a district: a letter whose picture is set in
		// the market while its class says temple would teach the wrong class
		// through the back door.
		for (const consonant of consonants) {
			const scene = consonantSceneFor(consonant.character);
			expect(scene?.district).toBe(districtForClass(consonant.classType));
		}
	});

	it("keeps the consonant's own word as the prompt's subject", () => {
		// The defect this replaced: ม's horse had become a horseshoe and น's
		// mouse had gone missing entirely, leaving two confusable letters
		// illustrated by the same object.
		for (const scene of CONSONANT_SCENES) {
			const words = scene.meaning
				.split(/[ /()]+/)
				.filter((word) => word.length > 2);
			const named = words.some((word) =>
				new RegExp(`\\b${word}`, "i").test(scene.prompt),
			);
			expect(named, `${scene.char} (${scene.meaning})`).toBe(true);
		}
	});

	it("gives ม a horse and น a mouse, and not the same object twice", () => {
		const horse = consonantSceneFor("ม");
		const mouse = consonantSceneFor("น");
		expect(horse?.prompt).toMatch(/horse/i);
		expect(mouse?.prompt).toMatch(/mouse/i);
		// The specific regression: neither may fall back on a horseshoe.
		expect(horse?.prompt).not.toMatch(/horseshoe/i);
		expect(mouse?.prompt).not.toMatch(/horseshoe/i);
	});

	it("names an image under the same slug as the letter's recording", () => {
		// One naming scheme for both, so a letter's audio and picture cannot
		// drift apart.
		const withAudio = consonants.filter((consonant) => consonant.audioUrl);
		expect(withAudio.length).toBeGreaterThan(40);
		for (const consonant of withAudio) {
			const slug = consonant.audioUrl
				?.replace(/.*consonant-/, "")
				.replace(/\.mp3$/, "");
			expect(consonantImageFor(consonant.character)).toBe(
				`palace/consonants/${slug}.jpg`,
			);
		}
	});

	it("returns nothing for a character that is not a consonant", () => {
		expect(consonantSceneFor("ก๙")).toBeUndefined();
		expect(consonantImageFor("า")).toBeUndefined();
	});

	it("splits the alphabet across the three districts", () => {
		const total =
			consonantScenesIn("harbor").length +
			consonantScenesIn("market").length +
			consonantScenesIn("temple").length;
		expect(total).toBe(CONSONANT_SCENES.length);
		for (const district of ["harbor", "market", "temple"] as const) {
			expect(consonantScenesIn(district).length).toBeGreaterThan(0);
		}
	});
});
