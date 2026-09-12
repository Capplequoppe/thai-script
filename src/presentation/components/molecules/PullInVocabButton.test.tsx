// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PullInVocabButton } from "./PullInVocabButton";

afterEach(cleanup);

describe("PullInVocabButton", () => {
	it("shows the pull-in button when the word is pullable", () => {
		render(
			<PullInVocabButton
				thai="มา"
				isPullable={true}
				missingPrerequisites={{ characters: [], toneRules: [] }}
				onPullIn={() => true}
			/>,
		);

		expect(screen.getByRole("button", { name: "Pull into SRS" })).toBeTruthy();
	});

	it("calls onPullIn with the word's thai when clicked", () => {
		const onPullIn = vi.fn().mockReturnValue(true);
		render(
			<PullInVocabButton
				thai="มา"
				isPullable={true}
				missingPrerequisites={{ characters: [], toneRules: [] }}
				onPullIn={onPullIn}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Pull into SRS" }));

		expect(onPullIn).toHaveBeenCalledWith("มา");
	});

	it("shows a cap-reached message when onPullIn returns false", () => {
		render(
			<PullInVocabButton
				thai="มา"
				isPullable={true}
				missingPrerequisites={{ characters: [], toneRules: [] }}
				onPullIn={() => false}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Pull into SRS" }));

		expect(screen.getByText(/Too many words in progress/)).toBeTruthy();
	});

	it("shows a locked reason instead of a button when not pullable", () => {
		render(
			<PullInVocabButton
				thai="มา"
				isPullable={false}
				missingPrerequisites={{ characters: ["ม"], toneRules: ["low-live"] }}
				onPullIn={() => true}
			/>,
		);

		expect(screen.queryByRole("button", { name: "Pull into SRS" })).toBeNull();
		expect(screen.getByText(/character ม/)).toBeTruthy();
		expect(screen.getByText(/tone rule low-live/)).toBeTruthy();
	});
});
