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

	// The `syllables` exception. `vocabulary.json`'s tones were wrong for
	// ~14% of syllables until `scripts/enrich-vocabulary.py` was fixed, so a
	// learner's already-generated toneIdentification card carries the old
	// answer and `ToneQuiz` marks the right tone wrong until this corrects it.
	it("adopts corrected syllables and correctAnswer onto an already-persisted tone card", () => {
		const persisted = [
			makeCard("vocab:รับ:toneIdentification", {
				correctAnswer: "falling",
				choices: [],
				syllables: [{ text: "รับ", tone: "falling" }],
				srs: { ...DEFAULT_SRS_DATA, repetitions: 7 },
			}),
		];
		const generated = [
			makeCard("vocab:รับ:toneIdentification", {
				correctAnswer: "high",
				choices: [],
				syllables: [{ text: "รับ", tone: "high" }],
			}),
		];

		const result = reconcileGeneratedCards(persisted, generated);

		expect(result).toEqual([
			{
				...persisted[0],
				correctAnswer: "high",
				syllables: [{ text: "รับ", tone: "high" }],
			},
		]);
		// The learner's own schedule survives the content correction.
		expect(result[0]?.srs.repetitions).toBe(7);
	});

	it("leaves a tone card alone when its syllables already match", () => {
		const card = {
			correctAnswer: "high",
			choices: [],
			syllables: [{ text: "รับ", tone: "high" }],
		};
		const persisted = [makeCard("vocab:รับ:toneIdentification", card)];
		const generated = [makeCard("vocab:รับ:toneIdentification", card)];

		expect(reconcileGeneratedCards(persisted, generated)).toEqual([]);
	});

	// The reason `choices` is NOT in the exception: every generator reshuffles
	// them per call, so adopting them would rewrite cards on nearly every boot.
	it("still never adopts a generated question or choices", () => {
		const persisted = [
			makeCard("a", { question: "kept", choices: ["a", "b"] }),
		];
		const generated = [
			makeCard("a", { question: "fresh", choices: ["b", "a"] }),
		];

		expect(reconcileGeneratedCards(persisted, generated)).toEqual([]);
	});

	it("ignores a persisted id that isn't in generated at all — never deletes", () => {
		const persisted = [makeCard("a"), makeCard("stale")];
		const generated = [makeCard("a")];

		expect(reconcileGeneratedCards(persisted, generated)).toEqual([]);
	});
});
