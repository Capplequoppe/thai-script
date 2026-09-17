// @vitest-environment jsdom
/**
 * The derivation, performed rather than recalled.
 *
 * What these pin down is the *direction*: the learner supplies the two inputs
 * and the tone is shown falling out of them. A version that asked for the tone
 * and then for a justification would pass a naive "does it mention the rule"
 * assertion while teaching the opposite habit, so the tests check that no tone
 * is on offer to pick.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VocabularyCard } from "../../../domain/vocabulary/types";
import { ToneRuleQuiz } from "./ToneRuleQuiz";

// No `globals: true` and no `setupFiles`, so auto-cleanup never registers.
afterEach(cleanup);

function ruleCardFor(thai: string): VocabularyCard {
	return {
		id: `vocab:${thai}:toneRule`,
		promptWord: thai,
		property: "toneRule",
		question: "Which rule gives each syllable its tone?",
		correctAnswer: "",
		choices: [],
		srs: {
			easeFactor: 2,
			interval: 10,
			repetitions: 0,
			learningStep: 1,
			nextReviewDate: "2026-01-01T00:00:00.000Z",
			lastReviewDate: null,
			lapseCount: 0,
		},
	} as unknown as VocabularyCard;
}

/** Low class under mai ek — falling. One syllable, one mark. */
const MARKED = "ที่";
/** Mid class, dead short — low. One syllable, no mark. */
const UNMARKED = "จะ";

describe("ToneRuleQuiz", () => {
	it("asks for the mark where one is written, not the ending", () => {
		render(<ToneRuleQuiz card={ruleCardFor(MARKED)} onAnswer={() => {}} />);

		expect(screen.getByText("Tone mark")).toBeTruthy();
		expect(screen.queryByText("Syllable ending")).toBeNull();
		expect(screen.getByRole("button", { name: "mai ek" })).toBeTruthy();
	});

	it("asks for the ending where no mark is written", () => {
		render(<ToneRuleQuiz card={ruleCardFor(UNMARKED)} onAnswer={() => {}} />);

		expect(screen.getByText("Syllable ending")).toBeTruthy();
		expect(screen.queryByText("Tone mark")).toBeNull();
		expect(
			screen.getByRole("button", { name: "dead, short vowel" }),
		).toBeTruthy();
	});

	it("never offers the tone itself as something to pick", () => {
		render(<ToneRuleQuiz card={ruleCardFor(MARKED)} onAnswer={() => {}} />);

		// The answer is derived, not chosen: offering "falling" as a button
		// would turn this back into the recall question it exists to replace.
		for (const tone of ["mid", "low", "high", "falling", "rising"]) {
			const asButton = screen
				.queryAllByRole("button")
				.filter((b) => b.textContent === tone);
			// "mid" / "low" / "high" survive as *class* options, so only the two
			// that are tones alone must be absent.
			if (tone === "falling" || tone === "rising") {
				expect(asButton).toHaveLength(0);
			}
		}
	});

	it("will not check until both inputs are picked for every syllable", () => {
		render(<ToneRuleQuiz card={ruleCardFor(MARKED)} onAnswer={() => {}} />);
		const check = screen.getByRole("button", { name: "Check" });

		expect(check).toHaveProperty("disabled", true);
		fireEvent.click(screen.getByRole("button", { name: "low" }));
		expect(check).toHaveProperty("disabled", true);
		fireEvent.click(screen.getByRole("button", { name: "mai ek" }));
		expect(check).toHaveProperty("disabled", false);
	});

	it("shows the rule and the tone it produces once checked", () => {
		render(<ToneRuleQuiz card={ruleCardFor(MARKED)} onAnswer={() => {}} />);

		fireEvent.click(screen.getByRole("button", { name: "low" }));
		fireEvent.click(screen.getByRole("button", { name: "mai ek" }));
		fireEvent.click(screen.getByRole("button", { name: "Check" }));

		expect(screen.getByText("→ falling tone")).toBeTruthy();
		expect(screen.getByText(/lesson \d+/)).toBeTruthy();
	});

	it("passes only when both inputs are right", () => {
		vi.useFakeTimers();
		const onAnswer = vi.fn();
		render(<ToneRuleQuiz card={ruleCardFor(MARKED)} onAnswer={onAnswer} />);

		// Right class, wrong mark.
		fireEvent.click(screen.getByRole("button", { name: "low" }));
		fireEvent.click(screen.getByRole("button", { name: "mai tho" }));
		fireEvent.click(screen.getByRole("button", { name: "Check" }));

		vi.runAllTimers();
		expect(onAnswer).toHaveBeenCalledWith(false);
		vi.useRealTimers();
	});

	it("passes when both inputs are right", () => {
		vi.useFakeTimers();
		const onAnswer = vi.fn();
		render(<ToneRuleQuiz card={ruleCardFor(MARKED)} onAnswer={onAnswer} />);

		fireEvent.click(screen.getByRole("button", { name: "low" }));
		fireEvent.click(screen.getByRole("button", { name: "mai ek" }));
		fireEvent.click(screen.getByRole("button", { name: "Check" }));

		vi.runAllTimers();
		expect(onAnswer).toHaveBeenCalledWith(true);
		vi.useRealTimers();
	});

	it("says so rather than rendering an unanswerable screen for a word it cannot derive", () => {
		// A card whose word the corpus no longer carries — the durable form of
		// "this card outlived the data that made it". A real word that merely
		// fails the derivation gate would work here too, but every one tried so
		// far has since been fixed into deriving correctly, which makes it a
		// fixture that expires.
		render(<ToneRuleQuiz card={ruleCardFor("ไม่มีคำนี้")} onAnswer={() => {}} />);
		expect(screen.getByText(/tone rules have changed/i)).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Check" })).toBeNull();
	});
});
