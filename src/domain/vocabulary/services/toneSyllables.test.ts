import { describe, expect, it } from "vitest";
import type { SyllableInfo, VocabEntry } from "../types";
import { toneSyllablesOf } from "./toneSyllables";

function syllable(text: string, tone: string | null): SyllableInfo {
	return {
		text,
		initialConsonant: null,
		vowel: null,
		finalConsonant: null,
		toneMark: null,
		consonantClass: null,
		syllableType: null,
		tone,
	};
}

function vocabEntry(syllables: SyllableInfo[]): VocabEntry {
	return {
		thai: "แมว",
		romanization: "maeo",
		word_class: "noun",
		english: "cat",
		rank: 1,
		frequency: 100,
		mnemonic: null,
		characters: ["แ", "ม", "ว"],
		syllables,
		toneRules: [],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
	};
}

describe("toneSyllablesOf", () => {
	it("AC7: keeps only syllables with a non-null, non-empty tone, mapped to {text, tone}", () => {
		const entry = vocabEntry([
			syllable("แมว", "rising"),
			syllable("no-tone", null),
			syllable("empty-tone", ""),
		]);

		expect(toneSyllablesOf(entry)).toEqual([{ text: "แมว", tone: "rising" }]);
	});

	it("returns an empty array when no syllable has a determinable tone", () => {
		const entry = vocabEntry([syllable("a", null), syllable("b", "")]);

		expect(toneSyllablesOf(entry)).toEqual([]);
	});

	it("preserves syllable order across several tone-bearing syllables", () => {
		const entry = vocabEntry([
			syllable("gaeng", "low"),
			syllable("jued", "falling"),
		]);

		expect(toneSyllablesOf(entry)).toEqual([
			{ text: "gaeng", tone: "low" },
			{ text: "jued", tone: "falling" },
		]);
	});
});
