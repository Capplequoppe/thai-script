import { ThaiSymbolClass } from "./symbols";

// ============================================================================
// Sound type — consonant class as a derivable property
// ============================================================================
// Thai consonant class is a phonetic natural class, not an arbitrary list of
// 44 facts:
//
//   sonorant                 → always low   (derived, no memorisation)
//   unaspirated obstruent    → always mid   (derived; this is the whole class)
//   aspirate or fricative    → high or low  (only the 11 high ones are learned)
//
// Everything here reads a consonant's `initialSound` and `isAspirated` and
// NOTHING else. In particular the declared class field is never consulted: a
// derivation that peeked at it would agree with it by construction and could
// never catch the data drifting from the rule the lessons teach.

/** The three phonetic buckets every Thai consonant falls into. */
export type SoundType =
	| "sonorant"
	| "unaspirated-obstruent"
	| "aspirate-or-fricative";

/**
 * The one genuine memorisation load in the class system: the 11 high-class
 * letters. Every one is an aspirated stop or a fricative — the other two
 * buckets never consult this (or any) per-letter table.
 */
export const HIGH_CLASS_CONSONANTS: readonly string[] = [
	"ข",
	"ฃ",
	"ฉ",
	"ฐ",
	"ถ",
	"ผ",
	"ฝ",
	"ศ",
	"ษ",
	"ส",
	"ห",
];

// Phoneme classes, keyed by the leading token of `initialSound`. These are
// definitions of sound types (seven sonorant onsets exist in Thai, and so on),
// not per-letter tables: a glyph never appears here, so any consonant — even
// one this file has never seen — classifies from its sound alone.
const SONORANT_PHONEMES: readonly string[] = [
	"m",
	"n",
	"ng",
	"y",
	"r",
	"l",
	"w",
];
const PLAIN_OBSTRUENT_PHONEMES: readonly string[] = [
	"g",
	"j",
	"d",
	"dt",
	"b",
	"bp",
	// อ, the silent placeholder onset, patterns with the plain stops: it is the
	// ninth member of the mid class.
	"silent",
];
const ASPIRATED_STOP_PHONEMES: readonly string[] = ["kh", "ch", "th", "ph"];
const FRICATIVE_PHONEMES: readonly string[] = ["f", "s", "h"];

/**
 * The leading phoneme token of a stored `initialSound` — the part before the
 * first parenthetical gloss, e.g. `"th (same as ฑ and ท)"` → `"th"`.
 */
function leadingPhoneme(initialSound: string): string | null {
	const match = initialSound.match(/^([a-z]+)/i);
	return match ? match[1].toLowerCase() : null;
}

/**
 * Whether a consonant with this `initialSound` must carry `isAspirated: true`
 * for the data to be coherent: exactly the aspirated stops kh, ch, th, ph.
 * Fricatives (f, s, h) breathe but are not aspirated stops.
 */
export function expectedAspiration(initialSound: string): boolean {
	const token = leadingPhoneme(initialSound);
	return token !== null && ASPIRATED_STOP_PHONEMES.includes(token);
}

/** The facts classification reads. Deliberately excludes the declared class. */
export interface ConsonantSoundFacts {
	character: string;
	initialSound: string;
	isAspirated: boolean;
}

/**
 * The three states a consonant can be in with respect to classification.
 * `unclassifiable` always carries its reason, so a letter the rule cannot
 * place never reads the same as one nobody has looked at yet.
 */
export type Classification =
	| {
			state: "classified";
			soundType: SoundType;
			consonantClass: ThaiSymbolClass;
	  }
	| { state: "unclassifiable"; reason: string }
	| { state: "unclassified" };

/** The not-yet-attempted state, for consumers tracking classification lazily. */
export const UNCLASSIFIED: Classification = { state: "unclassified" };

type PhonemeKind =
	| "sonorant"
	| "plain-obstruent"
	| "aspirated-stop"
	| "fricative";

function phonemeKind(token: string): PhonemeKind | null {
	if (SONORANT_PHONEMES.includes(token)) return "sonorant";
	if (PLAIN_OBSTRUENT_PHONEMES.includes(token)) return "plain-obstruent";
	if (ASPIRATED_STOP_PHONEMES.includes(token)) return "aspirated-stop";
	if (FRICATIVE_PHONEMES.includes(token)) return "fricative";
	return null;
}

/**
 * Classify a consonant from its sound facts alone.
 *
 * Never returns the `unclassified` state — an input the rule cannot place is
 * reported as `unclassifiable` with the reason, which the return type
 * guarantees.
 */
export function classifyConsonant(
	facts: ConsonantSoundFacts,
): Exclude<Classification, { state: "unclassified" }> {
	const token = leadingPhoneme(facts.initialSound);
	if (token === null) {
		return {
			state: "unclassifiable",
			reason: `initialSound "${facts.initialSound}" has no leading phoneme token`,
		};
	}

	const kind = phonemeKind(token);
	if (kind === null) {
		return {
			state: "unclassifiable",
			reason: `initialSound token "${token}" is not a recognised Thai onset`,
		};
	}

	// The two fields must agree before either is trusted. This is the check
	// that caught ฑ and ฒ shipping as unaspirated while their own initialSound
	// read "th": a derivation that trusted one field silently would have
	// classed both wrong and let the rule take the blame.
	if (kind === "aspirated-stop" && !facts.isAspirated) {
		return {
			state: "unclassifiable",
			reason: `initialSound "${facts.initialSound}" names an aspirated stop but isAspirated is false`,
		};
	}
	if (kind !== "aspirated-stop" && facts.isAspirated) {
		return {
			state: "unclassifiable",
			reason: `isAspirated is true but initialSound token "${token}" is not an aspirated stop`,
		};
	}

	if (kind === "sonorant") {
		return {
			state: "classified",
			soundType: "sonorant",
			consonantClass: ThaiSymbolClass.Low,
		};
	}
	if (kind === "plain-obstruent") {
		return {
			state: "classified",
			soundType: "unaspirated-obstruent",
			consonantClass: ThaiSymbolClass.Mid,
		};
	}

	// Only the aspirate/fricative bucket consults a per-letter list — the
	// 11-member residue that genuinely has to be memorised.
	return {
		state: "classified",
		soundType: "aspirate-or-fricative",
		consonantClass: HIGH_CLASS_CONSONANTS.includes(facts.character)
			? ThaiSymbolClass.High
			: ThaiSymbolClass.Low,
	};
}
