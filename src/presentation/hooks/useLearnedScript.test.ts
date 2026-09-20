// @vitest-environment jsdom
/**
 * A stale completed position must not take the page down.
 *
 * Found by seeding a learner with more completed positions than the sequence
 * has: `getScriptSummary` throws `Lesson 21 not found`, nothing between it and
 * the router catches that, and the whole app renders a white screen — palace,
 * dashboard and all.
 *
 * No learner reaches that by finishing lessons. A learner reaches it when the
 * course changes under them, which this course has done before: `lessonEpoch`
 * and `migrateLessonIdentity` exist precisely because the sequence was
 * resequenced once already. Drop a lesson and every learner who had passed it
 * is holding a position the sequence no longer has.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LessonSummary } from "../../domain/script/services/ScriptLessonService";
import { useLearnedScript } from "./useLearnedScript";

const { mockUseApp } = vi.hoisted(() => ({ mockUseApp: vi.fn() }));
vi.mock("./useApp", () => ({ useApp: mockUseApp }));

/** A summary shaped like the real one, carrying one consonant and one rule. */
function summaryFor(position: number): LessonSummary {
	return {
		lessonNumber: position,
		title: `lesson ${position}`,
		focus: "",
		videoUrl: "",
		consonants: [{ character: "ม" }],
		vowels: [],
		toneMarks: [],
		toneRules: [{ id: "tone-rule:low-live" }],
	} as unknown as LessonSummary;
}

/** An app whose sequence stops at `lastPosition`, throwing past it. */
function appWith(completedLessons: number[], lastPosition: number) {
	mockUseApp.mockReturnValue({
		state: { completedLessons },
		lesson: {
			getScriptSummary: (position: number) => {
				if (position > lastPosition) {
					throw new Error(`Lesson ${position} not found`);
				}
				return summaryFor(position);
			},
		},
	});
}

describe("a completed position the sequence no longer has", () => {
	it("does not throw", () => {
		appWith([1, 2, 21], 20);
		expect(() => renderHook(() => useLearnedScript())).not.toThrow();
	});

	it("keeps everything the learner did earn", () => {
		appWith([1, 2, 21], 20);
		const { result } = renderHook(() => useLearnedScript());

		// The two real lessons still count. Losing a learner's whole history
		// because one entry went stale would be the same bug in a quieter form.
		expect(result.current.consonants.has("ม")).toBe(true);
		expect(result.current.toneRules.has("low-live")).toBe(true);
		expect(result.current.nothingYet).toBe(false);
	});

	it("is not vacuous: the summary really does throw past the end", () => {
		appWith([21], 20);
		const { result } = renderHook(() => useLearnedScript());

		// Nothing survives, because the only entry was the stale one — and the
		// page still renders rather than dying.
		expect(result.current.consonants.size).toBe(0);
		expect(result.current.nothingYet).toBe(true);
	});
});
