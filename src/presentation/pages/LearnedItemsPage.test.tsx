// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { renderWithApp } from "../test-utils/renderWithApp";
import { LearnedItemsPage } from "./LearnedItemsPage";

/** Position 19 is the numerals lesson — the case that motivated paging: a
 *  short category a learner wants to flick through end to end.
 *
 *  It was 23 on main. This branch resequenced the course and `RETIRED_LESSONS`
 *  records 23, 24 and 25 as absorbed into one `lesson-numerals`, which the
 *  declaration places last so an optional track cannot block the course. */
const NUMERALS_LESSON = 19;

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

		// ๐ first: the lesson teaches all ten digits in arabic order.
		fireEvent.click(screen.getByText("๐"));
		expect(pagerPosition()).toBe("1 / 10");

		fireEvent.click(screen.getByRole("button", { name: "Next item" }));

		expect(pagerPosition()).toBe("2 / 10");
		expect(screen.getByText("๑")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Previous item" }));

		expect(pagerPosition()).toBe("1 / 10");
		expect(screen.getByText("๐")).toBeTruthy();
	});

	// The tabs are the grouping, so paging stops at a category's edge rather
	// than rolling the learner into the next one.
	it("stops at the ends of the active tab", () => {
		renderPage();
		openNumeralsTab();

		fireEvent.click(screen.getByText("๐"));
		expect(
			screen
				.getByRole("button", { name: "Previous item" })
				.hasAttribute("disabled"),
		).toBe(true);

		// ๐ to ๙ is nine presses.
		for (let step = 0; step < 9; step += 1) {
			fireEvent.click(screen.getByRole("button", { name: "Next item" }));
		}

		expect(pagerPosition()).toBe("10 / 10");
		expect(
			screen
				.getByRole("button", { name: "Next item" })
				.hasAttribute("disabled"),
		).toBe(true);
	});

	it("returns to the list from a paged-to item", () => {
		renderPage();
		openNumeralsTab();

		fireEvent.click(screen.getByText("๐"));
		fireEvent.click(screen.getByRole("button", { name: "Next item" }));
		fireEvent.click(screen.getByRole("button", { name: /Back to list/ }));

		// Back on the grid: the whole tab visible again, no pager.
		expect(screen.getByText("๙")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Next item" })).toBeNull();
	});
});
