// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { makeAppValue, renderWithApp } from "../test-utils/renderWithApp";
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

	it("introduces just the backfilled items for a pending catch-up", () => {
		const app = makeAppValue();
		const state = app.storage.load();
		state.completedLessons.push(22);
		app.storage.save(state);
		app.value.lesson.reconcileAllContent();

		renderAt(22, app.value);

		expect(screen.getByText("New in Lesson 22")).toBeTruthy();
		// No video slide — the learner already watched it the first time.
		expect(screen.queryByTitle(/^Lesson 22:/)).toBeNull();

		// Slide order is consonants, then rare vowels: lesson 22's 3 obsolete
		// consonants (ฃ, ฅ, ฌ) come first, then its 4 rare vowels.
		for (let i = 0; i < 3; i++) {
			fireEvent.click(screen.getByText("Next"));
		}
		// Lesson 22's rare vowels (ฤ, ฤๅ, ฦ, ฦๅ) are exactly the content this
		// catch-up flow exists for.
		expect(screen.getByText("rue")).toBeTruthy();
	});
});
