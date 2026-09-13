// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	createdAudioUrls,
	makeSelfValidationSentenceCard,
	renderWithApp,
} from "../test-utils/renderWithApp";
import { SentencePage } from "./SentencePage";

describe("SentencePage — lesson intro audio", () => {
	// basic-001's words (["มา","กิน","กัน"]) are the exact set that unlocks it —
	// see SentenceLessonService.getUnlockedSentences, which requires every
	// word in a sentence to already be learned. Graduating just these three
	// also unlocks basic-003 (a subset, "มา"/"กัน"), so the lesson batch here
	// is real, unlocked data — not a hand-built fixture.
	it("shows a working play-pronunciation button for a real sentence with wired audio", () => {
		renderWithApp(
			<SentencePage />,
			{},
			{
				graduatedVocab: ["มา", "กิน", "กัน"],
			},
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Learn \d+ New Sentences?/ }),
		);

		// basic-001 ("มา กิน กัน") is first by difficulty/id order.
		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		const playButton = screen.getByRole("button", {
			name: "Play pronunciation",
		});

		fireEvent.click(playButton);

		expect(createdAudioUrls()).toContain(
			"/thai-script/audio/sentence-maa-gin-gan.mp3",
		);
	});
});

describe("SentencePage — quiz translation self-review", () => {
	// Multiple-choice distractor translations can mark a technically-correct
	// rewording wrong, so readingComprehension/listeningComprehension are
	// self-rated (see SentenceSelfReviewCard) instead — same as every other
	// self-graded property in this app.
	it("shows the first quiz card's sentence concatenated and self-rated, not as multiple choice", () => {
		renderWithApp(
			<SentencePage />,
			{},
			{
				graduatedVocab: ["มา", "กิน", "กัน"],
			},
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Learn \d+ New Sentences?/ }),
		);

		while (!screen.queryByRole("button", { name: "Start Quiz" })) {
			fireEvent.click(screen.getByRole("button", { name: "Next" }));
		}
		fireEvent.click(screen.getByRole("button", { name: "Start Quiz" }));

		// basic-001's readingComprehension card is first: concatenated Thai,
		// no word-spaced form, no multiple-choice options.
		expect(screen.getByText("มากินกัน")).toBeTruthy();
		expect(screen.queryByText("มา กิน กัน")).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Come eat together" }),
		).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: /Show Answer/ }));
		expect(screen.getByText("Come eat together")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});
});

describe("SentencePage — review dispatch", () => {
	// A `selfValidation` card's `choices` are always empty by construction
	// (SentenceCardGenerator) — it's a produce-then-self-rate card, never a
	// multiple-choice one. ReviewService.startReviewSession picks
	// "multipleChoice"/"flashcard" from generic SRS progress
	// (`learningStep === null`), which is right for card shapes that support
	// both, but a freshly-learned `selfValidation` card has a non-null
	// `learningStep` (see DEFAULT_SRS) — routing it to `MultipleChoice`
	// renders an empty choice grid with no way to answer.
	it("renders a selfValidation due card as a Flashcard, not an empty choice grid", () => {
		renderWithApp(
			<SentencePage />,
			{},
			{ extraCards: [makeSelfValidationSentenceCard("basic-001")] },
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Review \d+ Due Sentence Cards?/ }),
		);

		expect(screen.getByRole("button", { name: /Show Answer/ })).toBeTruthy();
	});
});
