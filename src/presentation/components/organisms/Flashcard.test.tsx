// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { Flashcard } from "./Flashcard";

const SELF_VALIDATION_CARD = {
	id: "sentence:basic-001:selfValidation",
	question: "Come eat together",
	correctAnswer: "มา กิน กัน",
	choices: [],
	audioUrl: "/thai-script/audio/sentence-maa-gin-gan.mp3",
	property: "selfValidation",
};

const SYMBOL_CARD = {
	id: "ม:class",
	question: "What class is this consonant?",
	correctAnswer: "low",
	choices: ["a", "b", "c"],
	audioUrl: "/audio/consonant-mo-ma.mp3",
	symbolCharacter: "ม",
	// Not "recognition"/"initialSound" — those hide the top-box audio button
	// (see `hideAudioHint`), which is a separate, unrelated existing rule
	// this test isn't about.
	property: "class",
};

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: /Show Answer/ }));
}

describe("Flashcard — sentence audio (selfValidation)", () => {
	// No symbolCharacter/promptWord field and property !== "audioRecognition",
	// so this is the one card shape with audio that previously had no player
	// anywhere in this component — see the component's own doc comment on
	// `hasTopAudio`.
	it("plays no audio before reveal, then auto-plays and offers a replay button after", () => {
		render(<Flashcard card={SELF_VALIDATION_CARD} onRate={vi.fn()} />);

		expect(screen.getByText("Come eat together")).toBeTruthy();
		expect(createdAudioUrls()).toHaveLength(0);
		expect(screen.queryByText("มา กิน กัน")).toBeNull();

		reveal();

		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		expect(createdAudioUrls()).toContain(
			"/thai-script/audio/sentence-maa-gin-gan.mp3",
		);
		const replayCountAfterReveal = createdAudioUrls().length;

		fireEvent.click(
			screen.getByRole("button", { name: "Replay pronunciation" }),
		);
		expect(createdAudioUrls().length).toBeGreaterThan(replayCountAfterReveal);
	});

	it("still self-rates correctly with the new audio effect in place", () => {
		const onRate = vi.fn();
		render(<Flashcard card={SELF_VALIDATION_CARD} onRate={onRate} />);

		reveal();
		fireEvent.click(screen.getByRole("button", { name: /Good/ }));

		expect(onRate).toHaveBeenCalledTimes(1);
		expect(onRate.mock.calls[0]?.[0]).toBe(4);
	});
});

describe("Flashcard — existing symbol/vocab audio is unaffected", () => {
	// A card with `symbolCharacter` already gets a player via
	// `ThaiCharDisplay`'s own `PlayAudioButton` ("Play pronunciation") in the
	// top box — the new reveal-time replay button ("Replay pronunciation")
	// must not also appear for this shape.
	it("does not add the new reveal-time replay button for a symbol card", () => {
		render(<Flashcard card={SYMBOL_CARD} onRate={vi.fn()} />);

		expect(
			screen.getByRole("button", { name: "Play pronunciation" }),
		).toBeTruthy();

		reveal();

		expect(
			screen.queryByRole("button", { name: "Replay pronunciation" }),
		).toBeNull();
	});
});
