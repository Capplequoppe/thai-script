// @vitest-environment jsdom
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VOCAB_MNEMONICS } from "../../../domain/vocabulary/services/VocabMnemonic";
import type { VocabEntry } from "../../../domain/vocabulary/types";
import { WordCard } from "./WordCard";

const WORD: VocabEntry = {
	thai: "ลอง",
	romanization: "long",
	word_class: "v",
	english: "to try",
	rank: null,
	frequency: 0,
	mnemonic: null,
	characters: ["ล", "อ", "ง"],
	syllables: [
		{
			text: "ลอง",
			initialConsonant: "ล",
			vowel: "อ",
			finalConsonant: "ง",
			toneMark: null,
			consonantClass: "low",
			syllableType: "live",
			tone: "rising",
		},
	],
	toneRules: [],
	thai_audio_file: null,
	english_audio_file: null,
	image_file: null,
	samples: [],
	source: "test",
	toneStatus: "verified",
	specialRules: [],
};

describe("WordCard — SRS-stage scaffold fade", () => {
	it("with no stage (not yet reviewed), colors the initial consonant by class and shows a tone contour icon at full opacity", () => {
		const { container } = render(<WordCard word={WORD} />);

		const initial = within(container).getByText("ล");
		expect(initial.style.color).toBe("var(--color-class-low)");

		const icon = container.querySelector("svg");
		expect(icon).not.toBeNull();
		expect(icon?.style.opacity).toBe("1");
	});

	it("at Burned, drops the class color to default text color and hides the tone icon entirely", () => {
		const { container } = render(<WordCard word={WORD} stageName="Burned" />);

		const initial = within(container).getByText("ล");
		expect(initial.style.color).toBe("var(--color-text)");

		expect(container.querySelector("svg")).toBeNull();
	});

	it("at Enlightened, blends the class color toward default text and fades the tone icon rather than hiding it", () => {
		const { container } = render(
			<WordCard word={WORD} stageName="Enlightened" />,
		);

		const initial = within(container).getByText("ล");
		expect(initial.style.color).toContain("color-mix");
		expect(initial.style.color).toContain("var(--color-class-low)");

		const icon = container.querySelector("svg");
		expect(icon).not.toBeNull();
		expect(icon?.style.opacity).toBe("0.5");
	});

	it("at Guru (still actively learned), keeps full scaffolding like the no-stage case", () => {
		const { container } = render(<WordCard word={WORD} stageName="Guru" />);

		const initial = within(container).getByText("ล");
		expect(initial.style.color).toBe("var(--color-class-low)");
		expect(container.querySelector("svg")?.style.opacity).toBe("1");
	});
});

// ---------------------------------------------------------------------------
// Task 5.3 — a staged mnemonic supersedes the corpus prose, and the room
// appears on this browse surface as confirmation. WordCard has no reveal
// state; the never-before-the-learner-acts rule is asserted in
// `Flashcard.test.tsx`, which is where reveal lives.
// ---------------------------------------------------------------------------

const STAGED = VOCAB_MNEMONICS[0];

const STAGED_WORD: VocabEntry = {
	...WORD,
	thai: STAGED.thai,
	rank: STAGED.rank,
	word_class: "prep",
	mnemonic: "the corpus prose this entry shipped with",
	syllables: [],
};

describe("WordCard — staged room mnemonics", () => {
	it("renders the staged mnemonic in place of the corpus prose", () => {
		const { container } = render(<WordCard word={STAGED_WORD} />);

		expect(container.textContent).toContain(STAGED.soundCue);
		expect(container.textContent).not.toContain(
			"the corpus prose this entry shipped with",
		);
	});

	it("keeps the corpus prose for a word with no staged mnemonic", () => {
		const { container } = render(
			<WordCard word={{ ...STAGED_WORD, thai: "ไม่มีคำนี้ในคลัง", rank: null }} />,
		);

		expect(container.textContent).toContain(
			"the corpus prose this entry shipped with",
		);
	});

	it("shows the room its class assigns, beside the class itself", () => {
		const { container } = render(<WordCard word={STAGED_WORD} />);

		expect(container.textContent).toContain("Room: connectors");
		expect(container.textContent).toContain("prep");
	});

	it("shows no room for a word whose class is not yet known", () => {
		const { container } = render(
			<WordCard word={{ ...STAGED_WORD, word_class: "" }} />,
		);

		expect(container.textContent).not.toContain("Room:");
	});
});
