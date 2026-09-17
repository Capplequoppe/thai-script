// @vitest-environment jsdom
/**
 * The map's job is navigation, so these check you can get into each kind of
 * place and that what you find there is that place's own content — not that
 * the boxes are in the right pixels.
 *
 * Queries are scoped to a section throughout. A place is deliberately reachable
 * two ways — as a region on the painting and as a marker on the pitch diagram —
 * so "the button called rice paddy" is ambiguous by design, and a test that
 * papered over that would stop noticing if one of the two disappeared.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { renderWithApp } from "../test-utils/renderWithApp";
import { MemoryPalacePage } from "./MemoryPalacePage";

function renderPalace() {
	return renderWithApp(<MemoryPalacePage />, {
		state: new InMemoryStorage().load(),
	});
}

const worldMap = () =>
	within(screen.getByRole("region", { name: "Map of the palace" }));
const toneDiagram = () =>
	within(screen.getByRole("region", { name: "Where tones resolve" }));
const districts = () =>
	within(screen.getByRole("region", { name: "Where consonants live" }));

describe("MemoryPalacePage", () => {
	it("shows all three kinds of place at once, which is the point of a map", () => {
		renderPalace();

		expect(
			toneDiagram().getByRole("button", { name: /rice paddy/i }),
		).toBeTruthy();
		// The district *card*, which names the class as well as the place. The
		// map region inside the same section carries only the bare place name,
		// so "high class" is what tells the two apart.
		expect(
			districts().getByRole("button", { name: /high class/i }),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: /particles/i })).toBeTruthy();
	});

	it("waits to be asked before showing anything's insides", () => {
		renderPalace();
		expect(screen.getByText(/pick a place to go inside/i)).toBeTruthy();
	});

	it("gathers every scene that ends in one tone into that tone's place", () => {
		renderPalace();
		fireEvent.click(toneDiagram().getByRole("button", { name: /^well/i }));

		expect(screen.getByText(/fall down the same well/i)).toBeTruthy();
		expect(screen.getByText(/one-pointed spear stands driven/i)).toBeTruthy();
		expect(screen.getByText(/that is what makes it one place/i)).toBeTruthy();
	});

	it("says how many rules a merged scene stands for", () => {
		renderPalace();
		fireEvent.click(toneDiagram().getByRole("button", { name: /^well/i }));
		expect(screen.getByText(/4 rules, which agree/)).toBeTruthy();
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

	it("swaps the panel rather than stacking places", () => {
		renderPalace();
		fireEvent.click(toneDiagram().getByRole("button", { name: /^well/i }));
		expect(screen.getByText(/fall down the same well/i)).toBeTruthy();

		fireEvent.click(toneDiagram().getByRole("button", { name: /rice paddy/i }));
		expect(screen.queryByText(/fall down the same well/i)).toBeNull();
		expect(screen.getByText(/flat rice paddy/i)).toBeTruthy();
	});
});

describe("the painted map's regions", () => {
	it("opens a place when its region on the painting is clicked", () => {
		renderPalace();
		fireEvent.click(worldMap().getByRole("button", { name: /waterfall/i }));

		// The same panel the diagram would have opened — one destination, two
		// ways in.
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

	it("keeps every tone marker inside the diagram", () => {
		// jsdom does no layout, so this checks the arithmetic rather than the
		// pixels: a marker whose left plus width passes 100% hangs off the edge
		// at every width, which is what a 92px minimum used to do to the
		// rightmost one on a 360px phone.
		renderPalace();
		const markers = toneDiagram()
			.getAllByRole("button")
			.filter((button) => button.style.left !== "");

		expect(markers.length).toBe(5);
		for (const marker of markers) {
			const right = percent(marker.style.left) + percent(marker.style.width);
			expect(right).toBeLessThanOrEqual(100);
		}
	});

	it("keeps every map region inside the picture", () => {
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
				name: /taught in lesson 1/i,
			}),
		).toBeTruthy();
	});

	it("shows nothing until a letter is asked for", () => {
		openHarbour();
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
