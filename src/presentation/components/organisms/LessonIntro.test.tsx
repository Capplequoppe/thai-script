// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LessonContent } from "../../../domain/script/data/lessonContent";
import type { LessonSummary } from "../../../domain/script/services/ScriptLessonService";
import { stubDeckJson } from "../../test-utils/renderWithApp";
import { LessonIntro } from "./LessonIntro";

const CONSONANT = {
	character: "ม",
	name: "มอ ม้า",
	nameRomanized: "mo maa",
	nameMeaning: "horse",
	classType: "low",
	initialSound: "m",
	finalSound: "m",
	hasDeadEnding: false,
	isAspirated: false,
};

const SUMMARY: LessonSummary = {
	lessonNumber: 1,
	title: "Lesson One",
	focus: "Introduction",
	consonants: [CONSONANT, { ...CONSONANT, character: "น" }],
	vowels: [],
	toneMarks: [],
	rareVowels: [],
	numerals: [],
	toneRules: [],
	// Added on main: the special rules a lesson introduces, which gate whether
	// a word's tone may be asked for. This fixture teaches none.
	specialRules: [],
};

const VIDEO_CONTENT: LessonContent = {
	kind: "video",
	url: "https://example.com/lesson-01.webm",
};

const DECK_PATH = "/thai-script/lessons/lesson-01/deck.json";
const DECK_CONTENT: LessonContent = { kind: "deck", deckPath: DECK_PATH };

const VALID_DECK = {
	lessonId: "lesson-01",
	title: "A lesson",
	slides: [
		{
			kind: "exposition",
			id: "welcome",
			heading: "Welcome",
			body: ["Meet the first letter."],
		},
		{
			kind: "retrieval",
			id: "try-1",
			prompt: "What sound does it make?",
			revealSlideId: "show-1",
		},
		{
			kind: "reveal",
			id: "show-1",
			retrievalSlideId: "try-1",
			answers: ["m"],
		},
	],
};

describe("LessonIntro — dispatching on LessonContent (AC1)", () => {
	it("a video-arm lesson renders the video element, unchanged", () => {
		render(
			<LessonIntro
				summary={SUMMARY}
				content={VIDEO_CONTENT}
				onComplete={vi.fn()}
			/>,
		);

		const video = document.querySelector("video");
		expect(video).toBeTruthy();
		expect(video?.getAttribute("src")).toBe(VIDEO_CONTENT.url);
	});

	it("a deck-arm lesson renders its first slide's text, ahead of the symbol cards", async () => {
		stubDeckJson(DECK_PATH, VALID_DECK);
		render(
			<LessonIntro
				summary={SUMMARY}
				content={DECK_CONTENT}
				onComplete={vi.fn()}
			/>,
		);

		expect(await screen.findByText("Meet the first letter.")).toBeTruthy();
		expect(document.querySelector("video")).toBeNull();
		expect(screen.queryByText(CONSONANT.nameRomanized)).toBeNull();
	});
});

describe("LessonIntro — onComplete fires exactly once (AC6)", () => {
	it("stepping backward and forward after completion does not call it again", () => {
		const onComplete = vi.fn();
		render(
			<LessonIntro
				summary={SUMMARY}
				content={VIDEO_CONTENT}
				onComplete={onComplete}
			/>,
		);

		// video -> consonant 1 -> consonant 2 (the last slide)
		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(onComplete).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Start Quiz" }));
		expect(onComplete).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: "Back" }));
		fireEvent.click(screen.getByRole("button", { name: "Next" }));

		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});
