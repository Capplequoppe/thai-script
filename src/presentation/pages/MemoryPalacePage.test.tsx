// @vitest-environment jsdom
/**
 * The map's job is navigation, so these check you can get into each kind of
 * place and that what you find there is that place's own content — not that
 * the boxes are in the right pixels.
 *
 * Queries are scoped to a section throughout. The painting is the only way into
 * a tone place now, and a district answers to both the painting and its card,
 * so "the button called harbor" is still ambiguous by design — a test that
 * papered over that would stop noticing if one of the two disappeared.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	lessonEntryByNumber,
	lessonSequence,
} from "../../domain/script/data/lessonSequence";

/** The position of the lesson `symbols.ts` files under this number. */
const at = (legacyNumber: number): number =>
	lessonEntryByNumber(legacyNumber)?.position ?? legacyNumber;

import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { renderWithApp } from "../test-utils/renderWithApp";
import { MemoryPalacePage } from "./MemoryPalacePage";

/**
 * The palace for a learner who has finished everything.
 *
 * These tests are about navigation and grouping — which scenes belong to which
 * place, and that opening one place closes the last — so they need the palace
 * populated. Gating is a separate concern with its own tests in
 * `MemoryPalaceGating.test.tsx`; asserting on it here would make every one of
 * these fail for a reason that has nothing to do with what it checks.
 */
function renderPalace() {
	const state = new InMemoryStorage().load();
	// Positions from the declared sequence, which is what `getLessonSummary`
	// indexes. Not `lessons[].number`: those are the pre-migration integers and
	// the two diverge, so a legacy number runs past the end and the lookup
	// throws.
	state.completedLessons.push(...lessonSequence.map((entry) => entry.position));
	return renderWithApp(<MemoryPalacePage />, { state });
}

const worldMap = () =>
	within(screen.getByRole("region", { name: "Map of the palace" }));
const districts = () =>
	within(screen.getByRole("region", { name: "Where consonants live" }));
const house = () =>
	within(screen.getByRole("region", { name: "Where vowels lodge" }));

describe("MemoryPalacePage", () => {
	it("shows all four kinds of place at once, which is the point of a map", () => {
		renderPalace();

		expect(
			worldMap().getByRole("button", { name: /rice paddy/i }),
		).toBeTruthy();
		// The district *card*, which names the class as well as the place. The
		// map region inside the same section carries only the bare place name,
		// so "high class" is what tells the two apart.
		expect(
			districts().getByRole("button", { name: /high class/i }),
		).toBeTruthy();
		expect(house().getByRole("button", { name: /crossroads/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /particles/i })).toBeTruthy();
	});

	it("waits to be asked before showing anything's insides", () => {
		renderPalace();
		expect(screen.getByText(/pick a place to go inside/i)).toBeTruthy();
	});

	it("gathers every scene that ends in one tone into that tone's place", () => {
		renderPalace();
		fireEvent.click(worldMap().getByRole("button", { name: /^well/i }));

		// The stories themselves, which is what a scene is — not the one-line
		// caption its picture was drawn from. That caption used to stand here
		// in place of the mnemonic, so a learner who could not play the audio
		// got a sentence where the memory was meant to be.
		expect(screen.getByText(/down the shaft, into the dark/i)).toBeTruthy();
		expect(screen.getByText(/driven into the rim/i)).toBeTruthy();
		expect(screen.getByText(/that is what makes it one place/i)).toBeTruthy();
	});

	it("names each rule a merged scene stands for, and offers each one's lesson", () => {
		renderPalace();
		fireEvent.click(worldMap().getByRole("button", { name: /^well/i }));

		// Four rules end in this well, across two lessons. A count said so and
		// went no further; naming them gives a learner the one they came for
		// and a way back into the lesson that told it.
		expect(screen.getByText(/mid class, dead, short vowel/i)).toBeTruthy();
		expect(screen.getByText(/mid class, dead, long vowel/i)).toBeTruthy();
		expect(screen.getByText(/high class, dead, short vowel/i)).toBeTruthy();
		expect(screen.getByText(/high class, dead, long vowel/i)).toBeTruthy();
	});

	it("puts a district's own letters and its cast behind the district", () => {
		renderPalace();
		fireEvent.click(districts().getByRole("button", { name: /low class/i }));

		expect(screen.getByText(/this district sends its fisherman/i)).toBeTruthy();

		// Each letter is shown as its own word, which is what it is learned
		// as. ม is low class and its horse belongs to the harbour; ก is mid,
		// so its chicken must be somewhere else entirely.
		expect(screen.getByText("ม")).toBeTruthy();
		expect(screen.getByText("horse")).toBeTruthy();
		expect(screen.queryByText("chicken")).toBeNull();
	});

	it("opens the house onto its rooms, with its lodgers in them", () => {
		renderPalace();
		fireEvent.click(house().getByRole("button", { name: /crossroads/i }));

		// Every room is there from the first day, the same way every district
		// is: knowing a vowel is written above its consonant is knowing which
		// room it is in, so the floor plan is worth having before it fills.
		expect(screen.getByText(/^the roof$/i)).toBeTruthy();
		expect(screen.getByText(/^the cellar$/i)).toBeTruthy();
		expect(screen.getByText(/^the back yard$/i)).toBeTruthy();

		// Sara aa is written after its consonant and is lesson 1's vowel, so a
		// learner who has finished everything has it, and it lodges out the
		// back rather than anywhere else.
		const backYard = screen.getByText(/^the back yard$/i).closest("article");
		expect(backYard).toBeTruthy();
		expect(within(backYard as HTMLElement).getByText("า")).toBeTruthy();

		// And it is out the back rather than on the roof, which is the whole
		// use of sorting the house by where a thing is written.
		const roof = screen.getByText(/^the roof$/i).closest("article");
		expect(within(roof as HTMLElement).queryByText("า")).toBeNull();
	});

	it("swaps the panel rather than stacking places", () => {
		renderPalace();
		fireEvent.click(worldMap().getByRole("button", { name: /^well/i }));
		expect(screen.getByText(/down the shaft, into the dark/i)).toBeTruthy();

		fireEvent.click(worldMap().getByRole("button", { name: /rice paddy/i }));
		expect(screen.queryByText(/down the shaft, into the dark/i)).toBeNull();
		expect(screen.getByText(/runs flat to the horizon/i)).toBeTruthy();
	});
});

describe("the painted map's regions", () => {
	it("opens a place when its region on the painting is clicked", () => {
		renderPalace();
		fireEvent.click(worldMap().getByRole("button", { name: /waterfall/i }));

		expect(screen.getByText(/nothing that goes over comes back/i)).toBeTruthy();
	});

	it("reaches a district from the painting too", () => {
		renderPalace();
		fireEvent.click(worldMap().getByRole("button", { name: /market/i }));
		expect(
			screen.getByText(/this district sends its market vendor/i),
		).toBeTruthy();
	});

	it("labels its regions at rest, because a phone has no hover", () => {
		renderPalace();
		// The label is the button's own text, not a title or an aria-label, so
		// it is on screen before anything is touched.
		const region = worldMap().getByRole("button", { name: /^temple$/i });
		expect(region.textContent).toBe("temple");
	});

	it("scrolls the panel into view, since it is below the fold on a phone", () => {
		const scrollIntoView = vi.fn();
		// jsdom implements no layout and so no scrollIntoView; the page calls it
		// optionally for that reason, which means a missing call would otherwise
		// look exactly like a working one.
		Element.prototype.scrollIntoView = scrollIntoView;

		renderPalace();
		expect(scrollIntoView).not.toHaveBeenCalled();

		fireEvent.click(worldMap().getByRole("button", { name: /waterfall/i }));
		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "start",
		});
	});
});

describe("on a narrow screen", () => {
	/** Percent off an inline style, e.g. "80%" -> 80. */
	function percent(value: string | undefined): number {
		return Number.parseFloat((value ?? "0").replace("%", ""));
	}

	it("keeps every map region inside the picture", () => {
		// jsdom does no layout, so this checks the arithmetic rather than the
		// pixels: a region whose left plus width passes 100% hangs off the edge
		// at every width, and no width makes it clickable again.
		renderPalace();
		const regions = worldMap()
			.getAllByRole("button")
			.filter((button) => button.style.left !== "");

		expect(regions.length).toBeGreaterThan(0);
		for (const region of regions) {
			expect(
				percent(region.style.left) + percent(region.style.width),
			).toBeLessThanOrEqual(100);
			expect(
				percent(region.style.top) + percent(region.style.height),
			).toBeLessThanOrEqual(100);
		}
	});

	it("gives every map region a tappable minimum", () => {
		renderPalace();
		const regions = worldMap()
			.getAllByRole("button")
			.filter((button) => button.style.left !== "");

		for (const region of regions) {
			// 44px is the usual floor for a touch target, and the waterfall is
			// only 12% of the width — on a narrow phone that is under it.
			expect(region.style.minWidth).toBe("44px");
			expect(region.style.minHeight).toBe("44px");
		}
	});
});

describe("opening a letter from its district", () => {
	function openHarbour() {
		renderPalace();
		fireEvent.click(districts().getByRole("button", { name: /low class/i }));
	}

	it("opens a dialog with the letter's card", () => {
		openHarbour();
		fireEvent.click(screen.getByRole("button", { name: /ม.*horse/i }));

		const dialog = within(screen.getByRole("dialog"));
		// The name appears twice by design — once as the dialog's heading and
		// once inside the card, which is the same card Items shows.
		expect(dialog.getByRole("heading", { name: /ม ม้า/ })).toBeTruthy();
		// Likewise the meaning: the dialog's description line and the card's
		// own italic gloss. Both are wanted; the count is the assertion.
		expect(dialog.getAllByText(/"horse"/)).toHaveLength(2);
		// And the picture of it, which is the whole point of the district.
		expect(dialog.getByAltText(/ม ม้า — horse/)).toBeTruthy();
	});

	it("carries the mnemonic prose, which is the reason to open it at all", () => {
		openHarbour();
		fireEvent.click(screen.getByRole("button", { name: /ม.*horse/i }));

		// The rewritten cue: the horse, not the horseshoe it used to be.
		expect(
			within(screen.getByRole("dialog")).getByText(/reared up on the quay/i),
		).toBeTruthy();
	});

	it("names the lesson that introduces the letter, by its position", () => {
		openHarbour();
		fireEvent.click(screen.getByRole("button", { name: /ม.*horse/i }));

		// ม is filed under legacy lesson 1, which is also position 1 — the two
		// integer spaces only diverge from position 15, so this checks the
		// wiring rather than the divergence. `lessonFor` is where the
		// conversion lives.
		expect(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: new RegExp(`taught in lesson ${at(1)}`, "i"),
			}),
		).toBeTruthy();
	});

	it("shows nothing until a letter is asked for", () => {
		openHarbour();
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
