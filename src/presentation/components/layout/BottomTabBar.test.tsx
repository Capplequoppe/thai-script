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
	// A learner who has completed no lessons yet: only the evergreen tabs.
	// `mobileOnly` renders a single nav instance — without it, the component
	// also renders its (CSS-hidden, but still present in jsdom) desktop nav
	// alongside it, and every link would match twice.
	//
	// Each tab's icon carries an `aria-hidden` `<title>` matching its own
	// label (e.g. LotusIcon's `<title>Home</title>` next to the "Home" tab
	// text) — a plain text query would match both, so tabs are queried by
	// link role/name instead, which correctly ignores the hidden icon title.
	it("shows no Vocab, Grammar, or Sentences tab when nothing is unlocked", () => {
		render(
			<MemoryRouter>
				<BottomTabBar
					vocabUnlocked={false}
					grammarUnlocked={false}
					sentenceUnlocked={false}
					dueCount={0}
					mobileOnly
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Items" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Vocab" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Grammar" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Sentences" })).toBeNull();
	});

	// The mobile bar (`mobileOnly`) previously had no Grammar/Sentences entry
	// at all, regardless of unlock state — the only paths to those pages were
	// the desktop-only nav and, for Grammar, the Dashboard's quick action.
	// This is the regression the tab bar must not reintroduce.
	it("gives the mobile bar Grammar and Sentences tabs once unlocked", () => {
		render(
			<MemoryRouter>
				<BottomTabBar
					vocabUnlocked={true}
					grammarUnlocked={true}
					sentenceUnlocked={true}
					dueCount={0}
					mobileOnly
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Vocab" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Grammar" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Sentences" })).toBeTruthy();
	});

	// Unlocking one pool must not leak tabs for the others.
	it("unlocks tabs independently per pool", () => {
		render(
			<MemoryRouter>
				<BottomTabBar
					vocabUnlocked={false}
					grammarUnlocked={true}
					sentenceUnlocked={false}
					dueCount={0}
					mobileOnly
				/>
			</MemoryRouter>,
		);

		expect(screen.queryByRole("link", { name: "Vocab" })).toBeNull();
		expect(screen.getByRole("link", { name: "Grammar" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Sentences" })).toBeNull();
	});
});
