// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LessonSequenceEntry } from "../../../domain/script/data/lessonSequence";
import { lessonCount } from "../../../domain/script/data/lessonSequence";
import { LessonPath } from "./LessonPath";

function sequenceOf(length: number): LessonSequenceEntry[] {
	return Array.from({ length }, (_, i) => ({
		id: `lesson-${String(i + 1).padStart(2, "0")}`,
		position: i + 1,
		legacyNumber: i + 1,
	}));
}

function renderedNodes(container: HTMLElement): Element[] {
	// The root <svg> carries its own "Lesson progress path" label; the lesson
	// nodes are the labelled <g> elements inside it.
	return [...container.querySelectorAll('g[aria-label^="Lesson "]')];
}

describe("LessonPath", () => {
	it("renders one node per declared lesson: 20 for a 20-lesson sequence", () => {
		const { container } = render(
			<LessonPath
				completedLessons={new Set()}
				nextAvailable={1}
				onLessonClick={() => {}}
				sequence={sequenceOf(20)}
			/>,
		);
		expect(renderedNodes(container)).toHaveLength(20);
	});

	it("renders one node per declared lesson: 25 for a 25-lesson sequence", () => {
		const { container } = render(
			<LessonPath
				completedLessons={new Set()}
				nextAvailable={1}
				onLessonClick={() => {}}
				sequence={sequenceOf(25)}
			/>,
		);
		expect(renderedNodes(container)).toHaveLength(25);
	});

	it("defaults to the app's declared sequence, not a hardcoded 1..n", () => {
		const { container } = render(
			<LessonPath
				completedLessons={new Set([1])}
				nextAvailable={2}
				onLessonClick={() => {}}
			/>,
		);
		const nodes = renderedNodes(container);
		expect(nodes).toHaveLength(lessonCount);
		expect(nodes[0]?.getAttribute("aria-label")).toBe("Lesson 1 — completed");
		expect(nodes[1]?.getAttribute("aria-label")).toBe("Lesson 2 — start");
		expect(nodes[2]?.getAttribute("aria-label")).toBe("Lesson 3 — locked");
	});
});
