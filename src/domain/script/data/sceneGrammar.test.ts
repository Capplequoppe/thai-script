import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	annotationFor,
	conditionalVowelForms,
	confusablePairs,
	DISTINGUISHING_FEATURES,
	districtForClass,
	sceneAnnotations,
	TONE_MOTION_EXPORT,
	TONE_MOTION_SOURCE,
	validateConditionalForm,
	validateConfusablePair,
	validateSceneAnnotation,
} from "./sceneGrammar";
import { consonants, getThaiSymbol, vowels } from "./symbols";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const SRC_ROOT = join(REPO_ROOT, "src");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		if (!/\.tsx?$/.test(entry.name)) return [];
		if (/\.test\.tsx?$/.test(entry.name)) return [];
		return [path];
	});
}

describe("conditional vowel forms are fields, not prose", () => {
	// AC4
	it("declares both written forms for every vowel whose form changes", () => {
		// The floor: the form changes this repository's own prose records —
		// dropping any of these silently would re-trap the rule in prose.
		const proseStated = ["ะ", "เ-ะ", "เ-อ", "เ-อะ", "-ัว", " ื", "โ-ะ"];
		const declared = conditionalVowelForms.map((form) => form.vowel);
		for (const vowel of proseStated) {
			expect(declared, `no conditional form declared for ${vowel}`).toContain(
				vowel,
			);
		}

		for (const form of conditionalVowelForms) {
			expect(
				vowels.some((vowel) => vowel.character === form.vowel),
				`${form.vowel} is not a vowel in symbols.ts`,
			).toBe(true);
			expect(form.openForm, form.vowel).not.toBe("");
			expect(form.withFinalForm, form.vowel).not.toBe("");
			expect(form.openForm, form.vowel).not.toBe(form.withFinalForm);
			expect(validateConditionalForm(form)).toEqual({ ok: true });
		}

		// The annotation records join the same fields.
		expect(annotationFor("ะ")?.conditionalForm?.withFinalForm).toBe("-ั-");
		expect(annotationFor("า")?.conditionalForm).toBeNull();
	});

	// AC4 — a rule that only lives in prose has no with-final field, and that
	// is a failure that names the field, never a quieter record.
	it("fails a rule still trapped in prose, naming the absent field", () => {
		const proseOnly = validateConditionalForm({
			vowel: "เ-ะ",
			openForm: "เ-ะ",
		});
		expect(proseOnly.ok).toBe(false);
		if (proseOnly.ok) return;
		expect(proseOnly.missing).toContain("withFinalForm");
	});
});

describe("confusable pairs declare what tells the glyphs apart", () => {
	// AC5
	it("names a distinguishing feature, as data, on every declared pair", () => {
		const seen = new Set<string>();
		for (const pair of confusablePairs) {
			expect(DISTINGUISHING_FEATURES).toContain(pair.feature);
			expect(pair.a).not.toBe(pair.b);
			expect(getThaiSymbol(pair.a), pair.a).toBeDefined();
			expect(getThaiSymbol(pair.b), pair.b).toBeDefined();
			expect(pair.detail, `${pair.a}/${pair.b}`).not.toBe("");

			const key = [pair.a, pair.b].sort().join("");
			expect(seen.has(key), `duplicate pair ${key}`).toBe(false);
			seen.add(key);

			expect(validateConfusablePair(pair)).toEqual({ ok: true });
		}
	});

	// AC5 — the pair list is derived, not curated: every lookalike relation
	// the shipped prose asserts must have a declared pair, so nothing gets
	// dropped for looking skippable.
	it("covers every lookalike pair the shipped prose asserts", () => {
		const comparison =
			/(?:looks (?:almost )?(?:the same as|identical to|just like|similar to|like)|written almost exactly like|contains shape of|distinguishes from|the mirror of|similar to|same as|like)\s+([ก-ฮ])(?![ก-ฮa-z])/gi;
		const declared = new Set(
			confusablePairs.map((pair) => [pair.a, pair.b].sort().join("")),
		);

		let derived = 0;
		for (const consonant of consonants) {
			for (const match of (consonant.mnemonic ?? "").matchAll(comparison)) {
				const other = match[1];
				if (other === consonant.character) continue;
				derived += 1;
				const key = [consonant.character, other].sort().join("");
				expect(
					declared.has(key),
					`prose says ${consonant.character} and ${other} look alike, but no pair declares the distinguishing feature`,
				).toBe(true);
			}
		}

		// The derivation actually ran over the corpus. The count only shrinks
		// as task 2.4 replaces the prose the pairs were extracted from.
		expect(derived).toBeGreaterThan(0);
	});

	// AC5 — two cues that merely differ, with no feature named, do not pass.
	it("rejects a pair that differs without naming its feature", () => {
		const unnamed = validateConfusablePair({
			a: "ด",
			b: "ต",
			detail: "the two cues differ",
		});
		expect(unnamed.ok).toBe(false);
		if (unnamed.ok) return;
		expect(unnamed.missing).toContain("feature");

		const offVocabulary = validateConfusablePair({
			a: "ด",
			b: "ต",
			feature: "vibes",
		});
		expect(offVocabulary.ok).toBe(false);
	});
});

describe("tone motion has one declaration site", () => {
	// AC6 — scene grammar names the shipped contour vocabulary as its source
	// instead of declaring a second one, and the pointer is checked against
	// the tree so it cannot dangle.
	it("points at the one file that declares the five contours", () => {
		const declaration = new RegExp(
			`(?:const|let|var|function|type|interface|enum)\\s+${TONE_MOTION_EXPORT}\\b`,
			"g",
		);

		const named = readFileSync(join(REPO_ROOT, TONE_MOTION_SOURCE), "utf8");
		expect(named).toMatch(declaration);
		for (const tone of ["mid", "low", "falling", "high", "rising"]) {
			expect(named, `contour "${tone}" missing at source`).toMatch(
				new RegExp(`\\b${tone}:`),
			);
		}

		const declarationSites = sourceFiles(SRC_ROOT).filter((path) => {
			const matches = readFileSync(path, "utf8").match(declaration);
			return matches !== null && matches.length > 0;
		});
		expect(declarationSites).toHaveLength(1);
		expect(declarationSites[0]).toBe(join(REPO_ROOT, TONE_MOTION_SOURCE));
	});
});

describe("annotation validation", () => {
	// AC7
	it("accepts a record binding shape, sound and district as separate fields", () => {
		expect(
			validateSceneAnnotation({
				kind: "consonant",
				district: "market",
				shapeCue: "an open frame with no head",
				soundCue: "a plain unaspirated stop",
				carriesTone: false,
				toneMotion: null,
			}),
		).toEqual({ ok: true });

		expect(
			validateSceneAnnotation({
				kind: "tone-mark",
				district: null,
				shapeCue: "a single flick",
				soundCue: "the name's own first tone",
				carriesTone: true,
				toneMotion: "falling",
			}),
		).toEqual({ ok: true });
	});

	// AC7 — a record binding only shape fails, naming what is missing.
	it("fails a record binding only shape, naming the missing fields", () => {
		const shapeOnly = validateSceneAnnotation({
			kind: "consonant",
			shapeCue: "an open frame with no head",
		});
		expect(shapeOnly.ok).toBe(false);
		if (shapeOnly.ok) return;
		expect(shapeOnly.missing).toContain("soundCue");
		expect(shapeOnly.missing).toContain("district");

		const motionless = validateSceneAnnotation({
			kind: "tone-mark",
			shapeCue: "a single flick",
			soundCue: "the name's own first tone",
			carriesTone: true,
		});
		expect(motionless.ok).toBe(false);
		if (motionless.ok) return;
		expect(motionless.missing).toContain("toneMotion");
	});
});

describe("the annotation records", () => {
	// AC9 — the shape covers all 83 mnemonic-carrying records, not only the
	// 73 task 2.4 rewrites, each with its romanization and final-sound slots.
	it("derives all 83 records, each carrying romanization and final-sound slots", () => {
		// 83 since ไม้ไต่คู้ joined the vowel inventory.
		expect(sceneAnnotations).toHaveLength(83);

		const byKind = new Map<string, number>();
		for (const annotation of sceneAnnotations) {
			byKind.set(annotation.kind, (byKind.get(annotation.kind) ?? 0) + 1);
		}
		expect(Object.fromEntries(byKind)).toEqual({
			consonant: 44,
			// 30 since ไม้ไต่คู้ joined lesson 7.
			vowel: 30,
			"tone-mark": 4,
			word: 5,
		});

		const keys = new Set(sceneAnnotations.map((annotation) => annotation.key));
		expect(keys.size).toBe(83);

		for (const annotation of sceneAnnotations) {
			expect(annotation.romanizedName, annotation.key).not.toBe("");
			expect(
				["final", "vowel-syllable", "not-applicable"],
				annotation.key,
			).toContain(annotation.finalSound.kind);
			if (annotation.kind === "consonant") {
				expect(annotation.finalSound.kind).toBe("final");
				if (annotation.finalSound.kind === "final") {
					expect(annotation.finalSound.sound, annotation.key).not.toBe("");
				}
			}
			if (annotation.kind === "vowel") {
				expect(annotation.finalSound.kind).toBe("vowel-syllable");
			}
		}
	});

	it("stages every consonant in the district its derived class names", () => {
		const consonantAnnotations = sceneAnnotations.filter(
			(annotation) => annotation.kind === "consonant",
		);
		for (const annotation of consonantAnnotations) {
			expect(annotation.classification?.state, annotation.key).toBe(
				"classified",
			);
			if (annotation.classification?.state !== "classified") continue;
			expect(annotation.district, annotation.key).toBe(
				districtForClass(annotation.classification.consonantClass),
			);
		}
	});

	it("gives every tone-carrying record a named motion, never contour data", () => {
		for (const annotation of sceneAnnotations) {
			if (annotation.kind === "tone-mark" || annotation.kind === "word") {
				expect(annotation.carriesTone, annotation.key).toBe(true);
				expect(annotation.toneMotion, annotation.key).not.toBeNull();
			} else {
				expect(annotation.toneMotion, annotation.key).toBeNull();
			}
		}
	});
});
