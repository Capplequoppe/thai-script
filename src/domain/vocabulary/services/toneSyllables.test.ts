import { describe, expect, it } from "vitest";
import type { SyllableInfo, VocabEntry } from "../types";
import { toneSyllablesOf } from "./toneSyllables";

function syllable(
	text: string,
	tone: string | null,
	overrides: Partial<SyllableInfo> = {},
): SyllableInfo {
	return {
		text,
		initialConsonant: null,
		vowel: null,
		finalConsonant: null,
		toneMark: null,
		consonantClass: null,
		syllableType: null,
		tone,
		...overrides,
	};
}

function vocabEntry(
	syllables: SyllableInfo[],
	romanization = "mǎeo",
): VocabEntry {
	return {
		thai: "แมว",
		romanization,
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
	it("returns an empty array when no syllable has a determinable tone", () => {
		const entry = vocabEntry([syllable("a", null), syllable("b", "")]);

		expect(toneSyllablesOf(entry)).toEqual([]);
	});

	it("preserves syllable order", () => {
		const entry = vocabEntry(
			[syllable("gaeng", "low"), syllable("jued", "falling")],
			"gɛːŋ tɕɯ̀ːt",
		);

		expect(toneSyllablesOf(entry)).toEqual([
			{ text: "gaeng", tone: "mid" },
			{ text: "jued", tone: "low" },
		]);
	});

	describe("correcting the stored tone", () => {
		it("takes the tone from the romanization when the stored one disagrees", () => {
			// ทุก is tʰúk — a low-class initial in a dead syllable with a short
			// vowel, so high. The stored field says falling, as it does for
			// ~450 words, and a learner answering "high" was told they failed.
			const entry = vocabEntry([syllable("ทุก", "falling")], "tʰúk");

			expect(toneSyllablesOf(entry)).toEqual([{ text: "ทุก", tone: "high" }]);
		});

		it("treats an unmarked romanization syllable as mid", () => {
			const entry = vocabEntry([syllable("กิน", "falling")], "kin");

			expect(toneSyllablesOf(entry)).toEqual([{ text: "กิน", tone: "mid" }]);
		});

		it("lets a written tone mark overrule the romanization", () => {
			// ข้าว is stored `khàao`, low — but ข is a high-class initial under
			// mai tho, which is falling. The mark is unambiguous; the
			// romanization is merely usually right.
			const entry = vocabEntry(
				[
					syllable("ข้าว", "falling", {
						toneMark: "maytho",
						consonantClass: "high",
					}),
				],
				"khàao",
			);

			expect(toneSyllablesOf(entry)).toEqual([
				{ text: "ข้าว", tone: "falling" },
			]);
		});

		it("pairs mai ek with the initial's class", () => {
			const lowClass = vocabEntry(
				[syllable("x", "mid", { toneMark: "mayek", consonantClass: "low" })],
				"x",
			);
			const midClass = vocabEntry(
				[syllable("x", "mid", { toneMark: "mayek", consonantClass: "mid" })],
				"x",
			);

			expect(toneSyllablesOf(lowClass)[0]?.tone).toBe("falling");
			expect(toneSyllablesOf(midClass)[0]?.tone).toBe("low");
		});
	});

	describe("refusing to quiz on an unreliable split", () => {
		it("drops a word whose stored syllable count disagrees with the romanization", () => {
			// สบาย is recorded as one syllable, but it is sà-baai. The syllable
			// *text* is wrong too, so no tone correction can rescue the card.
			const entry = vocabEntry([syllable("สบาย", "rising")], "sà baːj");

			expect(toneSyllablesOf(entry)).toEqual([]);
		});

		it("drops a word whose syllables include punctuation the romanization has no counterpart for", () => {
			const entry = vocabEntry(
				[
					syllable("เล็ก", "falling"),
					syllable(" ", null),
					syllable("(", null),
					syllable("เอส", "low"),
					syllable(")", null),
				],
				"lék",
			);

			expect(toneSyllablesOf(entry)).toEqual([]);
		});
	});

	it("keeps the stored tones when there is no romanization to check against", () => {
		const entry = vocabEntry([syllable("แมว", "rising")], "");

		expect(toneSyllablesOf(entry)).toEqual([{ text: "แมว", tone: "rising" }]);
	});
});
