// @vitest-environment jsdom
/**
 * The palace opens as the learner does.
 *
 * It used to show everything from the first day: a beginner could walk into
 * the harbour and meet forty-four letters, or into the rice paddy and read a
 * tone rule three lessons before being taught it.
 *
 * Locking the *places* would have been the wrong repair. Knowing where a
 * letter lives is knowing its class, and therefore its tone, so the geography
 * has to be available early even when almost nothing is in it. What is gated
 * is the contents.
 *
 * Written the way the failure would be noticed — by counting what is on
 * screen — because "shows slightly too much" produces no error and no warning,
 * and reads as generosity right up until it is a wall of material.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { consonants } from "../../domain/script/data/symbols";
import { AppContext } from "../context/AppContext";
import { makeAppValue } from "../test-utils/renderWithApp";
import { MemoryPalacePage } from "./MemoryPalacePage";

/** Renders the palace for a learner who has finished exactly these lessons. */
function palaceAfter(lessons: readonly number[]) {
	const app = makeAppValue();
	const state = app.storage.load();
	state.completedLessons.push(...lessons);
	app.storage.save(state);
	app.value.lesson.reconcileAllContent();

	// `makeAppValue` captures `state: storage.load()` once, at construction, so
	// seeding storage afterwards reaches the use cases and not the render. Load
	// it again over the top.
	const value = { ...app.value, state: app.storage.load() };

	const result = render(
		<AppContext.Provider value={value}>
			<MemoryRouter initialEntries={["/"]}>
				<MemoryPalacePage />
			</MemoryRouter>
		</AppContext.Provider>,
	);

	// Nothing is selected on arrival, so the detail panel does not exist —
	// which would make every "is not shown" assertion below pass against a
	// blank page. Walk into the harbour first.
	//
	// The last match, not the first: the painted world map offers the same
	// place as a hotspot before the district row does, and the row button is
	// the one that reliably carries the class name.
	const ways = screen.getAllByRole("button", { name: /harbor/i });
	const door = ways[ways.length - 1];
	if (!door) throw new Error("no way into the harbour");
	fireEvent.click(door);
	return result;
}

const LOW_CLASS = consonants.filter((c) => c.classType === "low");

describe("the palace before any lesson is finished", () => {
	it("keeps the district a place, with nobody living in it", () => {
		palaceAfter([]);

		// Reachable and rendered — that is the point of not locking it — and it
		// says it is empty rather than presenting an unexplained blank grid.
		expect(screen.getAllByText(/harbor/i).length).toBeGreaterThan(0);
		expect(screen.getByText(/nobody has moved in yet/i)).toBeTruthy();
	});

	it("puts no consonant tiles on the board", () => {
		palaceAfter([]);

		// Every one of these would be here if nothing were gated.
		expect(LOW_CLASS.length).toBeGreaterThan(20);
		for (const consonant of LOW_CLASS) {
			expect(screen.queryByText(consonant.character)).toBeNull();
		}
	});
});

describe("the palace after lesson 1", () => {
	it("shows the letters that lesson taught", () => {
		palaceAfter([1]);

		// And the empty-state line is gone, which is what proves the panel is
		// rendering contents rather than simply rendering nothing.
		expect(screen.queryByText(/nobody has moved in yet/i)).toBeNull();
		expect(screen.getAllByText("ม").length).toBeGreaterThan(0);
		expect(screen.getAllByText("น").length).toBeGreaterThan(0);
	});

	it("withholds a letter from the same district that belongs to a later lesson", () => {
		palaceAfter([1]);

		// ง is low class and lives in the same harbour, but it is lesson 2's.
		// A district that showed it would be showing the whole class.
		expect(screen.queryByText("ง")).toBeNull();
	});

	it("gives no hint of what is missing", () => {
		palaceAfter([1]);

		// A count would be the same wall of material in a quieter voice, and
		// placeholders would draw the eye to the absence.
		expect(screen.queryByText(/\d+\s+of\s+\d+/)).toBeNull();
		expect(screen.queryByText("?")).toBeNull();
	});
});
