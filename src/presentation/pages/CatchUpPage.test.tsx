// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import {
	makeAppValue,
	renderWithApp,
	stubDeckJson,
} from "../test-utils/renderWithApp";
import { CatchUpPage } from "./CatchUpPage";

function renderAt(lessonNumber: number, overrides = {}) {
	return renderWithApp(
		<Routes>
			<Route path="/catch-up/:lessonNumber" element={<CatchUpPage />} />
		</Routes>,
		overrides,
		{ route: `/catch-up/${lessonNumber}` },
	);
}

describe("CatchUpPage", () => {
	it("shows a not-found message when the lesson has no pending catch-up", () => {
		renderAt(22);

		expect(screen.getByText("Nothing to catch up on.")).toBeTruthy();
	});

	it("introduces just the backfilled items for a pending catch-up", async () => {
		const app = makeAppValue();
		// The rare-tail lesson serves a deck (task 4.3), and a catch-up renders
		// the same deck as the ordinary route (task 1.2 AC1) — so a minimal
		// schema-valid deck is served through the stubbed fetch. (This file
		// typechecks under the DOM tsconfig, so it cannot read the committed
		// deck off disk; `sequenceClosure.test.ts` proves that one.)
		stubDeckJson("/thai-script/lessons/lesson-14/deck.json", {
			lessonId: "lesson-14",
			title: "The rare tail",
			slides: [
				{
					kind: "retrieval",
					id: "try",
					prompt: "Which letter is the rare harbor kh?",
					revealSlideId: "show",
				},
				{
					kind: "reveal",
					id: "show",
					retrievalSlideId: "try",
					answers: ["ฆ"],
				},
			],
		});
		const state = app.storage.load();
		state.completedLessons.push(14);
		app.storage.save(state);
		app.value.lesson.reconcileAllContent();

		renderAt(14, app.value);

		expect(screen.getByText("New in Lesson 14")).toBeTruthy();
		// No video slide — the learner already watched it the first time.
		expect(screen.queryByTitle(/^Lesson 14:/)).toBeNull();

		// The rare tail is a deck lesson now, so the intro walks the deck
		// first (its own stepping: Show Answer on retrieval slides, Continue
		// at the end) and the card slides after. Walk forward until the first
		// rare vowel (ฤ, named "rue") appears — the rare vowels are exactly
		// the content this catch-up flow exists for, and reaching one proves
		// the walk includes them.
		// The deck arrives through the stubbed fetch, so wait for its first
		// stepping control before walking.
		await screen.findByText(/Show Answer|Next|Continue/);
		let walked = 0;
		while (screen.queryByText("rue") === null && walked < 60) {
			const step =
				screen.queryByText("Show Answer") ??
				screen.queryByText("Next") ??
				screen.queryByText("Continue");
			if (!step) break;
			fireEvent.click(step);
			walked += 1;
		}
		expect(screen.getByText("rue")).toBeTruthy();
	});
});
