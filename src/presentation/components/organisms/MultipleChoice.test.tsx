// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { MultipleChoice } from "./MultipleChoice";

const LISTENING_COMPREHENSION_CARD = {
	id: "sentence:basic-001:listeningComprehension",
	question: "Listen to the sentence. What does it mean?",
	correctAnswer: "Come eat together",
	choices: [
		"Come eat together",
		"Come sleep together",
		"Go eat alone",
		"Come drink together",
	],
	audioUrl: "/thai-script/audio/sentence-maa-gin-gan.mp3",
	property: "listeningComprehension",
};

const READING_COMPREHENSION_CARD = {
	...LISTENING_COMPREHENSION_CARD,
	id: "sentence:basic-001:readingComprehension",
	question: "มา กิน กัน",
	property: "readingComprehension",
};

describe("MultipleChoice — sentence listening comprehension audio", () => {
	// listeningComprehension has no symbolCharacter/promptWord of its own for
	// the existing boxes to key off — see the component's own doc comment on
	// `playsAudioUpfront`. Unlike selfValidation's Flashcard fix, this one
	// plays immediately: "hear it, then pick the meaning" is the whole point
	// of this card, the same as vocab/symbol's audioRecognition property.
	it("auto-plays audio on mount and offers a replay button", () => {
		render(
			<MultipleChoice card={LISTENING_COMPREHENSION_CARD} onAnswer={vi.fn()} />,
		);

		expect(createdAudioUrls()).toContain(
			"/thai-script/audio/sentence-maa-gin-gan.mp3",
		);
		expect(
			screen.getByRole("button", { name: "Replay pronunciation" }),
		).toBeTruthy();
	});

	// A sentence's readingComprehension card shows the Thai text itself
	// (via `card.question`) and must not also start playing audio — reading
	// and listening are deliberately different challenges over the same
	// content.
	it("does not play audio for a readingComprehension card", () => {
		render(
			<MultipleChoice card={READING_COMPREHENSION_CARD} onAnswer={vi.fn()} />,
		);

		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		expect(createdAudioUrls()).toHaveLength(0);
		expect(
			screen.queryByRole("button", { name: "Replay pronunciation" }),
		).toBeNull();
	});
});
