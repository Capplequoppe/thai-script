// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	createdAudioUrls,
	stubDeckFetchError,
	stubDeckJson,
} from "../../test-utils/renderWithApp";
import { DeckSlide } from "./DeckSlide";

const LESSON_ID = "lesson-01";
const DECK_PATH = `/thai-script/lessons/${LESSON_ID}/deck.json`;

const RETRIEVAL = {
	kind: "retrieval",
	id: "try-1",
	prompt: "Which sound does this letter make?",
	revealSlideId: "show-1",
};
const REVEAL = {
	kind: "reveal",
	id: "show-1",
	retrievalSlideId: "try-1",
	answers: ["m, like 'mother'"],
};

function deck(slides: unknown[]) {
	return { lessonId: LESSON_ID, title: "A lesson", slides };
}

describe("DeckSlide — invalid deck (AC2)", () => {
	it("renders the validation failure and no slide content", async () => {
		stubDeckJson(DECK_PATH, {
			lessonId: LESSON_ID,
			title: "A lesson",
			slides: [{ kind: "exposition", id: "s1", body: ["missing a heading"] }],
		});
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		const message = await screen.findByRole("alert");
		expect(message.textContent).toContain("heading");
		expect(screen.queryByText("missing a heading")).toBeNull();
	});
});

describe("DeckSlide — the three states never collapse (AC3)", () => {
	it("an empty deck and a failed fetch produce different output", async () => {
		stubDeckJson(DECK_PATH, deck([]));
		const { rerender } = render(
			<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />,
		);
		const empty = (await screen.findByText(/no slides yet/i)).textContent;
		expect(screen.queryByRole("alert")).toBeNull();

		const failedPath = `/thai-script/lessons/${LESSON_ID}/other-deck.json`;
		stubDeckFetchError(failedPath);
		rerender(<DeckSlide deckPath={failedPath} onComplete={() => {}} />);
		const failure = (await screen.findByRole("alert")).textContent;

		expect(empty).not.toBe(failure);
	});
});

describe("DeckSlide — text-only rendering (AC4)", () => {
	it("shows markup characters literally rather than interpreting them", async () => {
		stubDeckJson(
			DECK_PATH,
			deck([
				{
					kind: "exposition",
					id: "s1",
					heading: "Heading",
					body: ["<b>x</b>"],
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		expect(await screen.findByText("<b>x</b>")).toBeTruthy();
		expect(document.querySelector("b")).toBeNull();
	});
});

describe("DeckSlide — audio resets on advance, keyed on identity (AC5)", () => {
	it("plays audio again when advancing to a slide sharing the same clip", async () => {
		const audioUrl = `/thai-script/lessons/${LESSON_ID}/shared.mp3`;
		stubDeckJson(
			DECK_PATH,
			deck([
				{
					kind: "exposition",
					id: "s1",
					heading: "One",
					body: ["first"],
					audioUrl,
				},
				{
					kind: "exposition",
					id: "s2",
					heading: "Two",
					body: ["second"],
					audioUrl,
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		await screen.findByText("first");
		expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1);

		fireEvent.click(screen.getByRole("button", { name: /Next/ }));

		await screen.findByText("second");
		expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(2);
	});
});

describe("DeckSlide — retrieval before reveal (AC7)", () => {
	it("renders the retrieval prompt without its answer present in the DOM", async () => {
		stubDeckJson(DECK_PATH, deck([RETRIEVAL, REVEAL]));
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		expect(
			await screen.findByText("Which sound does this letter make?"),
		).toBeTruthy();
		expect(screen.queryByText(/m, like 'mother'/)).toBeNull();
	});

	it("keeps the reveal slide's answer hidden until the learner acts", async () => {
		stubDeckJson(DECK_PATH, deck([RETRIEVAL, REVEAL]));
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		await screen.findByText("Which sound does this letter make?");
		fireEvent.click(screen.getByRole("button", { name: /Continue|Next/ }));

		expect(screen.queryByText(/m, like 'mother'/)).toBeNull();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));

		expect(screen.getByText(/m, like 'mother'/)).toBeTruthy();
	});
});

describe("DeckSlide — rule slide", () => {
	// Lesson 2 is the first to introduce a tone rule ("low-live") — a rule
	// slide renders from the lesson's own rules block, never its own prose,
	// so this proves that wiring end to end rather than just parsing.
	const RULE_LESSON_ID = "lesson-02";
	const RULE_DECK_PATH = `/thai-script/lessons/${RULE_LESSON_ID}/deck.json`;

	it("renders the rule's title and text from the lesson's rules block", async () => {
		stubDeckJson(RULE_DECK_PATH, {
			lessonId: RULE_LESSON_ID,
			title: "A lesson",
			slides: [
				{ kind: "rule", id: "r1", ruleId: "low-live" },
				RETRIEVAL,
				REVEAL,
			],
		});
		render(<DeckSlide deckPath={RULE_DECK_PATH} onComplete={() => {}} />);

		expect(await screen.findByText(/A mid tone is pronounced/)).toBeTruthy();
	});
});

describe("DeckSlide — a refused audioUrl is distinguishable from no audio (trust boundary)", () => {
	it("warns and renders no replay button for an audioUrl outside its own lesson's asset root", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		stubDeckJson(
			DECK_PATH,
			deck([
				{
					kind: "exposition",
					id: "s1",
					heading: "One",
					body: ["first"],
					audioUrl: "/thai-script/lessons/someone-elses-lesson/track.mp3",
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		await screen.findByText("first");
		expect(screen.queryByRole("button", { name: "Replay audio" })).toBeNull();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining(LESSON_ID));

		warn.mockRestore();
	});
});
