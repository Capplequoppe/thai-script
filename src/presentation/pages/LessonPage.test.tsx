// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { renderWithApp, stubDeckJson } from "../test-utils/renderWithApp";
import { LessonPage } from "./LessonPage";

function renderAt(position: number) {
	return renderWithApp(
		<Routes>
			<Route path="/lesson/:lessonNumber" element={<LessonPage />} />
		</Routes>,
		{},
		{ route: `/lesson/${position}` },
	);
}

describe("LessonPage — content resolution keys off position, not legacy number", () => {
	// Task 4.3's resequence made `position` and `legacyNumber` diverge from
	// position 15 on (`lessonSequence.ts`'s `lessonEntryByPosition` doc
	// comment). `LessonPage` used to look content up with
	// `lessonEntryByNumber(num)` — the legacy-number lookup — against `num`,
	// which is actually the URL's *position*. For any position past 14 that
	// silently misresolves to "undeclared", even though
	// `lesson.getScriptSummary` (routed through `entryAt`, position-based
	// throughout) already found the lesson fine. Task 6.2 fixed the call to
	// `lessonEntryByPosition`; this pins it so a regression shows up as a
	// broken lesson page rather than as a silent divergence again.
	it("renders the deck for position 15 (lesson-unwritten-vowels, legacy number 26)", async () => {
		stubDeckJson("/thai-script/lessons/lesson-unwritten-vowels/deck.json", {
			lessonId: "lesson-unwritten-vowels",
			title: "Vowels That Are Not Written",
			slides: [
				{
					kind: "exposition",
					id: "s1",
					heading: "Unwritten vowels",
					body: ["A vowel a lesson doesn't spell."],
				},
				{
					kind: "retrieval",
					id: "try",
					prompt:
						"How many consonants with nothing between them imply a short o?",
					revealSlideId: "show",
				},
				{
					kind: "reveal",
					id: "show",
					retrievalSlideId: "try",
					answers: ["two"],
				},
			],
		});

		renderAt(15);

		// Never the undeclared/unresolvable error branch: that branch shows
		// this exact copy instead of a heading matching the summary.
		expect(screen.queryByText("Lesson not found")).toBeNull();
		expect(await screen.findByText("Unwritten vowels")).toBeTruthy();
		expect(screen.getByText("Lesson 15")).toBeTruthy();
	});
});
