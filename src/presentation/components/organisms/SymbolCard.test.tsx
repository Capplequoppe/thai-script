// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
	ConsonantSummary,
	ToneMarkSummary,
	VowelSummary,
} from "../../../domain/script/services/ScriptLessonService";
import { ConsonantCard, ToneMarkCard, VowelCard } from "./SymbolCard";

function consonant(
	overrides: Partial<ConsonantSummary> = {},
): ConsonantSummary {
	return {
		character: "ก",
		name: "กอ ไก่",
		nameRomanized: "gor gai",
		nameMeaning: "chicken",
		classType: "mid",
		initialSound: "g",
		finalSound: "k",
		hasDeadEnding: true,
		isAspirated: false,
		...overrides,
	};
}

function vowel(overrides: Partial<VowelSummary> = {}): VowelSummary {
	return {
		character: "◌ะ",
		name: "sara a",
		sound: "a",
		length: "short",
		position: "after",
		...overrides,
	};
}

function toneMark(overrides: Partial<ToneMarkSummary> = {}): ToneMarkSummary {
	return {
		character: "่",
		name: "mai ek",
		midClassTone: "low",
		highClassTone: "low",
		lowClassTone: "falling",
		...overrides,
	};
}

describe("ConsonantCard — class cue states (AC5)", () => {
	it("renders the class district for a known class", () => {
		const { container } = render(
			<ConsonantCard c={consonant({ classType: "high" })} />,
		);
		const badge = container.querySelector("[data-district]");
		expect(badge).not.toBeNull();
		expect(badge?.getAttribute("data-district")).toBe("temple");
	});

	it("renders an unresolved cue, distinguishable from not-applicable, for a value that isn't a real class", () => {
		const { container } = render(
			<ConsonantCard c={consonant({ classType: "unresolved" })} />,
		);
		const badge = container.querySelector("[data-district]");
		expect(badge).not.toBeNull();
		expect(badge?.getAttribute("data-district")).toBe("unresolved");
	});
});

describe("VowelCard — class cue state (AC5)", () => {
	it("renders no class cue at all, and is not reported as unresolved", () => {
		const { container } = render(<VowelCard v={vowel()} />);
		expect(container.querySelector("[data-district]")).toBeNull();
		expect(container.textContent).not.toMatch(/unresolved/i);
	});
});

// AC6: the class-retrieval card's question IS the class, so neither the
// colour nor the district channel may render it.
describe("ConsonantCard — class-retrieval card (AC6)", () => {
	it("renders no district cue and no class colour when hideClassCue is set", () => {
		const { container } = render(
			<ConsonantCard c={consonant({ classType: "high" })} hideClassCue />,
		);
		expect(container.querySelector("[data-district]")).toBeNull();
		expect(container.textContent).not.toContain("class");

		const glyph = container.querySelector(".thai") as HTMLElement | null;
		expect(glyph?.style.color).toBe("");
	});
});

// AC4: tone renders as vertical motion (the shipped contour icon), not as
// class position — class never moves anything vertically.
describe("ToneMarkCard — tone as motion (AC4)", () => {
	it("renders a tone-contour icon for each class's tone", () => {
		const { container } = render(<ToneMarkCard t={toneMark()} />);
		const contours = container.querySelectorAll("svg");
		// mid + high + low class tones on this record.
		expect(contours.length).toBe(3);
	});
});

describe("ConsonantCard — class never renders as vertical position (AC4)", () => {
	it("the district badge only ever carries opacity, never a vertical-offset style, for any class", () => {
		for (const classType of ["low", "mid", "high"]) {
			const { container } = render(
				<ConsonantCard c={consonant({ classType })} />,
			);
			const badge = container.querySelector("[data-district]") as HTMLElement;
			expect(badge.style.top).toBe("");
			expect(badge.style.transform).toBe("");
			expect(badge.style.verticalAlign).toBe("");
		}
	});
});
