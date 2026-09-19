// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("DeckSlide — emphasis, without reopening AC4", () => {
	it("renders **bold** as bold and leaves the asterisks out", async () => {
		stubDeckJson(
			DECK_PATH,
			deck([
				{
					kind: "exposition",
					id: "s1",
					heading: "Heading",
					body: ["Both open with the same **head**, high left."],
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		const strong = await screen.findByText("head");
		expect(strong.tagName).toBe("STRONG");
		// The asterisks themselves are gone, not merely unstyled.
		expect(screen.queryByText(/\*\*/)).toBeNull();
	});

	it("renders *italic* too, without the doubled form falling through to it", async () => {
		stubDeckJson(
			DECK_PATH,
			deck([
				{
					kind: "exposition",
					id: "s1",
					heading: "Heading",
					body: ["its *second* loop and its **head**"],
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		expect((await screen.findByText("second")).tagName).toBe("EM");
		// The doubled form has to be tried first: matched by the single-asterisk
		// branch, `**head**` would come out italic and keep a pair of asterisks.
		expect((await screen.findByText("head")).tagName).toBe("STRONG");
		expect(screen.queryByText(/\*/)).toBeNull();
	});

	it("still refuses HTML, which is the boundary AC4 is about", async () => {
		stubDeckJson(
			DECK_PATH,
			deck([
				{
					kind: "exposition",
					id: "s1",
					heading: "Heading",
					// Both in one line: the emphasis is honoured, the markup is not.
					body: ["a **b** <i>c</i>"],
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);

		await screen.findByText("b");
		expect(document.querySelector("i")).toBeNull();
		expect(await screen.findByText(/<i>c<\/i>/)).toBeTruthy();
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
		await waitFor(() =>
			expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1),
		);

		fireEvent.click(screen.getByRole("button", { name: /Next/ }));

		await screen.findByText("second");
		await waitFor(() =>
			expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(2),
		);
	});
});

describe("DeckSlide — one narration per slide", () => {
	const audioUrl = `/thai-script/lessons/${LESSON_ID}/one.mp3`;

	function renderSlide() {
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
				RETRIEVAL,
				REVEAL,
			]),
		);
		render(<DeckSlide deckPath={DECK_PATH} onComplete={() => {}} />);
	}

	it("shows a pause control on arrival, because the slide is already talking", async () => {
		renderSlide();
		await screen.findByText("first");

		// The transport used to own a second narration and knew nothing about
		// the auto-play, so it offered Play over audio already running.
		//
		// `findByRole`, not `getByRole`: the control appears once the auto-play
		// effect has run, and a synchronous read races it. This is the one
		// assertion here about a *transient* state rather than a consequence of
		// one, which is why it was the only test that failed intermittently,
		// and only ever under the full suite's parallel load. It throws when
		// absent, which is the assertion — this project does not load jest-dom.
		await screen.findByRole(
			"button",
			{ name: /Pause audio/ },
			{ timeout: 3000 },
		);
	});

	it("pauses and resumes rather than starting over", async () => {
		renderSlide();
		await screen.findByText("first");
		await waitFor(() =>
			expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1),
		);

		// Pause used to cancel the sequence outright, so play began at the
		// first clip again — a restart wearing a pause button's icon. Resuming
		// carries the same element on, so no new clip is constructed.
		fireEvent.click(await screen.findByRole("button", { name: /Pause audio/ }));
		expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1);

		fireEvent.click(await screen.findByRole("button", { name: /Play audio/ }));
		expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1);
		await screen.findByRole("button", { name: /Pause audio/ });
	});

	it("restarts from the beginning when rewind is pressed", async () => {
		renderSlide();
		await screen.findByText("first");
		await waitFor(() =>
			expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1),
		);

		// The other half of the pair. Rewind is the button that does start
		// over — which is what the two of them used to do identically.
		fireEvent.click(
			await screen.findByRole("button", {
				name: /Restart audio from the beginning/,
			}),
		);
		expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(2);
	});

	it("changes speed without restarting, so the learner keeps their place", async () => {
		renderSlide();
		await screen.findByText("first");
		await waitFor(() =>
			expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1),
		);

		// Changing the rate used to cancel and restart the sequence, which
		// replayed whatever had already been heard. The rate is applied to the
		// clip that is playing instead, so no new clip is constructed.
		fireEvent.click(await screen.findByRole("button", { name: "0.75×" }));
		expect(createdAudioUrls().filter((u) => u === audioUrl)).toHaveLength(1);
		// `findByRole` throws when absent, which is the assertion — this project
		// does not load jest-dom's matchers.
		await screen.findByRole("button", { name: /Pause audio/ });
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
