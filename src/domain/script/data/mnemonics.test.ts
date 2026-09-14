import { describe, expect, it } from "vitest";
import { checkOriginality } from "./originality";
import {
	confusablePairs,
	type DistinguishingFeature,
	districtForClass,
	validateSceneAnnotation,
} from "./sceneGrammar";
import { classifyConsonant } from "./soundType";
import {
	composeMnemonic,
	consonants,
	type SceneMnemonic,
	toneMarks,
	vowels,
	words,
} from "./symbols";

// ---------------------------------------------------------------------------
// Task 2.4 — every mnemonic in symbols.ts is a structured scene-grammar
// record: shape and sound as separate cues, a district exactly where the
// symbol carries a class, a named motion exactly where it carries a tone, and
// prose derived from the record rather than authored beside it.
// ---------------------------------------------------------------------------

interface RecordUnderTest {
	kind: "consonant" | "vowel" | "tone-mark" | "word";
	key: string;
	prose: string | undefined;
	record: SceneMnemonic | undefined;
	carriesTone: boolean;
}

const recordsUnderTest: readonly RecordUnderTest[] = [
	...consonants.map((consonant) => ({
		kind: "consonant" as const,
		key: consonant.character,
		prose: consonant.mnemonic,
		record: consonant.sceneMnemonic,
		carriesTone: false,
	})),
	...vowels.map((vowel) => ({
		kind: "vowel" as const,
		key: vowel.character,
		prose: vowel.mnemonic,
		record: vowel.sceneMnemonic,
		carriesTone: false,
	})),
	...toneMarks.map((mark) => ({
		kind: "tone-mark" as const,
		key: mark.character,
		prose: mark.mnemonic,
		record: mark.sceneMnemonic,
		carriesTone: true,
	})),
	...words
		.filter((word) => word.sceneMnemonic !== undefined)
		.map((word) => ({
			kind: "word" as const,
			key: word.name,
			prose: word.mnemonic,
			record: word.sceneMnemonic,
			carriesTone: true,
		})),
];

describe("coverage", () => {
	// AC1 — exact counts, so a shrinking source cannot pass by covering fewer.
	it("carries a scene mnemonic on every one of the 44 consonants and 29 vowels", () => {
		expect(consonants).toHaveLength(44);
		expect(vowels).toHaveLength(29);
		for (const symbol of [...consonants, ...vowels]) {
			expect(symbol.sceneMnemonic, symbol.character).toBeDefined();
		}
	});

	// The remainder of the 82 mnemonic-carrying records the task replaces.
	it("covers the four tone marks and the five mnemonic-bearing words too", () => {
		expect(toneMarks).toHaveLength(4);
		for (const mark of toneMarks) {
			expect(mark.sceneMnemonic, mark.name).toBeDefined();
		}
		const wordRecords = words.filter((word) => word.sceneMnemonic);
		expect(wordRecords.map((word) => word.name)).toEqual([
			"กา",
			"มือ",
			"ใคร",
			"หมี",
			"อย่า",
		]);
		expect(recordsUnderTest).toHaveLength(82);
	});
});

describe("schema", () => {
	// AC2 — every record validates against the scene-grammar schema from 2.1.
	it("validates every record: shape cue, sound cue, district and motion where due", () => {
		for (const { kind, key, record, carriesTone } of recordsUnderTest) {
			expect(record, key).toBeDefined();
			if (!record) continue;
			const verdict = validateSceneAnnotation({
				kind,
				district: record.district ?? null,
				shapeCue: record.shapeCue,
				soundCue: record.soundCue,
				carriesTone,
				toneMotion: record.toneMotion ?? null,
			});
			expect(verdict, key).toEqual({ ok: true });
		}
	});

	// AC2 — the refusal arm: a record missing its sound cue fails, naming it.
	it("fails a record missing its sound cue, naming the field", () => {
		const verdict = validateSceneAnnotation({
			kind: "consonant",
			district: "market",
			shapeCue: "a headless open frame",
			carriesTone: false,
		});
		expect(verdict.ok).toBe(false);
		if (verdict.ok) return;
		expect(verdict.missing).toContain("soundCue");
		expect(verdict.missing).not.toContain("shapeCue");
	});

	// AC2 — a vowel carries no district requirement and still validates.
	it("validates a vowel record that carries no district", () => {
		for (const vowel of vowels) {
			expect(vowel.sceneMnemonic?.district, vowel.character).toBeUndefined();
		}
		const sample = vowels[0].sceneMnemonic;
		expect(sample).toBeDefined();
		if (!sample) return;
		expect(
			validateSceneAnnotation({
				kind: "vowel",
				shapeCue: sample.shapeCue,
				soundCue: sample.soundCue,
				carriesTone: false,
			}),
		).toEqual({ ok: true });
	});

	// The motion a record names is the one its own data already declares.
	it("names each tone-carrying record's own motion, and no other", () => {
		for (const mark of toneMarks) {
			expect(mark.sceneMnemonic?.toneMotion, mark.name).toBe(mark.midClassTone);
		}
		for (const word of words) {
			if (!word.sceneMnemonic) continue;
			expect(word.sceneMnemonic.toneMotion, word.name).toBe(word.tone);
		}
	});

	// The rendered prose is derived from the record — one authored source.
	it("derives the rendered prose from the record, never a second copy", () => {
		for (const { key, prose, record } of recordsUnderTest) {
			if (!record) continue;
			expect(prose, key).toBe(composeMnemonic(record));
		}
	});
});

describe("districts", () => {
	// AC3 — declared district must match the class derived from sound type.
	it("stages each consonant in the district its derived class names", () => {
		for (const consonant of consonants) {
			const classification = classifyConsonant(consonant);
			expect(classification.state, consonant.character).toBe("classified");
			if (classification.state !== "classified") continue;
			expect(consonant.sceneMnemonic?.district, consonant.character).toBe(
				districtForClass(classification.consonantClass),
			);
		}
	});
});

describe("originality", () => {
	// AC4 — the shared gate from task 1.5, over every rewritten mnemonic. The
	// gate compares 5-token windows, so no eight-word run can survive either.
	it("clears the shared originality gate on every mnemonic", async () => {
		const failures: string[] = [];
		for (const { key, record } of recordsUnderTest) {
			if (!record) continue;
			const result = await checkOriginality(composeMnemonic(record));
			if (result.status === "overlapping") {
				failures.push(
					`${key} reuses "${result.overlap.ngram}" (${result.overlap.sources.join(", ")})`,
				);
			} else if (result.status === "not-checked") {
				failures.push(`${key} not checked: ${result.reason}`);
			} else {
				// Zero windows would be a vacuous clearance on a too-short cue.
				expect(result.ngramsChecked, key).toBeGreaterThan(0);
			}
		}
		expect(failures, failures.join("; ")).toEqual([]);
	});

	// AC4 — a planted overlap is caught, so an empty or unreadable corpus
	// cannot clear everything vacuously. The phrase is the canary that
	// originality.test.ts proves verbatim in the licensed set — title text,
	// already committed there, not content.
	it("still catches a planted overlap", async () => {
		const planted = "Lesson Notes: Thai Alphabet Made Easy";
		const result = await checkOriginality(planted);
		expect(result.status).toBe("overlapping");
	});
});

// ---------------------------------------------------------------------------
// AC5 — confusable pairs contrast on the distinguishing feature. Features come
// from task 2.1's confusablePairs declarations.
// ---------------------------------------------------------------------------

const AC5_PAIRS: readonly [string, string][] = [
	["ม", "น"],
	["ช", "ซ"],
	["พ", "ฟ"],
	["ค", "ด"],
	["บ", "ป"],
	["ด", "ต"],
	["ผ", "พ"],
	["ฝ", "ฟ"],
	["ถ", "ก"],
	["ก", "ภ"],
	["ถ", "ภ"],
	["ฎ", "ฏ"],
];

/**
 * What it takes for a shape cue to name a feature. Every pattern for the
 * pair's feature must match both cues — a cue that merely differs without
 * speaking to the feature does not pass.
 */
const FEATURE_CUE_PATTERNS: Readonly<
	Record<DistinguishingFeature, readonly RegExp[]>
> = {
	"added-stroke": [/head|extra|added|cross/i],
	bump: [/bump|notch|dent|smooth|round|unbroken/i],
	"head-direction": [/head/i, /inside|outside|clockwise|counter/i],
	mirror: [/left|right/i],
	"stroke-height": [/higher|level|taller|rises|height/i],
	tail: [/tail/i],
	"top-ornament": [/zigzag|curl/i],
};

describe("confusable pairs", () => {
	// AC5
	it("contrasts each pair's shape cues on the declared distinguishing feature", () => {
		for (const [a, b] of AC5_PAIRS) {
			const pairKey = [a, b].sort().join("");
			const declared = confusablePairs.find(
				(candidate) => [candidate.a, candidate.b].sort().join("") === pairKey,
			);
			const feature = declared?.feature;
			expect(feature, `${a}/${b} has no distinguishing feature`).toBeDefined();
			if (!feature) continue;

			const cueOf = (character: string) =>
				consonants.find((consonant) => consonant.character === character)
					?.sceneMnemonic?.shapeCue;
			const first = cueOf(a);
			const second = cueOf(b);
			expect(first, a).toBeDefined();
			expect(second, b).toBeDefined();
			if (!first || !second) continue;

			expect(first, `${a}/${b}: shape cues coincide`).not.toBe(second);
			for (const pattern of FEATURE_CUE_PATTERNS[feature]) {
				expect(first, `${a} cue does not speak to ${feature}`).toMatch(pattern);
				expect(second, `${b} cue does not speak to ${feature}`).toMatch(
					pattern,
				);
			}
		}
	});
});
