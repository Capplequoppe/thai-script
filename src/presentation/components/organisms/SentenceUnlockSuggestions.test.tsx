// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UnlockSuggestion } from "../../../domain/sentence/services/SentenceLessonService";
import type { SentenceEntry } from "../../../domain/sentence/types";
import { SentenceUnlockSuggestions } from "./SentenceUnlockSuggestions";

function makeSentence(overrides: Partial<SentenceEntry> = {}): SentenceEntry {
	return {
		id: "s1",
		thai: "มา กิน",
		romanization: "maa gin",
		english: "Come eat",
		words: ["มา", "กิน"],
		difficulty: 1,
		thai_audio_file: null,
		cards: { readingComprehension: { distractors: [] } },
		...overrides,
	};
}

describe("SentenceUnlockSuggestions", () => {
	it("renders nothing when there are no suggestions", () => {
		const { container } = render(
			<SentenceUnlockSuggestions suggestions={[]} onPullInWord={() => {}} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("shows 'Unlocks immediately' for a sentence with no missing words", () => {
		const suggestions: UnlockSuggestion[] = [
			{ sentence: makeSentence(), missingWords: [] },
		];
		render(
			<SentenceUnlockSuggestions
				suggestions={suggestions}
				onPullInWord={() => {}}
			/>,
		);

		expect(screen.getByText("Unlocks immediately")).toBeTruthy();
	});

	it("shows a chip per missing word and calls onPullInWord when clicked", () => {
		const onPullInWord = vi.fn();
		const suggestions: UnlockSuggestion[] = [
			{ sentence: makeSentence(), missingWords: ["กิน"] },
		];
		render(
			<SentenceUnlockSuggestions
				suggestions={suggestions}
				onPullInWord={onPullInWord}
			/>,
		);

		fireEvent.click(screen.getByText("กิน"));

		expect(onPullInWord).toHaveBeenCalledWith("กิน");
	});
});
