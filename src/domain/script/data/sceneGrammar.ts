import { type Classification, classifyConsonant } from "./soundType";
import {
	consonants,
	type ThaiConsonant,
	ThaiSymbolClass,
	type ThaiToneMark,
	type ThaiVowel,
	type ThaiWord,
	type ToneValue,
	toneMarks,
	vowels,
	words,
} from "./symbols";

// ============================================================================
// Scene grammar — the annotation shape for every mnemonic-carrying record
// ============================================================================
// Several facts about Thai lived in this repo only inside mnemonic prose:
// which vowels change written form before a final consonant, which glyph
// pairs are lookalikes and what actually tells them apart, and where a
// symbol's mnemonic stages. Task 2.4 rewrites every one of those strings, so
// this module gives the facts fields first. The mnemonic rewrite then only
// replaces presentation over data that already exists.

// ----------------------------------------------------------------------------
// Districts — the non-colour channel for consonant class
// ----------------------------------------------------------------------------
// Class is encoded twice: colour (consonantClassColor.ts, already shipped)
// and a scene district. A district is a PLACE, deliberately height-free,
// because tone is pitch and owns the vertical axis (see TONE_MOTION_SOURCE
// below) — encoding class as height would spend the tone metaphor twice.
// The three places are chosen to be distinguishable by silhouette alone, so
// the channel still works under red-green colour vision deficiency, and each
// carries a sound-congruent hook for the mnemonics built on it: the high
// class is the breathy aspirates and fricatives (a temple's hush), the mid
// class is the plain unaspirated stops (flat market haggling), and the low
// class's derivable core is the humming sonorants (harbor horns).

export const DISTRICTS = ["temple", "market", "harbor"] as const;

export type District = (typeof DISTRICTS)[number];

const DISTRICT_FOR_CLASS: Record<ThaiSymbolClass, District> = {
	[ThaiSymbolClass.High]: "temple",
	[ThaiSymbolClass.Mid]: "market",
	[ThaiSymbolClass.Low]: "harbor",
};

/** The class district a consonant of the given class stages in. */
export function districtForClass(classType: ThaiSymbolClass): District {
	return DISTRICT_FOR_CLASS[classType];
}

// ----------------------------------------------------------------------------
// Tone motion — named, never re-declared
// ----------------------------------------------------------------------------
// The tone-motion vocabulary already ships: TONE_CONTOUR_POINTS in
// ToneContourIcon.tsx draws all five contours on every word card. That file
// is the single declaration site; annotations refer to a motion by its
// ToneValue name and never carry contour data of their own. If the vocabulary
// moves, this pointer is the one place scene grammar has to follow it.

export const TONE_MOTION_SOURCE =
	"src/presentation/components/atoms/ToneContourIcon.tsx";

export const TONE_MOTION_EXPORT = "TONE_CONTOUR_POINTS";

// ----------------------------------------------------------------------------
// Conditional vowel forms — extracted from prose into fields
// ----------------------------------------------------------------------------
// Form strings use "-" for a consonant slot: one dash in an open form (the
// initial consonant), two in a with-final form (initial, then final). โ-ะ's
// with-final form is "--" — the vowel is written with nothing at all.

export interface ConditionalVowelForm {
	/** Joins ThaiVowel.character exactly, leading space and all. */
	vowel: string;
	/** How the vowel is written with no final consonant. */
	openForm: string;
	/** How it is written when a final consonant follows. */
	withFinalForm: string;
	/** A word showing the with-final form on a real syllable. */
	example?: string;
	exceptions?: readonly {
		finalConsonant: string;
		form: string;
		example?: string;
		note: string;
	}[];
}

export const conditionalVowelForms: readonly ConditionalVowelForm[] = [
	{
		vowel: "ะ",
		openForm: "-ะ",
		withFinalForm: "-ั-",
		example: "มัน",
	},
	{
		vowel: "เ-ะ",
		openForm: "เ-ะ",
		withFinalForm: "เ-็-",
		example: "เป็น",
	},
	{
		vowel: "แ-ะ",
		openForm: "แ-ะ",
		withFinalForm: "แ-็-",
		example: "แข็ง",
	},
	{
		vowel: "โ-ะ",
		openForm: "โ-ะ",
		withFinalForm: "--",
		example: "กฎ",
	},
	{
		vowel: "เ-าะ",
		openForm: "เ-าะ",
		withFinalForm: "-็อ-",
		example: "น็อต",
	},
	{
		vowel: "เ-อ",
		openForm: "เ-อ",
		withFinalForm: "เ-ิ-",
		example: "เดิน",
		exceptions: [
			{
				finalConsonant: "ย",
				form: "เ-ย",
				example: "เลย",
				note: "before a final ย the อ drops and no สระ อิ is written",
			},
		],
	},
	{
		vowel: "เ-อะ",
		openForm: "เ-อะ",
		withFinalForm: "เ-ิ-",
		// The only entry with no example: common Thai has no closed short
		// เ-อะ syllable to cite, so the with-final form stands on the shipped
		// prose alone (the เ-อะ mnemonic states it; task 3.1 teaches it).
	},
	{
		vowel: "-ัว",
		openForm: "-ัว",
		withFinalForm: "-ว-",
		example: "สวน",
	},
	{
		vowel: " ื",
		openForm: "-ือ",
		withFinalForm: "-ื-",
		example: "มืด",
	},
];

/** The conditional written forms for a vowel, if its form changes at all. */
export function conditionalFormFor(
	vowelCharacter: string,
): ConditionalVowelForm | null {
	return (
		conditionalVowelForms.find((form) => form.vowel === vowelCharacter) ?? null
	);
}

// ----------------------------------------------------------------------------
// Confusable pairs — the distinguishing feature as data
// ----------------------------------------------------------------------------

export const DISTINGUISHING_FEATURES = [
	"added-stroke",
	"bump",
	"head-direction",
	"mirror",
	"stroke-height",
	"tail",
	"top-ornament",
] as const;

export type DistinguishingFeature = (typeof DISTINGUISHING_FEATURES)[number];

export interface ConfusablePair {
	a: string;
	b: string;
	feature: DistinguishingFeature;
	/** Which glyph differs how — one clause, in this repo's own words. */
	detail: string;
}

export const confusablePairs: readonly ConfusablePair[] = [
	{
		a: "ก",
		b: "ถ",
		feature: "added-stroke",
		detail: "ถ coils a head inside the frame that ก leaves open",
	},
	{
		a: "ก",
		b: "ภ",
		feature: "added-stroke",
		detail: "ภ hangs a head off the left leg that ก does without",
	},
	{
		a: "ข",
		b: "ฃ",
		feature: "bump",
		detail: "ฃ cuts a notch into the top stroke that ข keeps smooth",
	},
	{
		a: "ข",
		b: "ช",
		feature: "tail",
		detail: "ช raises a tail above the line while ข stays at height",
	},
	{
		a: "ค",
		b: "ฅ",
		feature: "bump",
		detail: "ฅ cuts a notch into the top stroke that ค keeps smooth",
	},
	{
		a: "ค",
		b: "ศ",
		feature: "added-stroke",
		detail: "ศ plants an extra flag stroke on top of the ค shape",
	},
	{
		a: "ฆ",
		b: "ม",
		feature: "added-stroke",
		detail: "ฆ adds a bumped curve after the head that ม lacks",
	},
	{
		a: "ช",
		b: "ซ",
		feature: "bump",
		detail: "ซ dents its first stroke where ช runs smooth",
	},
	{
		a: "ญ",
		b: "ณ",
		feature: "added-stroke",
		detail: "ญ hangs a detached curl underneath; ณ ends in an attached loop",
	},
	{
		a: "ฎ",
		b: "ฏ",
		feature: "bump",
		detail: "ฏ works an extra bump into the base line before the loop",
	},
	{
		a: "ฑ",
		b: "ท",
		feature: "bump",
		detail: "ฑ puts a bump right after the head where ท goes straight up",
	},
	{
		a: "ณ",
		b: "น",
		feature: "added-stroke",
		detail: "ณ opens with a whole ก-frame before the loop that is all of น",
	},
	{
		a: "ด",
		b: "ต",
		feature: "bump",
		detail: "ต dents the top of the bowl that ด keeps round",
	},
	{
		a: "ถ",
		b: "ภ",
		feature: "head-direction",
		detail: "ถ's head coils inside the frame; ภ's sticks out to the left",
	},
	{
		a: "ท",
		b: "ห",
		feature: "bump",
		detail: "ห kinks its left stroke where ท drops straight",
	},
	{
		a: "ธ",
		b: "ร",
		feature: "added-stroke",
		detail: "ธ closes its top into a loop with a crossbar; ร stays open",
	},
	{
		a: "น",
		b: "ม",
		feature: "mirror",
		detail: "the same loop hangs from opposite shoulders",
	},
	{
		a: "บ",
		b: "ป",
		feature: "stroke-height",
		detail: "ป's right stroke rises past the head; บ's stops level",
	},
	{
		a: "บ",
		b: "ษ",
		feature: "added-stroke",
		detail: "ษ crosses the บ shape with an extra line",
	},
	{
		a: "ผ",
		b: "พ",
		feature: "head-direction",
		detail: "ผ's head stays inside the letter; พ's sits outside it",
	},
	{
		a: "ฝ",
		b: "ฟ",
		feature: "head-direction",
		detail: "ฝ's head stays inside the letter; ฟ's sits outside it",
	},
	{
		a: "พ",
		b: "ฟ",
		feature: "stroke-height",
		detail: "ฟ's last stroke rises higher than the rest; พ's stays level",
	},
	{
		a: "พ",
		b: "ฬ",
		feature: "added-stroke",
		detail: "ฬ ends in an extra curled tail that พ never grows",
	},
	{
		a: "ล",
		b: "ส",
		feature: "added-stroke",
		detail: "ส crosses the ล shape with an extra line",
	},
	{
		a: "อ",
		b: "ฮ",
		feature: "added-stroke",
		detail: "ฮ wears a zigzag crown over the plain ring of อ",
	},
	{
		a: "ไ",
		b: "ใ",
		feature: "top-ornament",
		detail: "ไ tops out in a zigzag, ใ in a curl",
	},
];

// ----------------------------------------------------------------------------
// Final-sound behaviour
// ----------------------------------------------------------------------------

export type FinalSoundBehaviour =
	| { kind: "final"; sound: string }
	| { kind: "vowel-syllable"; syllable: "live" | "dead" }
	| { kind: "not-applicable" };

// Short vowels whose open syllable is nonetheless live, because the vowel
// carries its own sonorant ending: ำ ends in m, ไ and ใ in the i glide, เ-า
// in the o glide. Everything else derives from length: long open syllables
// are live, short ones dead.
const LIVE_SHORT_VOWELS: readonly string[] = ["ำ", "ไ", "ใ", "เ-า"];

function openSyllableLiveness(vowel: ThaiVowel): "live" | "dead" {
	if (vowel.length === "long") return "live";
	return LIVE_SHORT_VOWELS.includes(vowel.character) ? "live" : "dead";
}

// ----------------------------------------------------------------------------
// The annotation record
// ----------------------------------------------------------------------------

export type AnnotationKind = "consonant" | "vowel" | "tone-mark" | "word";

export interface SceneAnnotation {
	kind: AnnotationKind;
	/** ThaiSymbol.character, or the Thai spelling for a word record. */
	key: string;
	romanizedName: string;
	finalSound: FinalSoundBehaviour;
	/** Sound-type classification; null where the kind has no class at all. */
	classification: Classification | null;
	/** Class district; null for kinds that must not cue a class. */
	district: District | null;
	/** The mnemonic's shape binding. Task 2.4 authors these. */
	shapeCue: string | null;
	/** The mnemonic's sound binding. Task 2.4 authors these. */
	soundCue: string | null;
	carriesTone: boolean;
	/** One of the five shipped motions, named — never contour data. */
	toneMotion: ToneValue | null;
	conditionalForm: ConditionalVowelForm | null;
}

function consonantAnnotation(consonant: ThaiConsonant): SceneAnnotation {
	const classification = classifyConsonant(consonant);
	return {
		kind: "consonant",
		key: consonant.character,
		romanizedName: consonant.nameRomanized,
		finalSound: { kind: "final", sound: consonant.finalSound },
		classification,
		district:
			classification.state === "classified"
				? districtForClass(classification.consonantClass)
				: null,
		shapeCue: null,
		soundCue: null,
		carriesTone: false,
		toneMotion: null,
		conditionalForm: null,
	};
}

function vowelAnnotation(vowel: ThaiVowel): SceneAnnotation {
	return {
		kind: "vowel",
		key: vowel.character,
		romanizedName: vowel.name,
		finalSound: {
			kind: "vowel-syllable",
			syllable: openSyllableLiveness(vowel),
		},
		classification: null,
		district: null,
		shapeCue: null,
		soundCue: null,
		carriesTone: false,
		toneMotion: null,
		conditionalForm: conditionalFormFor(vowel.character),
	};
}

function toneMarkAnnotation(mark: ThaiToneMark): SceneAnnotation {
	return {
		kind: "tone-mark",
		key: mark.character,
		romanizedName: mark.name,
		finalSound: { kind: "not-applicable" },
		classification: null,
		district: null,
		shapeCue: null,
		soundCue: null,
		carriesTone: true,
		// The mark's citation motion is its mid-class effect — the tone it is
		// named for. The full class-dependent table stays on ThaiToneMark.
		toneMotion: mark.midClassTone,
		conditionalForm: null,
	};
}

function wordAnnotation(word: ThaiWord): SceneAnnotation {
	return {
		kind: "word",
		key: word.name,
		romanizedName: word.romanization,
		finalSound: { kind: "not-applicable" },
		classification: null,
		district: null,
		shapeCue: null,
		soundCue: null,
		carriesTone: true,
		toneMotion: word.tone,
		conditionalForm: null,
	};
}

/**
 * One annotation per mnemonic-carrying record in symbols.ts: 44 consonants,
 * 29 vowels, 4 tone marks, and the mnemonic-bearing words — 82 in all. The
 * word and tone-mark records are the nine whose facts have no other home.
 */
export const sceneAnnotations: readonly SceneAnnotation[] = [
	...consonants.map(consonantAnnotation),
	...vowels.map(vowelAnnotation),
	...toneMarks.map(toneMarkAnnotation),
	...words.filter((word) => word.mnemonic !== undefined).map(wordAnnotation),
];

const annotationsByKey = new Map(
	sceneAnnotations.map((annotation) => [annotation.key, annotation]),
);

export function annotationFor(key: string): SceneAnnotation | undefined {
	return annotationsByKey.get(key);
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------
// Failures name their fields. A refused record must never look like an empty
// one — the caller gets the exact list of what is missing and what is wrong.

export type Validation =
	| { ok: true }
	| { ok: false; missing: readonly string[]; invalid: readonly string[] };

function verdict(missing: string[], invalid: string[]): Validation {
	return missing.length === 0 && invalid.length === 0
		? { ok: true }
		: { ok: false, missing, invalid };
}

function isBlank(value: string | null | undefined): boolean {
	return value === null || value === undefined || value.trim() === "";
}

/** The loosely-typed shape validation accepts, so deficient records can be checked. */
export interface SceneAnnotationInput {
	kind: AnnotationKind;
	district?: District | null;
	shapeCue?: string | null;
	soundCue?: string | null;
	carriesTone?: boolean;
	toneMotion?: ToneValue | null;
}

/**
 * A record validates only if it binds shape and sound as separate cues, its
 * district where it carries a class, and its tone motion where it carries a
 * tone. A record binding only shape fails, naming the missing fields.
 */
export function validateSceneAnnotation(
	record: SceneAnnotationInput,
): Validation {
	const missing: string[] = [];
	const invalid: string[] = [];

	if (isBlank(record.shapeCue)) missing.push("shapeCue");
	if (isBlank(record.soundCue)) missing.push("soundCue");

	if (record.kind === "consonant") {
		if (!record.district) missing.push("district");
	} else if (record.district) {
		invalid.push(
			"district: only a class-bearing record stages in a class district",
		);
	}

	if (record.carriesTone) {
		if (!record.toneMotion) missing.push("toneMotion");
	} else if (record.toneMotion) {
		invalid.push("toneMotion: only a tone-carrying record encodes a motion");
	}

	return verdict(missing, invalid);
}

export function validateConditionalForm(form: {
	vowel?: string;
	openForm?: string;
	withFinalForm?: string;
}): Validation {
	const missing: string[] = [];
	const invalid: string[] = [];

	if (isBlank(form.vowel)) missing.push("vowel");
	if (isBlank(form.openForm)) missing.push("openForm");
	if (isBlank(form.withFinalForm)) missing.push("withFinalForm");
	if (
		!isBlank(form.openForm) &&
		!isBlank(form.withFinalForm) &&
		form.openForm === form.withFinalForm
	) {
		invalid.push("withFinalForm: declares no change from the open form");
	}

	return verdict(missing, invalid);
}

export function validateConfusablePair(pair: {
	a?: string;
	b?: string;
	feature?: string;
	detail?: string;
}): Validation {
	const missing: string[] = [];
	const invalid: string[] = [];

	if (isBlank(pair.a)) missing.push("a");
	if (isBlank(pair.b)) missing.push("b");
	if (isBlank(pair.feature)) {
		missing.push("feature");
	} else if (
		!(DISTINGUISHING_FEATURES as readonly string[]).includes(
			pair.feature as string,
		)
	) {
		invalid.push(`feature: "${pair.feature}" is not a distinguishing feature`);
	}
	if (!isBlank(pair.a) && pair.a === pair.b) {
		invalid.push("b: a pair must name two different glyphs");
	}

	return verdict(missing, invalid);
}
