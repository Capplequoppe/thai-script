// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UnlockSuggestion } from "../../../domain/sentence/services/SentenceLessonService";
import type { SentenceEntry } from "../../../domain/sentence/types";
import { SentenceUnlockSuggestions } from "./SentenceUnlockSuggestions";

afterEach(cleanup);

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
			<SentenceUnlockSuggestions
				suggestions={[]}
				anchorIsPullable={true}
				onPullInWord={() => true}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("shows 'Unlocks immediately' for a sentence with no missing words when the anchor word is pullable", () => {
		const suggestions: UnlockSuggestion[] = [
			{ sentence: makeSentence(), missingWords: [] },
		];
		render(
			<SentenceUnlockSuggestions
				suggestions={suggestions}
				anchorIsPullable={true}
				onPullInWord={() => true}
			/>,
		);

		expect(screen.getByText("Unlocks immediately")).toBeTruthy();
	});

	it("shows a different message when the anchor word itself isn't pullable yet", () => {
		const suggestions: UnlockSuggestion[] = [
			{ sentence: makeSentence(), missingWords: [] },
		];
		render(
			<SentenceUnlockSuggestions
				suggestions={suggestions}
				anchorIsPullable={false}
				onPullInWord={() => true}
			/>,
		);

		expect(screen.queryByText("Unlocks immediately")).toBeNull();
		expect(screen.getByText("Unlocks once you learn this word")).toBeTruthy();
	});

	it("shows a chip per missing word and calls onPullInWord when clicked", () => {
		const onPullInWord = vi.fn().mockReturnValue(true);
		const suggestions: UnlockSuggestion[] = [
			{ sentence: makeSentence(), missingWords: ["กิน"] },
		];
		render(
			<SentenceUnlockSuggestions
				suggestions={suggestions}
				anchorIsPullable={true}
				onPullInWord={onPullInWord}
			/>,
		);

		fireEvent.click(screen.getByText("กิน"));

		expect(onPullInWord).toHaveBeenCalledWith("กิน");
	});

	it("shows a cap-reached message when a chip's onPullInWord returns false", () => {
		const suggestions: UnlockSuggestion[] = [
			{ sentence: makeSentence(), missingWords: ["กิน"] },
		];
		render(
			<SentenceUnlockSuggestions
				suggestions={suggestions}
				anchorIsPullable={true}
				onPullInWord={() => false}
			/>,
		);

		fireEvent.click(screen.getByText("กิน"));

		expect(screen.getByText(/Too many words in progress/)).toBeTruthy();
	});
});
