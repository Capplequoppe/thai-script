import type { ToneValue } from "../../script/data/symbols";
import type { VocabEntry } from "../types";

/**
 * The vocabulary corpus is not uniformly IPA — some entries are already
 * Paiboon, some are a partial mix of both, and a few are neither. Only
 * entries classified `"ipa"` are ever converted. See
 * `scripts/convert-romanization.py`, which performs the actual one-time
 * migration of `vocabulary.json`; this module mirrors its classification and
 * conversion rules for the app (and its tests) to reason about the result.
 */
export type NotationClass = "ipa" | "paiboon" | "mixed" | "neither";

export type ConversionState = "unconverted" | "converted" | "failed";

export interface ConversionResult {
	state: ConversionState;
	paiboon: string | null;
	reason?: string;
}

const TONE_MARKS: Record<string, ToneValue> = {
	"̀": "low", // grave
	"́": "high", // acute
	"̂": "falling", // circumflex
	"̌": "rising", // caron
};
const TONE_TO_MARK: Record<ToneValue, string> = {
	mid: "",
	low: "̀",
	high: "́",
	falling: "̂",
	rising: "̌",
};
const COMBINING_MARKS = new Set(Object.keys(TONE_MARKS));

const IPA_MARKER_CHARS = new Set("ʰʔɕŋɯɛɔɤəʉː");
const ALLOWED_CHARS = new Set([
	..."abcdefghijklmnopqrstuvwxyz ʰʔɕŋɯɛɔɤəʉː'-",
	...COMBINING_MARKS,
	..."àáâǎèéêěìíîǐòóôǒùúûǔ",
]);

const ONSET_MAP: Record<string, string> = {
	p: "bp",
	t: "dt",
	k: "g",
	tɕ: "j",
	pʰ: "ph",
	tʰ: "th",
	kʰ: "kh",
	tɕʰ: "ch",
	b: "b",
	d: "d",
	m: "m",
	n: "n",
	ŋ: "ng",
	ɕ: "ch",
	s: "s",
	f: "f",
	h: "h",
	r: "r",
	l: "l",
	w: "w",
	j: "y",
	th: "th",
	ph: "ph",
	kh: "kh",
	ch: "ch",
	bp: "bp",
	dt: "dt",
};

const CODA_MAP: Record<string, string> = {
	p: "p",
	t: "t",
	k: "k",
	m: "m",
	n: "n",
	ŋ: "ng",
	ng: "ng",
	j: "i",
	w: "o",
};

const VOWEL_MAP: Record<string, string> = {
	a: "a",
	e: "e",
	i: "i",
	o: "o",
	u: "u",
	ɛ: "ae",
	ɔ: "aw",
	ɤ: "oe",
	ɯ: "ue",
	ə: "er",
	ʉ: "ue",
};
const LONG_VOWEL_MAP: Record<string, string> = Object.fromEntries(
	Object.entries(VOWEL_MAP).map(([k, v]) => [k, v[0] + v]),
);
const VOWEL_TOKENS = new Set(Object.keys(VOWEL_MAP));
const DIPHTHONG_MAP: Record<string, string> = { u: "ua", i: "ia", ɯ: "uea" };

const TOKEN_ORDER = [
	"tɕʰ",
	"tɕ",
	"pʰ",
	"tʰ",
	"kʰ",
	"th",
	"ph",
	"kh",
	"ch",
	"bp",
	"dt",
	"ng",
	"ɕ",
	"ŋ",
	"ɯ",
	"ɛ",
	"ɔ",
	"ɤ",
	"ə",
	"ʉ",
];

function tokenizeBare(bare: string): string[] {
	const tokens: string[] = [];
	let i = 0;
	while (i < bare.length) {
		const match = TOKEN_ORDER.find((candidate) =>
			bare.startsWith(candidate, i),
		);
		const token = match ?? bare[i];
		tokens.push(token);
		i += token.length;
	}
	return tokens;
}

function stripTone(token: string): { bare: string; tone: ToneValue } {
	const nfd = token.normalize("NFD");
	let tone: ToneValue = "mid";
	let bare = "";
	for (const ch of nfd) {
		if (ch in TONE_MARKS) {
			tone = TONE_MARKS[ch];
		} else {
			bare += ch;
		}
	}
	return { bare, tone };
}

function applyTone(spelling: string, tone: ToneValue): string {
	if (tone === "mid" || spelling === "") return spelling;
	const mark = TONE_TO_MARK[tone];
	return (spelling[0] + mark + spelling.slice(1)).normalize("NFC");
}

class SyllableConversionError extends Error {}

function convertSyllable(syllable: string): string {
	const { bare, tone } = stripTone(syllable);
	const tokens = tokenizeBare(bare);

	let i = 0;
	if (tokens[i] === "ʔ") i++;

	const onset: string[] = [];
	while (i < tokens.length && !VOWEL_TOKENS.has(tokens[i])) {
		if (tokens[i] === "ʰ" || tokens[i] === "ː" || tokens[i] === "ʔ") {
			throw new SyllableConversionError(
				`unexpected ${tokens[i]} before a vowel`,
			);
		}
		if (!(tokens[i] in ONSET_MAP)) {
			throw new SyllableConversionError(`unmapped onset token ${tokens[i]}`);
		}
		onset.push(tokens[i]);
		i++;
	}

	if (i >= tokens.length) {
		throw new SyllableConversionError("no vowel nucleus found");
	}

	const vowelToken = tokens[i];
	i++;

	let vowelSpelling: string;
	let lookahead = i;
	while (
		lookahead < tokens.length &&
		(tokens[lookahead] === "ː" || tokens[lookahead] === "ʔ")
	) {
		lookahead++;
	}
	if (
		vowelToken in DIPHTHONG_MAP &&
		lookahead < tokens.length &&
		tokens[lookahead] === "a"
	) {
		vowelSpelling = DIPHTHONG_MAP[vowelToken];
		i = lookahead + 1;
		while (i < tokens.length && (tokens[i] === "ː" || tokens[i] === "ʔ")) {
			i++;
		}
	} else {
		let longVowel = false;
		while (i < tokens.length && (tokens[i] === "ː" || tokens[i] === "ʔ")) {
			if (tokens[i] === "ː") longVowel = true;
			i++;
		}
		vowelSpelling = longVowel
			? LONG_VOWEL_MAP[vowelToken]
			: VOWEL_MAP[vowelToken];
	}

	const coda: string[] = [];
	while (i < tokens.length) {
		if (!(tokens[i] in CODA_MAP)) {
			throw new SyllableConversionError(`unmapped coda token ${tokens[i]}`);
		}
		coda.push(tokens[i]);
		i++;
	}

	const onsetSpelling = onset.map((t) => ONSET_MAP[t]).join("");
	const nucleusSpelling = applyTone(vowelSpelling, tone);
	const codaSpelling = coda.map((t) => CODA_MAP[t]).join("");

	return onsetSpelling + nucleusSpelling + codaSpelling;
}

/**
 * Convert a full (possibly multi-syllable, space/hyphen-separated) IPA
 * romanization to Paiboon. Throws if any syllable cannot be parsed — callers
 * that need a non-throwing result should use {@link convertEntry}.
 */
export function convertIpaToPaiboon(ipa: string): string {
	let out = "";
	let token = "";
	for (const ch of ipa) {
		if (ch === " " || ch === "-") {
			if (token) {
				out += convertSyllable(token);
				token = "";
			}
			out += ch;
		} else {
			token += ch;
		}
	}
	if (token) out += convertSyllable(token);
	return out;
}

function hasStandaloneG(s: string): boolean {
	for (let i = 0; i < s.length; i++) {
		if (s[i] === "g" && (i === 0 || s[i - 1] !== "n")) return true;
	}
	return false;
}

function hasDoubledVowel(s: string): boolean {
	for (let i = 0; i < s.length - 1; i++) {
		if (s[i] === s[i + 1] && "aeiou".includes(s[i])) return true;
	}
	return false;
}

function hasUnconvertedOnsetStop(s: string): boolean {
	const boundaries = [0];
	for (let i = 0; i < s.length; i++) {
		if (s[i] === " " || s[i] === "-") boundaries.push(i + 1);
	}
	for (const start of boundaries) {
		if (start >= s.length) continue;
		const ch = s[start];
		if (
			(ch === "p" || ch === "t" || ch === "k") &&
			!["th", "ph", "kh"].includes(s.slice(start, start + 2))
		) {
			return true;
		}
	}
	return false;
}

function hasUnconvertedCodaGlide(s: string): boolean {
	const boundaries = [s.length];
	for (let i = 0; i < s.length; i++) {
		if (s[i] === " " || s[i] === "-") boundaries.push(i);
	}
	for (const end of boundaries) {
		if (end <= 0) continue;
		if (s[end - 1] === "j" || s[end - 1] === "w") return true;
	}
	return false;
}

/** Classify one romanization string as ipa / paiboon / mixed / neither. */
export function classifyNotation(romanization: string): NotationClass {
	const s = romanization;
	if (s === "" || [...s].some((ch) => !ALLOWED_CHARS.has(ch))) {
		return "neither";
	}

	const hasIpa = [...s].some((ch) => IPA_MARKER_CHARS.has(ch));
	const hasPaiboon =
		s.includes("bp") ||
		s.includes("dt") ||
		hasStandaloneG(s) ||
		hasDoubledVowel(s);

	if (hasIpa && hasPaiboon) return "mixed";
	if (hasIpa) return "ipa";
	if (hasPaiboon) return "paiboon";

	// No explicit marker either way. The only remaining difference between
	// the two notations is a bare, syllable-initial unaspirated p/t/k/tɕ, or
	// a bare, syllable-final j/w diphthong off-glide.
	return hasUnconvertedOnsetStop(s) || hasUnconvertedCodaGlide(s)
		? "ipa"
		: "paiboon";
}

/** Convert one entry's romanization, never throwing. */
export function convertEntry(romanization: string): ConversionResult {
	const notation = classifyNotation(romanization);
	if (notation !== "ipa") {
		return { state: "unconverted", paiboon: null };
	}
	try {
		return { state: "converted", paiboon: convertIpaToPaiboon(romanization) };
	} catch (err) {
		return {
			state: "failed",
			paiboon: null,
			reason: err instanceof Error ? err.message : String(err),
		};
	}
}

/** Notation-class counts across a corpus — the AC1 measurement. */
export function summarizeNotationCounts(
	entries: readonly VocabEntry[],
): Record<NotationClass, number> {
	const counts: Record<NotationClass, number> = {
		ipa: 0,
		paiboon: 0,
		mixed: 0,
		neither: 0,
	};
	for (const entry of entries) {
		counts[classifyNotation(entry.romanization)]++;
	}
	return counts;
}

/**
 * Recover the tone a Paiboon spelling encodes, from its diacritic. `null`
 * when the spelling carries no vowel at all (never happens on a real
 * syllable, but keeps this total rather than throwing on garbage input).
 */
export function recoverTone(paiboon: string): ToneValue | null {
	const nfd = paiboon.normalize("NFD");
	for (const ch of nfd) {
		if (ch in TONE_MARKS) return TONE_MARKS[ch];
	}
	return /[aeiou]/i.test(paiboon) ? "mid" : null;
}
