// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
	AudibleMinimalPairOption,
	MinimalPairGameItem,
	MinimalPairOption,
} from "../../../domain/game/types";
import { createdAudioUrls, StubAudio } from "../../test-utils/renderWithApp";
import {
	CORRECT_RATING,
	INCORRECT_RATING,
	MinimalPairChallenge,
} from "./MinimalPairChallenge";

const MAI: AudibleMinimalPairOption = {
	thaiWord: "ไม่",
	englishMeaning: "not",
	tones: ["falling"],
	audioUrl: "/a/maj.mp3",
};
const MAI_Q: AudibleMinimalPairOption = {
	thaiWord: "ไหม",
	englishMeaning: "question particle",
	tones: ["rising"],
	audioUrl: "/a/mai.mp3",
};
/** No recording — only ever a distractor for the audio-prompt directions. */
const MAI_NEW: MinimalPairOption = {
	thaiWord: "ใหม่",
	englishMeaning: "new",
	tones: ["low"],
};

function audioPromptItem(
	challengeDirection: "toneFromAudio" | "meaningFromAudio",
	options: readonly MinimalPairOption[] = [MAI, MAI_NEW],
): MinimalPairGameItem {
	return {
		kind: "minimalPair",
		groupKey: "m a j",
		thaiWord: MAI.thaiWord,
		englishMeaning: MAI.englishMeaning,
		tones: MAI.tones,
		audioUrl: MAI.audioUrl,
		challengeDirection,
		options,
	};
}

function audioOptionItem(
	challengeDirection: "audioFromMeaning" | "audioFromTone",
): MinimalPairGameItem {
	return {
		kind: "minimalPair",
		groupKey: "m a j",
		thaiWord: MAI.thaiWord,
		englishMeaning: MAI.englishMeaning,
		tones: MAI.tones,
		audioUrl: MAI.audioUrl,
		challengeDirection,
		options: [MAI, MAI_Q],
	};
}

function answerWith(text: string) {
	fireEvent.click(screen.getByRole("button", { name: new RegExp(text) }));
}

describe("MinimalPairChallenge", () => {
	it("plays the target on arrival when the prompt is the audio", () => {
		StubAudio.createdUrls = [];
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={vi.fn()}
			/>,
		);

		expect(createdAudioUrls()).toEqual(["/a/maj.mp3"]);
	});

	it("plays nothing on arrival when the audio IS the answer", () => {
		StubAudio.createdUrls = [];
		render(
			<MinimalPairChallenge
				item={audioOptionItem("audioFromMeaning")}
				onRate={vi.fn()}
			/>,
		);

		expect(createdAudioUrls()).toEqual([]);
	});

	it("toneFromAudio labels its options with tone patterns, never with the words", () => {
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={vi.fn()}
			/>,
		);

		expect(screen.getByText("Which tones do you hear?")).toBeTruthy();
		expect(screen.getByText("Falling")).toBeTruthy();
		expect(screen.getByText("Low")).toBeTruthy();
		expect(screen.queryByText("ไม่")).toBeNull();
	});

	it("meaningFromAudio labels its options with the English meanings", () => {
		render(
			<MinimalPairChallenge
				item={audioPromptItem("meaningFromAudio")}
				onRate={vi.fn()}
			/>,
		);

		expect(screen.getByText("What does this mean?")).toBeTruthy();
		expect(screen.getByText("not")).toBeTruthy();
		expect(screen.getByText("new")).toBeTruthy();
	});

	it("audioFromMeaning prompts with the meaning and shows no Thai before answering", () => {
		render(
			<MinimalPairChallenge
				item={audioOptionItem("audioFromMeaning")}
				onRate={vi.fn()}
			/>,
		);

		expect(screen.getByText("Which one means this?")).toBeTruthy();
		expect(screen.getByText("not")).toBeTruthy();
		// The whole point of the exercise: the answer must be inaudible-only.
		expect(screen.queryByText("ไม่")).toBeNull();
		expect(screen.queryByText("ไหม")).toBeNull();
		expect(screen.getAllByRole("button", { name: /Play option/ })).toHaveLength(
			2,
		);
	});

	it("audioFromTone prompts with the target's tone pattern", () => {
		render(
			<MinimalPairChallenge
				item={audioOptionItem("audioFromTone")}
				onRate={vi.fn()}
			/>,
		);

		expect(screen.getByText("Which one has these tones?")).toBeTruthy();
		expect(screen.getByText("Falling")).toBeTruthy();
	});

	it("an option's clip plays the clip, not the target's", () => {
		render(
			<MinimalPairChallenge
				item={audioOptionItem("audioFromTone")}
				onRate={vi.fn()}
			/>,
		);
		StubAudio.createdUrls = [];

		fireEvent.click(screen.getByRole("button", { name: "Play option 2" }));

		expect(createdAudioUrls()).toEqual(["/a/mai.mp3"]);
	});

	it("grades a right answer itself and never asks for a self-rating", () => {
		const onRate = vi.fn();
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={onRate}
			/>,
		);

		answerWith("Falling");

		expect(screen.getByText("Correct")).toBeTruthy();
		// No RatingButtons anywhere — this is the auto-graded challenge.
		expect(screen.queryByRole("button", { name: "Good" })).toBeNull();
		expect(onRate).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(onRate).toHaveBeenCalledWith(CORRECT_RATING);
	});

	it("grades a wrong answer as incorrect and still reveals the right one", () => {
		const onRate = vi.fn();
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={onRate}
			/>,
		);

		answerWith("Low");

		expect(screen.getByText("Not quite")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(onRate).toHaveBeenCalledWith(INCORRECT_RATING);
	});

	it("reveals every option's word, tones and meaning once answered", () => {
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={vi.fn()}
			/>,
		);

		answerWith("Falling");

		expect(screen.getAllByText("ไม่").length).toBeGreaterThan(0);
		expect(screen.getAllByText("ใหม่").length).toBeGreaterThan(0);
		expect(screen.getByText("Low · new")).toBeTruthy();
	});

	it("makes the target's clip replayable after an audio-prompt answer", () => {
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={vi.fn()}
			/>,
		);
		expect(screen.queryByRole("button", { name: /Play option/ })).toBeNull();

		answerWith("Falling");

		// Only ไม่ has a clip; ใหม่ has none, so exactly one appears.
		expect(screen.getAllByRole("button", { name: /Play option/ })).toHaveLength(
			1,
		);
	});

	it("locks the options once answered", () => {
		const onRate = vi.fn();
		render(
			<MinimalPairChallenge
				item={audioPromptItem("toneFromAudio")}
				onRate={onRate}
			/>,
		);

		answerWith("Low");
		answerWith("Falling");

		expect(screen.getByText("Not quite")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(onRate).toHaveBeenCalledWith(INCORRECT_RATING);
	});

	it("resets and replays when the item changes, even sharing an audio url", () => {
		const first = audioPromptItem("toneFromAudio");
		const second: MinimalPairGameItem = {
			...audioPromptItem("meaningFromAudio"),
			// Same clip, different question — reset must key on the item, not
			// the url (two consecutive items reuse this component instance).
			audioUrl: first.audioUrl,
		};
		const { rerender } = render(
			<MinimalPairChallenge item={first} onRate={vi.fn()} />,
		);
		answerWith("Falling");
		expect(screen.getByText("Correct")).toBeTruthy();

		StubAudio.createdUrls = [];
		rerender(<MinimalPairChallenge item={second} onRate={vi.fn()} />);

		expect(screen.queryByText("Correct")).toBeNull();
		expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
		expect(createdAudioUrls()).toEqual(["/a/maj.mp3"]);
	});
});
