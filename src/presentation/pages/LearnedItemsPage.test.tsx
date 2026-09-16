// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { renderWithApp } from "../test-utils/renderWithApp";
import { LearnedItemsPage } from "./LearnedItemsPage";

/** Lesson 23 is the numerals lesson — ๑ ๒ ๓, the case that motivated
 *  paging: a short category a learner wants to flick through end to end. */
const NUMERALS_LESSON = 23;

function renderPage(completedLessons: number[] = [NUMERALS_LESSON]) {
	const state = new InMemoryStorage().load();
	state.completedLessons.push(...completedLessons);
	return renderWithApp(<LearnedItemsPage />, { state });
}

function openNumeralsTab() {
	fireEvent.click(screen.getByRole("button", { name: /^Numerals/ }));
}

function pagerPosition() {
	return screen.getByText(/^\d+ \/ \d+$/).textContent;
}

describe("LearnedItemsPage", () => {
	it("pages through a tab's items in the order the grid shows them", () => {
		renderPage();
		openNumeralsTab();

		fireEvent.click(screen.getByText("๑"));
		expect(pagerPosition()).toBe("1 / 3");

		fireEvent.click(screen.getByRole("button", { name: "Next item" }));

		expect(pagerPosition()).toBe("2 / 3");
		expect(screen.getByText("๒")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Previous item" }));

		expect(pagerPosition()).toBe("1 / 3");
		expect(screen.getByText("๑")).toBeTruthy();
	});

	// The tabs are the grouping, so paging stops at a category's edge rather
	// than rolling the learner into the next one.
	it("stops at the ends of the active tab", () => {
		renderPage();
		openNumeralsTab();

		fireEvent.click(screen.getByText("๑"));
		expect(
			screen
				.getByRole("button", { name: "Previous item" })
				.hasAttribute("disabled"),
		).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "Next item" }));
		fireEvent.click(screen.getByRole("button", { name: "Next item" }));

		expect(pagerPosition()).toBe("3 / 3");
		expect(
			screen
				.getByRole("button", { name: "Next item" })
				.hasAttribute("disabled"),
		).toBe(true);
	});

	it("returns to the list from a paged-to item", () => {
		renderPage();
		openNumeralsTab();

		fireEvent.click(screen.getByText("๑"));
		fireEvent.click(screen.getByRole("button", { name: "Next item" }));
		fireEvent.click(screen.getByRole("button", { name: /Back to list/ }));

		// Back on the grid: all three numerals visible, no pager.
		expect(screen.getByText("๓")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Next item" })).toBeNull();
	});
});
