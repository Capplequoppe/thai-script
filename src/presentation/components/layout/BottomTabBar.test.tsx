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
	it("shows five evergreen tabs before vocabulary unlocks", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={false} dueCount={0} mobileOnly />
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Learn" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Items" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Progress" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
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

	// Tabs now share the row's width (`flex-1`) instead of sizing to their
	// own content inside an `overflow-x-auto` scroller, so an extra tab makes
	// every tab narrower rather than silently pushing the last one off-screen.
	// The ceiling is still worth pinning: six tabs is what the 390px viewport
	// was measured against, and past that the labels stop being readable.
	it("never exceeds six tabs, even fully unlocked", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={12} mobileOnly />
			</MemoryRouter>,
		);

		expect(screen.getAllByRole("link")).toHaveLength(6);
	});

	// Grammar, Sentences and Game are lanes in the Learn hub, not tabs;
	// `LearnPage.test` is what guards their reachability.
	it("does not carry the destinations that live in the Learn hub", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={0} mobileOnly />
			</MemoryRouter>,
		);

		for (const gone of ["Grammar", "Sentences", "Game", "Vocab"]) {
			expect(screen.queryByRole("link", { name: gone })).toBeNull();
		}
	});

	// Settings is a tab again rather than a gear on Home: on the primary
	// screen that gear sat in the most valuable space in the app for its
	// least-used destination.
	it("reaches Settings from the bar", () => {
		render(
			<MemoryRouter>
				<BottomTabBar vocabUnlocked={true} dueCount={0} mobileOnly />
			</MemoryRouter>,
		);

		expect(
			screen.getByRole("link", { name: "Settings" }).getAttribute("href"),
		).toBe("/settings");
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
