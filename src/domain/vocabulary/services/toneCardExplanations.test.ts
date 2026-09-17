/**
 * The explanation shown beside a graded syllable has to belong to *that*
 * syllable. Nothing in the rendering can check this — a plausible rule under
 * the wrong syllable looks exactly like a correct one — so the alignment is
 * asserted here, where it is still visible.
 */
import { describe, expect, it } from "vitest";
import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import { toneExplanationsForCard } from "./toneCardExplanations";
import { toneExplanationsOf } from "./toneExplanation";
import { toneSyllablesOf } from "./toneSyllables";

const corpus = vocabularyData as unknown as VocabEntry[];

describe("toneExplanationsForCard", () => {
	it("explains the syllable at each index of the card's own answer", () => {
		const explanations = toneExplanationsForCard("vocab:ที่:toneIdentification");
		expect(explanations).toHaveLength(1);
		expect(explanations[0]?.description).toMatch(/mai ek/i);
		expect(explanations[0]?.tone).toBe("falling");
	});

	it("returns nothing for an id that is not a tone card", () => {
		expect(toneExplanationsForCard("vocab:ที่:spelling")).toEqual([]);
		expect(toneExplanationsForCard("script:ก:recognition")).toEqual([]);
		expect(toneExplanationsForCard("nonsense")).toEqual([]);
	});

	it("returns nothing for a word that has left the corpus", () => {
		expect(toneExplanationsForCard("vocab:ไม่มีคำนี้:toneIdentification")).toEqual(
			[],
		);
	});

	/**
	 * The alignment is structural, not coincidental: both lists are built by
	 * `toneSyllableInfosOf`, so a word whose *first* syllable has no
	 * determinable tone is graded on its second and explained on its second
	 * too. Asserted across the whole corpus because the words where the two
	 * lists could drift apart are exactly the rare ones nobody would think to
	 * pick as a fixture.
	 */
	it("produces exactly one explanation slot per graded syllable, corpus-wide", () => {
		let checked = 0;
		for (const entry of corpus) {
			const graded = toneSyllablesOf(entry);
			if (graded.length === 0) continue;
			expect(toneExplanationsOf(entry)).toHaveLength(graded.length);
			checked += 1;
		}
		expect(checked).toBeGreaterThan(1000);
	});

	/**
	 * A tone card's `correctAnswer` is the pipe-join of the graded tones, so
	 * the explanation at index `i` must be talking about the tone at index
	 * `i` of that string — that is the contract `ToneQuiz` renders against.
	 */
	it("lines up with the pipe-joined correctAnswer a card is built from", () => {
		const multi = corpus.filter((entry) => toneSyllablesOf(entry).length > 1);
		expect(multi.length).toBeGreaterThan(100);

		for (const entry of multi.slice(0, 200)) {
			const tones = toneSyllablesOf(entry).map((s) => s.tone);
			const explanations = toneExplanationsOf(entry);
			expect(explanations).toHaveLength(tones.length);

			explanations.forEach((explanation, index) => {
				if (!explanation || explanation.disagreesWithStored) return;
				// Where the rule agrees at all, it must agree with *this*
				// syllable's tone rather than some other syllable's.
				expect(explanation.tone).toBe(tones[index]);
			});
		}
	});
});
