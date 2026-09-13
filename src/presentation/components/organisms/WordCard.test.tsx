// @vitest-environment jsdom
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
