// @vitest-environment jsdom
/**
 * The tone rules, reachable and told in full.
 *
 * Eleven scenes were written, illustrated and narrated, and for a long while
 * the only way to any of them was to know which of five tone places it lived
 * under and go and find that place on the map. A learner standing in the
 * harbour asking what low class does to a tone was told "four tone rules start
 * here" and given nowhere to go — a true sentence and a dead end.
 *
 * What is checked here is the pair of things that were missing rather than the
 * markup that now supplies them: that a district offers its own rules and only
 * its own, and that arriving at a tone place gives the whole mnemonic instead
 * of the one-sentence caption its picture was drawn from.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { lessonEntryByNumber } from "../../domain/script/data/lessonSequence";
import {
	ruleLabel,
	sceneStory,
	scenesForClass,
	TONE_SCENES,
} from "../../domain/script/data/memoryPalace";
import { ThaiSymbolClass } from "../../domain/script/data/symbols";
import { AppContext } from "../context/AppContext";
import { makeAppValue } from "../test-utils/renderWithApp";
import { MemoryPalacePage } from "./MemoryPalacePage";

/** The position of the lesson `symbols.ts` files under this number. */
const at = (legacyNumber: number): number =>
	lessonEntryByNumber(legacyNumber)?.position ?? legacyNumber;

/** Renders the palace for a learner who has finished exactly these lessons. */
function palaceAfter(lessons: readonly number[]) {
	const app = makeAppValue();
	const state = app.storage.load();
	state.completedLessons.push(...lessons);
	app.storage.save(state);
	app.value.lesson.reconcileAllContent();
	const value = { ...app.value, state: app.storage.load() };

	return render(
		<AppContext.Provider value={value}>
			<MemoryRouter initialEntries={["/"]}>
				<MemoryPalacePage />
			</MemoryRouter>
		</AppContext.Provider>,
	);
}

/**
 * Walks into a district the way a learner does.
 *
 * The last match rather than the first: the painted map offers the same place
 * as a hotspot before the district row does, and the row button is the one
 * that reliably carries the class name.
 */
function enter(district: RegExp) {
	const ways = screen.getAllByRole("button", { name: district });
	const door = ways[ways.length - 1];
	if (!door) throw new Error(`no way into ${district}`);
	fireEvent.click(door);
}

/** Everything through lesson 13, which is every spelling rule there is. */
const THROUGH_THE_SPELLING_RULES = [
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
].map(at);

describe("a district's own tone rules", () => {
	it("offers the harbour the scenes its fisherman is in", () => {
		palaceAfter(THROUGH_THE_SPELLING_RULES);
		enter(/harbor/i);

		// The paddy, the rooftop and the waterfall — where a low-class letter
		// ends up when the syllable lives, when it dies short, and when it dies
		// long. Named by their place, because the place is what is at the other
		// end of the tap.
		expect(screen.getAllByText(/^rice paddy$/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/^rooftop$/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/^waterfall$/i).length).toBeGreaterThan(0);
	});

	it("keeps the well out of the harbour, because no low-class rule ends there", () => {
		palaceAfter(THROUGH_THE_SPELLING_RULES);
		enter(/harbor/i);

		// This is the whole point of the shortcut. A list of all five tone
		// places under every district would be the map again, and would answer
		// "what does low class do" with "here is everything".
		const wellIsOffered = scenesForClass(ThaiSymbolClass.Low).some(
			(scene) => scene.tone === "low",
		);
		expect(wellIsOffered).toBe(false);
	});

	it("sends the monk and the vendor to the same well", () => {
		// Mid and high agree on a dead syllable, which is why they share a
		// scene — so both districts have to offer it, or the shared scene stops
		// saying the thing it exists to say.
		const shared = "well-vendor-and-monk-fall";
		expect(
			scenesForClass(ThaiSymbolClass.Mid).some((s) => s.id === shared),
		).toBe(true);
		expect(
			scenesForClass(ThaiSymbolClass.High).some((s) => s.id === shared),
		).toBe(true);
		expect(
			scenesForClass(ThaiSymbolClass.Low).some((s) => s.id === shared),
		).toBe(false);
	});

	it("offers nothing before the rules are taught", () => {
		palaceAfter([]);
		enter(/harbor/i);

		// The same gate the tone places use. A shortcut into a place that then
		// says "nothing has happened here yet" is a worse answer than no
		// shortcut.
		//
		// Checked by the scene's own sentence rather than by the place's name:
		// the painted map labels the rooftop from the first day and always
		// should, because the geography is not what is gated.
		expect(screen.queryByText(/killed instantly/i)).toBeNull();
		expect(screen.queryByText(/tone rules? starts? here/i)).toBeNull();
	});

	it("walks from the district to the place when one is tapped", () => {
		palaceAfter(THROUGH_THE_SPELLING_RULES);
		enter(/harbor/i);

		const shortcuts = screen.getAllByRole("button", { name: /rooftop/i });
		const shortcut = shortcuts[shortcuts.length - 1];
		if (!shortcut) throw new Error("no shortcut to the rooftop");
		fireEvent.click(shortcut);

		// Arrived: the rooftop's own reason for being the high tone's place,
		// which only the tone-place panel says.
		expect(screen.getByText(/high is held, not climbed/i)).toBeTruthy();
	});
});

describe("a tone place's stories", () => {
	it("tells the whole mnemonic, not the caption its picture was drawn from", () => {
		palaceAfter(THROUGH_THE_SPELLING_RULES);
		enter(/harbor/i);

		const shortcuts = screen.getAllByRole("button", { name: /rooftop/i });
		const shortcut = shortcuts[shortcuts.length - 1];
		if (!shortcut) throw new Error("no shortcut to the rooftop");
		fireEvent.click(shortcut);

		// The cast, the moment and the rule — the three things a one-sentence
		// caption had no room for and a learner holding this for years needs.
		expect(screen.getByText(/climbed up to fix a tile/i)).toBeTruthy();
		expect(
			screen.getByText(/over before the sound reaches the street/i),
		).toBeTruthy();
	});

	it("offers the story out loud as well as in text", () => {
		palaceAfter(THROUGH_THE_SPELLING_RULES);
		enter(/harbor/i);
		const shortcuts = screen.getAllByRole("button", { name: /rooftop/i });
		const shortcut = shortcuts[shortcuts.length - 1];
		if (!shortcut) throw new Error("no shortcut to the rooftop");
		fireEvent.click(shortcut);

		expect(
			screen.getAllByRole("button", { name: /hear what happens here/i }).length,
		).toBeGreaterThan(0);
	});

	it("names only the rules this learner has been taught", () => {
		// The well carries four rules across two lessons. Somebody who has
		// finished 11 and not 13 should be offered the vendor's two and not the
		// monk's, or the scene becomes a list of what is being withheld.
		palaceAfter([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(at));
		enter(/market/i);

		const ways = screen.getAllByRole("button", { name: /well/i });
		const shortcut = ways[ways.length - 1];
		if (!shortcut) throw new Error("no shortcut to the well");
		fireEvent.click(shortcut);

		expect(screen.getAllByText(/mid class, dead/i).length).toBeGreaterThan(0);
		expect(screen.queryByText(/high class, dead/i)).toBeNull();
	});
});

describe("the stories themselves", () => {
	it("reads every scene's narration without the engine's breath marks", () => {
		// `[pause]` is an instruction to the voice and not a word. It is
		// stripped for the reader rather than removed from the data, because
		// the synthesis script needs it.
		for (const scene of TONE_SCENES) {
			expect(sceneStory(scene)).not.toContain("[pause]");
			expect(sceneStory(scene).length).toBeGreaterThan(200);
		}
	});

	it("casts a scene with exactly the classes whose rules it covers", () => {
		// What makes the district shortcut correct. A district lists the scenes
		// its figure is in and counts the rules of its class, and those two
		// numbers are only ever the same number if a scene's cast is the set of
		// classes its rules belong to — a fisherman drawn into a scene that
		// decides nothing for low class would be a shortcut to somewhere the
		// harbour has no business.
		for (const scene of TONE_SCENES) {
			const classes = new Set(
				scene.covers.map((id) => ruleLabel(id).split(" class")[0]),
			);
			expect([...classes].sort()).toEqual([...scene.cast].sort());
		}
	});

	it("puts every scene in reach of at least one district", () => {
		// A scene no district offers is one a learner can only find by already
		// knowing which tone it resolves at — which is the thing they came to
		// look up.
		const reachable = new Set(
			Object.values(ThaiSymbolClass).flatMap((classType) =>
				scenesForClass(classType).map((scene) => scene.id),
			),
		);
		for (const scene of TONE_SCENES) {
			expect(reachable).toContain(scene.id);
		}
	});
});
