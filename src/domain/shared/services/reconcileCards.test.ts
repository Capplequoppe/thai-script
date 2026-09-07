import { describe, expect, it } from "vitest";
import type { SrsCard } from "../types";
import { DEFAULT_SRS_DATA } from "../types";
import { reconcileGeneratedCards } from "./reconcileCards";

function makeCard(id: string, overrides: Partial<SrsCard> = {}): SrsCard {
	return {
		id,
		question: `question for ${id}`,
		correctAnswer: "answer",
		choices: ["answer", "other"],
		srs: { ...DEFAULT_SRS_DATA },
		...overrides,
	};
}

describe("reconcileGeneratedCards", () => {
	it("adds a generated id absent from persisted, with the generator's fresh srs", () => {
		const persisted = [makeCard("a")];
		const freshSrs = { ...DEFAULT_SRS_DATA, repetitions: 0 };
		const generated = [makeCard("a"), makeCard("b", { srs: freshSrs })];

		const result = reconcileGeneratedCards(persisted, generated);

		expect(result).toEqual([makeCard("b", { srs: freshSrs })]);
	});

	it("patches only audioUrl onto a persisted card that had none, leaving srs/choices/question/correctAnswer untouched", () => {
		const persistedSrs = { ...DEFAULT_SRS_DATA, repetitions: 5 };
		const persisted = [
			makeCard("a", {
				srs: persistedSrs,
				choices: ["shuffled", "order", "from", "months", "ago"],
				question: "the original question",
				correctAnswer: "the original answer",
			}),
		];
		const generated = [
			makeCard("a", {
				audioUrl: "/audio/a.mp3",
				choices: ["freshly", "shuffled", "order"],
				question: "a newly regenerated question",
				correctAnswer: "a newly regenerated answer",
			}),
		];

		const result = reconcileGeneratedCards(persisted, generated);

		expect(result).toEqual([
			{
				...persisted[0],
				audioUrl: "/audio/a.mp3",
			},
		]);
	});

	it("is a no-op when generated has nothing new (no missing ids, no missing audio)", () => {
		const persisted = [makeCard("a", { audioUrl: "/audio/a.mp3" })];
		const generated = [makeCard("a", { audioUrl: "/audio/a.mp3" })];

		expect(reconcileGeneratedCards(persisted, generated)).toEqual([]);
	});

	it("never patches audioUrl onto a persisted card that already has one", () => {
		const persisted = [makeCard("a", { audioUrl: "/audio/old.mp3" })];
		const generated = [makeCard("a", { audioUrl: "/audio/new.mp3" })];

		expect(reconcileGeneratedCards(persisted, generated)).toEqual([]);
	});

	it("ignores a persisted id that isn't in generated at all — never deletes", () => {
		const persisted = [makeCard("a"), makeCard("stale")];
		const generated = [makeCard("a")];

		expect(reconcileGeneratedCards(persisted, generated)).toEqual([]);
	});
});
