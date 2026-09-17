// @vitest-environment jsdom
/**
 * The map's job is navigation, so these check you can get into each kind of
 * place and that what you find there is that place's own content — not that
 * the boxes are in the right pixels.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { renderWithApp } from "../test-utils/renderWithApp";
import { MemoryPalacePage } from "./MemoryPalacePage";

function renderPalace() {
	return renderWithApp(<MemoryPalacePage />, {
		state: new InMemoryStorage().load(),
	});
}

describe("MemoryPalacePage", () => {
	it("shows all three kinds of place at once, which is the point of a map", () => {
		renderPalace();

		expect(screen.getByRole("button", { name: /rice paddy/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /temple/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /particles/i })).toBeTruthy();
	});

	it("waits to be asked before showing anything's insides", () => {
		renderPalace();
		expect(screen.getByText(/pick a place to go inside/i)).toBeTruthy();
	});

	it("gathers every scene that ends in one tone into that tone's place", () => {
		renderPalace();
		fireEvent.click(screen.getByRole("button", { name: /^well/i }));

		// The well holds the four dead-syllable rules for mid and high class
		// and both mai ek rules for those classes — two scenes, one outcome.
		expect(screen.getByText(/fall down the same well/i)).toBeTruthy();
		expect(screen.getByText(/run through by a single spear/i)).toBeTruthy();
		expect(screen.getByText(/that is what makes it one place/i)).toBeTruthy();
	});

	it("says how many rules a merged scene stands for", () => {
		renderPalace();
		fireEvent.click(screen.getByRole("button", { name: /^well/i }));
		expect(screen.getByText(/4 rules, which agree/)).toBeTruthy();
	});

	it("puts a district's own letters and its cast behind the district", () => {
		renderPalace();
		fireEvent.click(screen.getByRole("button", { name: /harbor/i }));

		// The detail sentence, which no button carries — "low class" alone
		// matches the district button too.
		expect(screen.getByText(/this district sends its fisherman/i)).toBeTruthy();

		// ม is low class, so the harbor holds it. ก is mid and must not be here.
		expect(screen.getByTitle("ม ม้า")).toBeTruthy();
		expect(screen.queryByTitle("ก ไก่")).toBeNull();
	});

	it("swaps the panel rather than stacking places", () => {
		renderPalace();
		fireEvent.click(screen.getByRole("button", { name: /^well/i }));
		expect(screen.getByText(/fall down the same well/i)).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /rice paddy/i }));
		expect(screen.queryByText(/fall down the same well/i)).toBeNull();
		expect(screen.getByText(/flat rice paddy/i)).toBeTruthy();
	});
});
