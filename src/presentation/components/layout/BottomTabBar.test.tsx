// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
// Imported for its side effects: registers `afterEach(cleanup)` — there is
// no `globals: true` / `setupFiles`, so Testing-Library's auto-cleanup never
// registers on its own, and without it each test's DOM leaks into the next.
import "../../test-utils/renderWithApp";
import { BottomTabBar } from "./BottomTabBar";

describe("BottomTabBar", () => {
	// `mobileOnly` renders a single nav instance — without it, the component
	// also renders its (CSS-hidden, but still present in jsdom) desktop nav
	// alongside it, and every link would match twice.
	//
	// Each tab's icon carries an `aria-hidden` `<title>` matching its own
	// label (e.g. LotusIcon's `<title>Home</title>` next to the "Home" tab
	// text) — a plain text query would match both, so tabs are queried by
	// link role/name instead, which correctly ignores the hidden icon title.
	it("shows four evergreen tabs before vocabulary unlocks", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={false} dueCount={0} mobileOnly />
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Learn" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Items" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Progress" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Dictionary" })).toBeNull();
	});

	it("adds the Dictionary tab once vocabulary unlocks", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={0} mobileOnly />
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Dictionary" })).toBeTruthy();
	});

	// The point of the restructure. The bar is a fixed-height row with
	// `overflow-x-auto`, so tabs past the fifth scroll off-screen on a phone
	// with no affordance at all. Grammar, Sentences and Game became lanes in
	// the Learn hub and Settings moved to the Home/desktop headers to buy that
	// budget back — this is the regression that must not creep back in.
	it("never exceeds five tabs, even fully unlocked", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={12} mobileOnly />
			</MemoryRouter>,
		);

		expect(screen.getAllByRole("link")).toHaveLength(5);
	});

	// These are all still reachable — Grammar/Sentences/Game through the Learn
	// hub, Settings through the headers — just not from here. `LearnPage.test`
	// is what guards their reachability.
	it("does not carry the destinations that moved off the bar", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={0} mobileOnly />
			</MemoryRouter>,
		);

		for (const gone of ["Grammar", "Sentences", "Game", "Settings", "Vocab"]) {
			expect(screen.queryByRole("link", { name: gone })).toBeNull();
		}
	});

	it("badges the Home tab with the due count", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={7} mobileOnly />
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: /Home/ }).textContent).toContain(
			"7",
		);
	});
});
