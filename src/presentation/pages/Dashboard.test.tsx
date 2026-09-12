// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import {
	makeAppValue,
	renderWithApp,
	UNLOCKS_FIRST_GRAMMAR_POINT,
} from "../test-utils/renderWithApp";
import { Dashboard } from "./Dashboard";

describe("Dashboard — Ready to Learn", () => {
	// A brand-new account: nothing unlocked anywhere yet.
	it("shows no Ready to Learn section when nothing is ready", () => {
		renderWithApp(<Dashboard />);

		expect(screen.queryByText("Ready to Learn")).toBeNull();
	});

	// This is the bug report this section exists to fix: a learner whose
	// vocabulary satisfies a grammar point's prerequisites (graduated, not
	// merely introduced — see GrammarLessonService.meetsPrerequisites) saw
	// only "0 due" on the Grammar quick action and had to click through to
	// discover anything was unlockable at all.
	it("shows a Grammar callout once a grammar point's prerequisites are met, and navigates to /grammar", () => {
		renderWithApp(
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/grammar" element={<div>Grammar Page</div>} />
			</Routes>,
			{},
			{ graduatedVocab: UNLOCKS_FIRST_GRAMMAR_POINT },
		);

		expect(screen.getByText("Ready to Learn")).toBeTruthy();
		expect(screen.getByText("Grammar")).toBeTruthy();
		// UNLOCKS_FIRST_GRAMMAR_POINT satisfies exactly the first grammar
		// point's prerequisites, so exactly one is unlocked and unlearned.
		expect(screen.getByText("1 new grammar point")).toBeTruthy();

		fireEvent.click(screen.getAllByText("Learn")[0] as HTMLElement);
		expect(screen.getByText("Grammar Page")).toBeTruthy();
	});

	// A sentence unlocks once every word it uses has been introduced (has a
	// vocab card) — no due count involved either, and previously there was no
	// dashboard entry point to a first sentence lesson at all.
	it("shows a Sentences callout once a sentence's words are learned, and navigates to /sentences", () => {
		renderWithApp(
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/sentences" element={<div>Sentences Page</div>} />
			</Routes>,
			{},
			// The words of sentences "basic-001" (มา, กิน, กัน) and "basic-003"
			// (มา, กัน) — both unlock with just these three words learned.
			{ graduatedVocab: ["มา", "กิน", "กัน"] },
		);

		expect(screen.getByText("Ready to Learn")).toBeTruthy();
		expect(screen.getByText("Sentences")).toBeTruthy();
		expect(screen.getByText("2 new sentences")).toBeTruthy();

		fireEvent.click(screen.getAllByText("Learn")[0] as HTMLElement);
		expect(screen.getByText("Sentences Page")).toBeTruthy();
	});

	// Grammar and Sentences are independent callouts — one being ready must
	// not hide or duplicate the other.
	it("shows both callouts together when both are ready", () => {
		renderWithApp(<Dashboard />, undefined, {
			graduatedVocab: [...UNLOCKS_FIRST_GRAMMAR_POINT, "มา", "กิน", "กัน"],
		});

		expect(screen.getByText("1 new grammar point")).toBeTruthy();
		expect(screen.getByText("2 new sentences")).toBeTruthy();
		expect(screen.getAllByText("Learn")).toHaveLength(2);
	});

	// reconcileCards() backfilling genuinely new cards into an
	// already-completed lesson (e.g. a symbol category wired up after the
	// learner finished it) should surface as its own callout linking to the
	// catch-up intro, not show up cold in review with no explanation.
	it("shows a pending catch-up callout and navigates to its catch-up page", () => {
		const app = makeAppValue();
		const state = app.storage.load();
		state.completedLessons.push(22);
		app.storage.save(state);
		app.value.lesson.reconcileAllContent();

		const pending = app.value.lesson.getPendingCatchUps();
		expect(pending).toHaveLength(1);
		const summary = pending[0]?.summary;
		if (!summary) throw new Error("expected a pending catch-up summary");
		const expectedCount =
			summary.consonants.length +
			summary.vowels.length +
			summary.toneMarks.length +
			summary.rareVowels.length +
			summary.numerals.length +
			summary.toneRules.length;

		renderWithApp(
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route
					path="/catch-up/:lessonNumber"
					element={<div>Catch Up Page</div>}
				/>
			</Routes>,
			app.value,
		);

		expect(screen.getByText("Ready to Learn")).toBeTruthy();
		expect(screen.getByText("Lesson 22 Update")).toBeTruthy();
		expect(screen.getByText(`${expectedCount} new items`)).toBeTruthy();

		fireEvent.click(screen.getByText("Learn"));
		expect(screen.getByText("Catch Up Page")).toBeTruthy();
	});
});
