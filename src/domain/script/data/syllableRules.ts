/**
 * The three rules that actually stop beginners reading Thai, as checkable data.
 *
 * Phase 3 promotes them from scattered asides to real lessons:
 *
 * 1. **Unwritten vowels** — a written Thai syllable can carry no vowel symbol
 *    at all, and there are four distinct ways that happens.
 * 2. **Consonant clusters** — a closed inventory, with two kinds of pair that
 *    look like clusters and are not.
 * 3. **Leading consonants (อักษรนำ)** — one mechanism with three branches, of
 *    which the source course teaches two, ten lessons apart, as unrelated
 *    observations.
 *
 * These are stated as data rather than prose because `vocabulary.json` already
 * carries a per-entry `syllables` analysis, so the rules can be *run* against
 * real words. Where the rules and the corpus disagree, one of the two is wrong
 * about a real word — see `reconcileWithCorpus` and `CORPUS_BASELINE`.
 *
 * CONTEXT.md rule 2 — build on, never beside. Everything here extends
 * something `symbols.ts` already ships: the no-tone-mark tone table is read
 * out of `completeToneChart`, consonant classes out of `getConsonant`, and
 * every `specialRules` entry these lessons promote is named in
 * `PROMOTED_SPECIAL_RULES`, so the original stays reachable from the
 * replacement. Rules with no `specialRules` entry to promote — the bare final
 * ร and ร หัน, which the source course never states — carry no link, and that
 * absence is the honest reading of it rather than an omission.
 */

import { classifyConsonant } from "./soundType";
import {
	completeToneChart,
	getConsonant,
	ThaiSymbolClass,
	type ToneValue,
} from "./symbols";

// ============================================================================
// The alphabet these rules range over
// ============================================================================

/** Thai consonant block, ก (U+0E01) through ฮ (U+0E2E). */
/**
 * The `specialRules` entries in `symbols.ts` that these lessons promote, and
 * the declaration here that promotes each (CONTEXT.md rule 2 — build on the
 * original, never beside it).
 *
 * Stated once, as a record, rather than as a field repeated down the cluster
 * inventory: all twenty pairs promote the same entry, so a per-pair field
 * would be twenty copies of one fact. The ids are checked against
 * `specialRules` by test, because a typo in one is otherwise silent — nothing
 * in the type system relates these strings to anything.
 */
export const PROMOTED_SPECIAL_RULES: Readonly<Record<string, string>> =
	Object.freeze({
		"unwritten-vowels": "IMPLICIT_VOWEL_RULES",
		"consonant-clusters": "CLUSTER_INVENTORY",
		"hor-nam": "LEADING_CONSONANT_RULE",
		"o-ang-dual-role": "VOWEL_LETTERS",
	});

/** True for the 44 letters of the consonant block, ก through ฮ. */
export function isThaiConsonant(character: string): boolean {
	return character >= "ก" && character <= "ฮ";
}

/** A word written with consonants and nothing else — no vowel, no tone mark. */
export function isBareConsonantWord(word: string): boolean {
	const characters = [...word];
	return characters.length > 0 && characters.every(isThaiConsonant);
}

/** Every letter of the Thai consonant block, ก through ฮ, in code order. */
const THAI_CONSONANT_BLOCK: readonly string[] = Object.freeze(
	Array.from({ length: 0x0e2e - 0x0e01 + 1 }, (_, index) =>
		String.fromCodePoint(0x0e01 + index),
	).filter((character) => classOf(character) !== undefined),
);

/**
 * The sonorants (อักษรเสียงก้อง). They matter twice: a leading consonant may
 * only lead one of these, and they are the finals that make a syllable live.
 *
 * This is the set of low-class consonants with no high-class counterpart —
 * which is *why* the leading-consonant rule exists at all: it is the only way
 * to write a rising or a low tone on one of them.
 *
 * **Derived**, from `soundType.ts`'s sound-only classification rather than
 * listed here, so this module and the class derivation phase 2 shipped cannot
 * disagree about which letters they are.
 */
export const SONORANTS: readonly string[] = Object.freeze(
	THAI_CONSONANT_BLOCK.filter((character) => {
		const consonant = getConsonant(character);
		if (!consonant) return false;
		const classification = classifyConsonant({
			character,
			initialSound: consonant.initialSound,
			isAspirated: consonant.isAspirated,
		});
		return (
			classification.state === "classified" &&
			classification.soundType === "sonorant"
		);
	}),
);

const SONORANT_SET = new Set(SONORANTS);

/** True for the ten low-class sonorants a leading consonant can lead. */
export function isSonorant(character: string): boolean {
	return SONORANT_SET.has(character);
}

/**
 * What a consonant sounds like in final position, and therefore whether the
 * syllable is live or dead. A stop final (`k`/`t`/`p`) makes a dead syllable;
 * a sonorant final makes a live one.
 */
const FINAL_SOUNDS: Readonly<Record<string, string>> = Object.freeze({
	ก: "k",
	ข: "k",
	ค: "k",
	ฆ: "k",
	จ: "t",
	ฉ: "t",
	ช: "t",
	ซ: "t",
	ฌ: "t",
	ฎ: "t",
	ฏ: "t",
	ฐ: "t",
	ฑ: "t",
	ฒ: "t",
	ด: "t",
	ต: "t",
	ถ: "t",
	ท: "t",
	ธ: "t",
	ศ: "t",
	ษ: "t",
	ส: "t",
	บ: "p",
	ป: "p",
	พ: "p",
	ฟ: "p",
	ภ: "p",
	ง: "ng",
	ญ: "n",
	ณ: "n",
	น: "n",
	ร: "n",
	ล: "n",
	ฬ: "n",
	ม: "m",
	ย: "y",
	ว: "w",
});

const STOP_FINAL_SOUNDS = new Set(["k", "t", "p"]);

/** The sound a consonant makes when it closes a syllable, or `undefined`. */
export function finalSoundOf(character: string): string | undefined {
	return FINAL_SOUNDS[character];
}

// ============================================================================
// AC6 — the letters that act as vowels
// ============================================================================

/**
 * อ and ว are consonants in the alphabet and vowels in the middle of a word.
 * Until that is stated, a bare three-consonant word has no decidable reading:
 * ของ is ข-อ-ง with อ as its vowel, not ข + an unwritten โอะ + a doubled final.
 *
 * Both conditions below are stated as a learner can apply them, left to right,
 * with nothing but the written word in front of them.
 */
export interface VowelLetter {
	readonly letter: string;
	/** The vowel it spells when the condition holds. */
	readonly vowel: string;
	readonly romanization: string;
	/** Long vowels make an open syllable live; short ones make it dead. */
	readonly length: "short" | "long";
	/** When the letter is read as a vowel. */
	readonly condition: string;
	/** When it is still a consonant. */
	readonly stillAConsonant: string;
	/** The `specialRules` entry in `symbols.ts` this promotes, if any. */
	readonly extendsSpecialRule?: string;
}

export const VOWEL_LETTERS: readonly VowelLetter[] = Object.freeze([
	Object.freeze({
		letter: "อ",
		vowel: "-อ",
		romanization: "aaw",
		length: "long" as const,
		condition:
			"Anywhere but the first letter of the word, อ is the vowel -อ (aaw): ของ, ชอบ, บอก, สอง.",
		stillAConsonant:
			"As the first letter of a word, อ is the silent placeholder that carries a vowel with no consonant of its own: ออก is อ-อ-ก, placeholder then vowel.",
		extendsSpecialRule: "o-ang-dual-role",
	}),
	Object.freeze({
		letter: "ว",
		vowel: "-ัว",
		romanization: "ua",
		length: "long" as const,
		condition:
			"Between two consonants with no other vowel written in the syllable, ว is the vowel -ัว (ua): รวม, ดวง, ขวด, ตรวจ.",
		stillAConsonant:
			"At the start of a syllable ว is the consonant w (วง), after a vowel it is the final w, and after ก ข ค with a vowel following it is the second half of a cluster (ขวา).",
	}),
]);

const VOWEL_LETTER_BY_CHARACTER = new Map(
	VOWEL_LETTERS.map((entry) => [entry.letter, entry]),
);

// ============================================================================
// AC3 — the cluster inventory, closed
// ============================================================================

/**
 * Three kinds of consonant pair, and only the first is a cluster:
 *
 * - `true` — both consonants are pronounced, in order. Only ร, ล and ว ever
 *   appear second, and only after the seven initials listed below.
 * - `false-sound` — the pair is pronounced as a single sound that is neither
 *   of its parts. ทร is /s/: ทราบ is *sâap*, not *thrâap*.
 * - `silent-second` — the ร is simply not pronounced. จริง is *jing*,
 *   สร้าง is *sâang*, เสร็จ is *sèt*.
 *
 * The inventory is closed: a pair that is not listed here is not a cluster,
 * and the two consonants belong to different syllables (ถนน is thà-nǒn, not
 * *thnon*). That closure is what makes the rule usable — the learner is
 * reading off a list of 20, not judging plausibility.
 *
 * Every pair is two consonants, because that is the only shape `clusterFor`
 * is ever asked for: the reader hands it two adjacent letters. A vowel-first
 * spelling like เสร็จ is the สร entry seen through its vowel, not a
 * twenty-first pair.
 */
export type ClusterKind = "true" | "false-sound" | "silent-second";

export interface ClusterPair {
	readonly pair: string;
	readonly kind: ClusterKind;
	/** How the pair is pronounced as a syllable initial. */
	readonly initialSound: string;
	readonly example: string;
	readonly exampleRomanization: string;
}

export const CLUSTER_INVENTORY: readonly ClusterPair[] = Object.freeze(
	(
		[
			["กร", "true", "gr", "กรอบ", "gràawp"],
			["ขร", "true", "khr", "ขรุขระ", "khrù-khrà"],
			["คร", "true", "khr", "ครอง", "khraawng"],
			["ตร", "true", "dtr", "ตรง", "dtrong"],
			["ปร", "true", "bpr", "ประตู", "bprà-dtuu"],
			["พร", "true", "phr", "พระ", "phrá"],
			["กล", "true", "gl", "กลาง", "glaang"],
			["ขล", "true", "khl", "ขลุ่ย", "khlùi"],
			["คล", "true", "khl", "คลอง", "khlaawng"],
			["ปล", "true", "bpl", "ปลอม", "bplaawm"],
			["ผล", "true", "phl", "ผลิต", "phlìt"],
			["พล", "true", "phl", "พลอย", "phlaawi"],
			["กว", "true", "gw", "กว้าง", "gwâang"],
			["ขว", "true", "khw", "ขวา", "khwǎa"],
			["คว", "true", "khw", "ความ", "khwaam"],
			["ทร", "false-sound", "s", "ทราบ", "sâap"],
			["ซร", "false-sound", "s", "ไซร้", "sái"],
			["จร", "silent-second", "j", "จริง", "jing"],
			["ศร", "silent-second", "s", "ศรี", "sǐi"],
			["สร", "silent-second", "s", "สร้าง", "sâang"],
		] as const
	).map(([pair, kind, initialSound, example, exampleRomanization]) =>
		Object.freeze({
			pair,
			kind: kind as ClusterKind,
			initialSound,
			example,
			exampleRomanization,
		}),
	),
);

const CLUSTER_BY_PAIR = new Map(
	CLUSTER_INVENTORY.map((entry) => [entry.pair, entry]),
);

/**
 * The only three letters that ever appear second in any pair this inventory
 * lists — true clusters and false ones alike, since every false pair ends in ร.
 */
export const CLUSTER_SECOND_LETTERS: readonly string[] = Object.freeze([
	"ร",
	"ล",
	"ว",
]);

/** `undefined` for any pair outside the inventory — it is not a cluster. */
export function clusterFor(pair: string): ClusterPair | undefined {
	return CLUSTER_BY_PAIR.get(pair);
}

// ============================================================================
// AC4 — leading consonants: one rule, three branches
// ============================================================================

/**
 * The repair this phase exists to make.
 *
 * The source course states the ห case in its lesson 15 and the อ case in its
 * lesson 11 and never connects them; the productive case it states once, about
 * two words, as an observation. They are one rule:
 *
 *   **A leading consonant begins the written word but not the spoken syllable.
 *   It hands its class to the consonant after it.**
 *
 * The three branches differ only in what happens to the leader's own sound —
 * dropped (ห), dropped (อ), or kept as an unstressed อะ syllable — and in
 * whether the branch is open or closed.
 */
export type LeadingBranchId = "silent-h" | "silent-o" | "unstressed-leader";

export interface LeadingBranch {
	readonly id: LeadingBranchId;
	/** Which consonants may lead under this branch. */
	readonly leaders: readonly string[];
	/** Is the leader itself pronounced? */
	readonly leaderPronounced: boolean;
	/**
	 * Closed branches are exhaustively listed and must be stated as closed —
	 * a learner who thinks the อ branch is productive writes *อยาง for อย่าง
	 * and mis-tones every ย word they meet.
	 */
	readonly closure: "closed" | "productive";
	/** Exhaustive for a closed branch; illustrative for a productive one. */
	readonly words: readonly string[];
	readonly statement: string;
	readonly extendsSpecialRule?: string;
}

/**
 * Which consonants can lead an unstressed-leader syllable — **derived** from
 * each letter's declared class, not listed.
 *
 * A list compiled by hand drops the letters that do not feel like leaders:
 * the first version of this field named seven mid-class consonants and no
 * high-class one, which contradicted the branch's own statement, four of its
 * own six example words, and `resolveLeadingConsonant` itself. ส leads
 * สวัสดี at rank 9 and was missing.
 *
 * ห and อ are held out because each has its own branch, and
 * `resolveLeadingConsonant` routes them there unconditionally — so declaring
 * either here would name a leader this branch never actually takes. That is
 * also why อ is absent despite อร่อย: these lessons teach the อ branch as
 * closed at four words (AC4), and a pronounced-อ reading is not in scope.
 */
const BRANCHED_LEADERS: readonly string[] = Object.freeze(["ห", "อ"]);

const UNSTRESSED_LEADERS: readonly string[] = Object.freeze(
	THAI_CONSONANT_BLOCK.filter(
		(character) =>
			!BRANCHED_LEADERS.includes(character) && canLead(classOf(character)),
	),
);

/** A class can be handed to a sonorant only if the sonorant lacks it. */
function canLead(consonantClass: ThaiSymbolClass | undefined): boolean {
	return (
		consonantClass === ThaiSymbolClass.Mid ||
		consonantClass === ThaiSymbolClass.High
	);
}

/**
 * อ leads in exactly four words. There is no fifth; the branch is closed and
 * the lesson says so.
 */
export const O_LEADING_WORDS: readonly string[] = Object.freeze([
	"อย่า",
	"อยู่",
	"อย่าง",
	"อยาก",
]);

export const LEADING_CONSONANT_RULE = Object.freeze({
	id: "leading-consonant",
	title: "อักษรนำ — the leading consonant",
	statement:
		"A mid- or high-class consonant written in front of a sonorant leads it: the sonorant is pronounced with the leader's class, not its own.",
	whyItExists:
		"The ten sonorants ง ญ ณ น ม ย ร ล ว ฬ are low class and have no high- or mid-class counterpart, so on their own they cannot be written with a rising tone or a low tone. A leader is how those tones are spelled.",
	branches: Object.freeze([
		Object.freeze({
			id: "silent-h" as const,
			leaders: Object.freeze(["ห"]),
			leaderPronounced: false,
			closure: "productive" as const,
			words: Object.freeze(["หมอ", "หลง", "หมด", "หนอง", "หรอก", "หลวง"]),
			statement:
				"ห before a sonorant is not pronounced. It is there to make the sonorant high class.",
			extendsSpecialRule: "hor-nam",
		}),
		Object.freeze({
			id: "silent-o" as const,
			leaders: Object.freeze(["อ"]),
			leaderPronounced: false,
			closure: "closed" as const,
			words: O_LEADING_WORDS,
			statement:
				"อ before ย is not pronounced, and makes ย mid class. This happens in four words and nowhere else.",
			extendsSpecialRule: "o-ang-dual-role",
		}),
		Object.freeze({
			id: "unstressed-leader" as const,
			leaders: UNSTRESSED_LEADERS,
			leaderPronounced: true,
			closure: "productive" as const,
			words: Object.freeze(["สวัสดี", "ถนน", "ขนม", "ตลก", "สงบ", "ตลอด"]),
			statement:
				"Any other mid- or high-class consonant in front of a sonorant is pronounced, as its own unstressed syllable with an unwritten อะ — and it still hands the sonorant its class.",
			extendsSpecialRule: "unwritten-vowels",
		}),
	]) as readonly LeadingBranch[],
});

export type LeadingResolution =
	| {
			readonly leads: true;
			readonly branch: LeadingBranchId;
			readonly leaderPronounced: boolean;
			/** The class the led consonant is pronounced with. */
			readonly effectiveClass: ThaiSymbolClass;
	  }
	| { readonly leads: false; readonly reason: string };

/**
 * The one function all three branches go through. `word` is only consulted for
 * the closed อ branch, where membership — not shape — is the rule.
 *
 * A test that calls this with (ห, ม) and with (อ, ย) and with (ส, ว) and gets
 * one code path is the assertion that the three are one mechanism.
 */
export function resolveLeadingConsonant(
	leader: string,
	led: string,
	word?: string,
): LeadingResolution {
	if (!isSonorant(led)) {
		return {
			leads: false,
			reason: `${led} is not a sonorant, so nothing can lead it`,
		};
	}
	const leaderClass = classOf(leader);
	if (leaderClass === undefined) {
		return { leads: false, reason: `${leader} is not a Thai consonant` };
	}
	if (!canLead(leaderClass)) {
		return {
			leads: false,
			reason: `${leader} is low class, and a low-class consonant has no class worth passing on`,
		};
	}
	if (leader === "อ") {
		if (word !== undefined && !O_LEADING_WORDS.includes(word)) {
			return {
				leads: false,
				reason: `อ leads in exactly ${O_LEADING_WORDS.length} words and ${word} is not one of them`,
			};
		}
		return {
			leads: true,
			branch: "silent-o",
			leaderPronounced: false,
			effectiveClass: ThaiSymbolClass.Mid,
		};
	}
	if (leader === "ห") {
		return {
			leads: true,
			branch: "silent-h",
			leaderPronounced: false,
			effectiveClass: ThaiSymbolClass.High,
		};
	}
	return {
		leads: true,
		branch: "unstressed-leader",
		leaderPronounced: true,
		effectiveClass: leaderClass,
	};
}

// ============================================================================
// AC1, AC2 — the unwritten vowels
// ============================================================================

export type ImplicitVowelId =
	| "implicit-o"
	| "implicit-a"
	| "bare-final-ro"
	| "ro-han";

export interface ImplicitVowelRule {
	readonly id: ImplicitVowelId;
	readonly vowel: string;
	readonly romanization: string;
	readonly length: "short" | "long";
	readonly statement: string;
	readonly examples: readonly string[];
	readonly extendsSpecialRule?: string;
}

export const IMPLICIT_VOWEL_RULES: readonly ImplicitVowelRule[] = Object.freeze(
	[
		Object.freeze({
			id: "implicit-o" as const,
			vowel: "โ-ะ",
			romanization: "o",
			length: "short" as const,
			statement:
				"A syllable written as two consonants with nothing between them has a short o between them: the first is the initial, the second is the final.",
			examples: Object.freeze(["คน", "ลง", "ตก", "ตรง"]),
			extendsSpecialRule: "unwritten-vowels",
		}),
		Object.freeze({
			id: "implicit-a" as const,
			vowel: "-ะ",
			romanization: "a",
			length: "short" as const,
			statement:
				"A consonant that cannot be read into the syllable beside it takes a short a of its own and becomes an unstressed syllable: ถนน is thà-nǒn, not *thnon*.",
			examples: Object.freeze(["ถนน", "ขนม", "ตลก", "สงบ"]),
			extendsSpecialRule: "unwritten-vowels",
		}),
		Object.freeze({
			id: "bare-final-ro" as const,
			vowel: "-อ",
			romanization: "aaw",
			length: "long" as const,
			statement:
				"A syllable that ends in a bare ร with no vowel written is read -aawn: กร is gaawn, not *gon*.",
			examples: Object.freeze(["กร", "พร", "นคร"]),
		}),
		Object.freeze({
			id: "ro-han" as const,
			vowel: "รร",
			romanization: "a",
			length: "short" as const,
			statement:
				"Double ร (ร หัน) is a vowel, short a. With a consonant after it, that consonant is the final: ธรรม is tham. With nothing after it, the final is n: วรรณ is wan.",
			examples: Object.freeze(["ธรรม", "กรรม", "พรรค", "วรรณ"]),
		}),
	],
);

// ============================================================================
// Tone — read out of `completeToneChart`, not restated
// ============================================================================

const TONE_BY_CLASS = new Map(
	completeToneChart.withoutToneMark.rules.map((rule) => [
		rule.class.toLowerCase(),
		rule,
	]),
);

export type SyllableType = "live" | "dead";

/** The no-tone-mark tone table. Bare-consonant words carry no tone mark. */
export function toneWithoutMark(
	consonantClass: ThaiSymbolClass,
	syllableType: SyllableType,
	vowelLength: "short" | "long",
): ToneValue | undefined {
	const row = TONE_BY_CLASS.get(consonantClass);
	if (!row) return undefined;
	if (syllableType === "live") return row.live as ToneValue;
	return (vowelLength === "short" ? row.deadShort : row.deadLong) as ToneValue;
}

function classOf(character: string): ThaiSymbolClass | undefined {
	return getConsonant(character)?.classType;
}

// ============================================================================
// AC7 — three states, and unresolvable never reads as unanalysed
// ============================================================================

export interface ResolvedSyllable {
	readonly text: string;
	/** The written initial — a cluster is two characters. */
	readonly initialConsonant: string;
	readonly cluster?: ClusterKind;
	/** The leader, if this syllable's class came from one. */
	readonly leader?: string;
	readonly leadingBranch?: LeadingBranchId;
	readonly vowel: string;
	readonly vowelRule: ImplicitVowelId | "o-as-vowel" | "w-as-vowel";
	readonly vowelLength: "short" | "long";
	readonly finalConsonant: string | null;
	readonly consonantClass: ThaiSymbolClass;
	readonly syllableType: SyllableType;
	readonly tone: ToneValue;
}

export type WordResolution =
	/** The rules produced a reading. */
	| {
			readonly state: "resolved";
			readonly word: string;
			readonly syllables: readonly ResolvedSyllable[];
			readonly rules: readonly string[];
	  }
	/** The rules were applied to this word and ran out. Says which. */
	| {
			readonly state: "unresolvable";
			readonly word: string;
			readonly ranOutAt: string;
			readonly reason: string;
	  }
	/** No rule was applied: the word is outside what these three rules cover. */
	| {
			readonly state: "unanalysed";
			readonly word: string;
			readonly reason: string;
	  };

/** The three states as values, so a consumer can prove it handles each. */
export const WORD_RESOLUTION_STATES = [
	"resolved",
	"unresolvable",
	"unanalysed",
] as const;

// ---------------------------------------------------------------------------
// The reader
// ---------------------------------------------------------------------------

interface Candidate {
	readonly length: number;
	readonly syllable: ResolvedSyllable;
	readonly isUnstressedLeader: boolean;
}

function buildSyllable(params: {
	readonly text: string;
	readonly initial: string;
	readonly cluster?: ClusterKind;
	readonly leader?: string;
	readonly leadingBranch?: LeadingBranchId;
	readonly vowel: string;
	readonly vowelRule: ResolvedSyllable["vowelRule"];
	readonly vowelLength: "short" | "long";
	readonly final: string | null;
	readonly consonantClass: ThaiSymbolClass;
}): ResolvedSyllable | undefined {
	const finalSound = params.final ? finalSoundOf(params.final) : undefined;
	if (params.final && !finalSound) return undefined;
	const syllableType: SyllableType = params.final
		? STOP_FINAL_SOUNDS.has(finalSound as string)
			? "dead"
			: "live"
		: params.vowelLength === "long"
			? "live"
			: "dead";
	const tone = toneWithoutMark(
		params.consonantClass,
		syllableType,
		params.vowelLength,
	);
	if (!tone) return undefined;
	return {
		text: params.text,
		initialConsonant: params.initial,
		...(params.cluster ? { cluster: params.cluster } : {}),
		...(params.leader ? { leader: params.leader } : {}),
		...(params.leadingBranch ? { leadingBranch: params.leadingBranch } : {}),
		vowel: params.vowel,
		vowelRule: params.vowelRule,
		vowelLength: params.vowelLength,
		finalConsonant: params.final,
		consonantClass: params.consonantClass,
		syllableType,
		tone,
	};
}

interface InitialReading {
	readonly initial: string;
	readonly cluster?: ClusterKind;
	readonly consonantClass: ThaiSymbolClass;
}

/**
 * The initial of a syllable starting at `start`, read as either one letter or
 * a cluster — `undefined` where that length cannot begin a syllable here.
 *
 * Split out from the vowel rules below because the two questions are
 * independent: whichever initial this returns, every vowel rule applies to it.
 */
function initialAt(
	characters: readonly string[],
	start: number,
	initialLength: 1 | 2,
	options: {
		readonly atWordStart: boolean;
		readonly effectiveClass?: ThaiSymbolClass;
	},
): InitialReading | undefined {
	if (characters.length - start < initialLength) return undefined;
	let initial: string;
	let cluster: ClusterKind | undefined;
	let classSource: string;
	if (initialLength === 2) {
		const pair = `${characters[start]}${characters[start + 1]}`;
		const found = clusterFor(pair);
		if (!found) return undefined;
		// ว between two consonants is the vowel, not a cluster's second half.
		// (ขวา is the cluster reading, and it writes its vowel — so it never
		// reaches here: `resolveWord` only ever passes bare words in.)
		if (characters[start + 1] === "ว") return undefined;
		initial = pair;
		cluster = found.kind;
		classSource = pair[0];
	} else {
		initial = characters[start];
		// อ and ว are consonants only at the start of the word (AC6); anywhere
		// after that they are the vowel, and `vowelLetterAt` reads them.
		if (!options.atWordStart && VOWEL_LETTER_BY_CHARACTER.has(initial))
			return undefined;
		classSource = initial;
	}
	const ownClass = classOf(classSource);
	if (ownClass === undefined) return undefined;
	return {
		initial,
		...(cluster ? { cluster } : {}),
		consonantClass: options.effectiveClass ?? ownClass,
	};
}

/**
 * Every syllable the rules allow to start at `start`, with no preference
 * applied. Preference is a separate, declared step (`PREFERENCE_ORDER`) so
 * that "two readings survive" stays visible instead of being silently decided.
 */
function candidatesAt(
	characters: readonly string[],
	start: number,
	options: {
		readonly atWordStart: boolean;
		readonly leader?: string;
		readonly leadingBranch?: LeadingBranchId;
		readonly effectiveClass?: ThaiSymbolClass;
	},
): Candidate[] {
	const out: Candidate[] = [];
	const at = (offset: number): string | undefined => characters[start + offset];
	const remaining = characters.length - start;
	const leaderPrefix = options.leader ? 1 : 0;

	for (const initialLength of [1, 2] as const) {
		const read = initialAt(characters, start, initialLength, options);
		if (!read) continue;
		const { initial, cluster, consonantClass } = read;
		const body = initialLength;
		const textOf = (length: number): string =>
			(options.leader ?? "") + characters.slice(start, start + length).join("");
		const push = (
			length: number,
			rest: Omit<
				Parameters<typeof buildSyllable>[0],
				| "text"
				| "initial"
				| "cluster"
				| "consonantClass"
				| "leader"
				| "leadingBranch"
			>,
			isUnstressedLeader = false,
		): void => {
			const syllable = buildSyllable({
				text: textOf(length),
				initial,
				...(cluster ? { cluster } : {}),
				...(options.leader ? { leader: options.leader } : {}),
				...(options.leadingBranch
					? { leadingBranch: options.leadingBranch }
					: {}),
				consonantClass,
				...rest,
			});
			if (syllable)
				out.push({
					length: length + leaderPrefix,
					syllable,
					isUnstressedLeader,
				});
		};

		// ร หัน — รร is a vowel, so it is checked before ร is read as anything else.
		if (at(body) === "ร" && at(body + 1) === "ร") {
			const after = at(body + 2);
			if (after !== undefined && isThaiConsonant(after)) {
				push(body + 3, {
					vowel: "รร",
					vowelRule: "ro-han",
					vowelLength: "short",
					final: after,
				});
			}
			if (body + 2 === remaining) {
				push(body + 2, {
					vowel: "รร",
					vowelRule: "ro-han",
					vowelLength: "short",
					final: "น",
				});
			}
			continue;
		}

		// A written vowel letter: อ anywhere but word-initial, ว mid-syllable.
		const vowelLetter = vowelLetterAt(characters, start + body);
		if (vowelLetter) {
			const after = at(body + 1);
			if (after !== undefined && isThaiConsonant(after)) {
				push(body + 2, {
					vowel: vowelLetter.vowel,
					vowelRule: vowelLetter.letter === "อ" ? "o-as-vowel" : "w-as-vowel",
					vowelLength: vowelLetter.length,
					final: after,
				});
			}
			push(body + 1, {
				vowel: vowelLetter.vowel,
				vowelRule: vowelLetter.letter === "อ" ? "o-as-vowel" : "w-as-vowel",
				vowelLength: vowelLetter.length,
				final: null,
			});
			continue;
		}

		// A bare ร closing the syllable reads -aawn.
		if (at(body) === "ร" && initialLength === 1) {
			push(body + 1, {
				vowel: "-อ",
				vowelRule: "bare-final-ro",
				vowelLength: "long",
				final: "ร",
			});
		}

		// The unwritten short o.
		const final = at(body);
		if (final !== undefined && isThaiConsonant(final)) {
			push(body + 1, {
				vowel: "โ-ะ",
				vowelRule: "implicit-o",
				vowelLength: "short",
				final,
			});
		}
	}
	return out;
}

/**
 * `index` is always inside a syllable body here — never the first letter of the
 * word — so อ at this position is the vowel, never the placeholder consonant.
 */
function vowelLetterAt(
	characters: readonly string[],
	index: number,
): VowelLetter | undefined {
	const character = characters[index];
	if (character === undefined) return undefined;
	return VOWEL_LETTER_BY_CHARACTER.get(character);
}

/**
 * The declared tiebreak, applied only when more than one reading survives.
 * Stated as data because "which reading wins" is a claim about the language,
 * not an implementation detail: fewest syllables, then fewest unstressed
 * leaders, then the bare-ร reading over the unwritten-o one.
 */
export const PREFERENCE_ORDER: readonly string[] = Object.freeze([
	"fewest syllables",
	"fewest unstressed leader syllables",
	"a bare final ร reads -aawn rather than as an unwritten-o final",
]);

function scoreOf(reading: readonly Candidate[]): [number, number, number] {
	return [
		reading.length,
		reading.filter((candidate) => candidate.isUnstressedLeader).length,
		reading.filter((candidate) => candidate.syllable.vowelRule === "implicit-o")
			.length,
	];
}

function compareReadings(
	a: readonly Candidate[],
	b: readonly Candidate[],
): number {
	const left = scoreOf(a);
	const right = scoreOf(b);
	return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

const MAX_READINGS = 64;

/**
 * Read a written Thai word with the three rules and nothing else.
 *
 * Words carrying a written vowel or a tone mark come back `unanalysed`: these
 * rules are about material that is *not* written, and saying "these rules do
 * not reach this word" is a different fact from "these rules were applied and
 * failed" (AC7).
 */
export function resolveWord(word: string): WordResolution {
	if (word.length === 0) {
		return { state: "unanalysed", word, reason: "empty string" };
	}
	if (O_LEADING_WORDS.includes(word)) {
		return {
			state: "unanalysed",
			word,
			reason:
				"one of the four อ-leading words: its vowel and tone mark are written, so the unwritten-vowel rules do not reach it",
		};
	}
	if (!isBareConsonantWord(word)) {
		return {
			state: "unanalysed",
			word,
			reason:
				"the word writes its vowels, so the unwritten-vowel rules have nothing to decide here",
		};
	}

	const characters = [...word];
	const readings: Candidate[][] = [];
	const stack: Candidate[] = [];

	const walk = (index: number): void => {
		if (readings.length >= MAX_READINGS) return;
		if (index === characters.length) {
			readings.push(stack.slice());
			return;
		}
		const atWordStart = index === 0;
		const leader = characters[index];
		const led = characters[index + 1];

		// A silent leader takes the next consonant with it, so it is tried as a
		// prefix on every syllable that could start at index + 1.
		if (
			leader !== undefined &&
			led !== undefined &&
			characters.length - index >= 3
		) {
			const leading = resolveLeadingConsonant(leader, led, word);
			if (leading.leads && !leading.leaderPronounced) {
				for (const candidate of candidatesAt(characters, index + 1, {
					atWordStart: false,
					leader,
					leadingBranch: leading.branch,
					effectiveClass: leading.effectiveClass,
				})) {
					stack.push(candidate);
					walk(index + candidate.length);
					stack.pop();
				}
			}
		}

		for (const candidate of candidatesAt(characters, index, { atWordStart })) {
			stack.push(candidate);
			walk(index + candidate.length);
			stack.pop();
		}

		// An unstressed leader syllable: one consonant on its own with an
		// unwritten อะ. It only exists if something follows it.
		if (leader !== undefined && characters.length - index >= 2) {
			if (atWordStart || leader !== "อ") {
				const leaderClass = classOf(leader);
				const nextClass =
					led !== undefined && isSonorant(led)
						? resolveLeadingConsonant(leader, led, word)
						: undefined;
				if (leaderClass !== undefined) {
					const syllable = buildSyllable({
						text: leader,
						initial: leader,
						vowel: "-ะ",
						vowelRule: "implicit-a",
						vowelLength: "short",
						final: null,
						consonantClass: leaderClass,
					});
					if (syllable) {
						stack.push({ length: 1, syllable, isUnstressedLeader: true });
						walkWithClass(
							index + 1,
							nextClass?.leads ? nextClass.effectiveClass : undefined,
							leader,
							nextClass?.leads ? nextClass.branch : undefined,
						);
						stack.pop();
					}
				}
			}
		}
	};

	const walkWithClass = (
		index: number,
		effectiveClass: ThaiSymbolClass | undefined,
		leader: string | undefined,
		branch: LeadingBranchId | undefined,
	): void => {
		if (effectiveClass === undefined) {
			walk(index);
			return;
		}
		if (readings.length >= MAX_READINGS) return;
		for (const candidate of candidatesAt(characters, index, {
			atWordStart: false,
			effectiveClass,
			leadingBranch: branch,
		})) {
			stack.push({
				...candidate,
				syllable: { ...candidate.syllable, leader, leadingBranch: branch },
			});
			walk(index + candidate.length);
			stack.pop();
		}
	};

	walk(0);

	if (readings.length === 0) {
		return {
			state: "unresolvable",
			word,
			ranOutAt: "syllable-shapes",
			reason:
				"no sequence of the declared syllable shapes accounts for every letter",
		};
	}
	const sorted = readings.slice().sort(compareReadings);
	if (sorted.length > 1 && compareReadings(sorted[0], sorted[1]) === 0) {
		return {
			state: "unresolvable",
			word,
			ranOutAt: "preference-order",
			reason: `two readings survive the declared preference order (${PREFERENCE_ORDER.join("; ")})`,
		};
	}
	const best = sorted[0];
	return {
		state: "resolved",
		word,
		syllables: best.map((candidate) => candidate.syllable),
		rules: Object.freeze([
			...new Set(
				best.flatMap((candidate) => [
					candidate.syllable.vowelRule,
					...(candidate.syllable.cluster
						? [`cluster:${candidate.syllable.cluster}`]
						: []),
					...(candidate.syllable.leadingBranch
						? [`leading:${candidate.syllable.leadingBranch}`]
						: []),
				]),
			),
		]),
	};
}

// ============================================================================
// AC1 — the reading classes of a bare-consonant word
// ============================================================================

/**
 * How a bare-consonant word gets its vowel. The point of the four-way split is
 * that the unwritten-o rule, which is the only one the source course teaches,
 * is the *rarest* of them: measured over the corpus's top 2,000, it accounts
 * for a handful of the three-consonant words and the other three account for
 * the rest.
 */
export const BARE_READING_CLASSES = [
	"o-as-vowel",
	"w-as-vowel",
	"initial-cluster",
	"implicit-o",
	"polysyllabic-implicit-a",
	"ro-han",
	"bare-final-ro",
] as const;

export type BareReadingClass = (typeof BARE_READING_CLASSES)[number];

/**
 * One class per word, decided in a stated order: a word that splits is
 * classified by its split, then by its cluster, then by its vowel source.
 */
export function bareReadingClassOf(
	resolution: WordResolution,
): BareReadingClass | undefined {
	if (resolution.state !== "resolved") return undefined;
	const { syllables } = resolution;
	if (syllables.some((syllable) => syllable.vowelRule === "implicit-a"))
		return "polysyllabic-implicit-a";
	const first = syllables[0];
	if (first.cluster) return "initial-cluster";
	if (first.vowelRule === "o-as-vowel") return "o-as-vowel";
	if (first.vowelRule === "w-as-vowel") return "w-as-vowel";
	if (first.vowelRule === "ro-han") return "ro-han";
	if (first.vowelRule === "bare-final-ro") return "bare-final-ro";
	return "implicit-o";
}

// ============================================================================
// AC5 — reconciliation against the corpus
// ============================================================================

export interface CorpusSyllable {
	readonly initialConsonant?: string | null;
	readonly vowel?: string | null;
	readonly finalConsonant?: string | null;
	readonly tone?: string | null;
}

export interface CorpusEntry {
	readonly thai: string;
	readonly rank?: number | null;
	readonly syllables?: readonly CorpusSyllable[] | null;
}

export interface Disagreement {
	readonly word: string;
	readonly rank: number | null;
	/** What the rules read. */
	readonly rules: string;
	/** What `vocabulary.json` stores. */
	readonly corpus: string;
	readonly kind: "syllable-count" | "syllable-shape" | "dropped-letter";
}

export interface ReconciliationReport {
	readonly considered: number;
	readonly resolved: number;
	readonly unresolvable: number;
	readonly unanalysed: number;
	/** Resolved words the corpus has no analysis for — nothing to compare. */
	readonly uncompared: number;
	readonly agreements: number;
	readonly disagreements: readonly Disagreement[];
}

function renderRules(resolution: WordResolution): string {
	if (resolution.state !== "resolved") return resolution.state;
	return resolution.syllables
		.map(
			(syllable) =>
				`${syllable.leader ? `${syllable.leader}·` : ""}${syllable.initialConsonant}|${syllable.vowel}|${syllable.finalConsonant ?? "-"}`,
		)
		.join(" + ");
}

function renderCorpus(syllables: readonly CorpusSyllable[]): string {
	return syllables
		.map(
			(syllable) =>
				`${syllable.initialConsonant ?? "-"}|${syllable.vowel ?? "-"}|${syllable.finalConsonant ?? "-"}`,
		)
		.join(" + ");
}

/**
 * Letters of the written word that the corpus's stored analysis mentions
 * nowhere — not as an initial, not as a vowel, not as a final.
 *
 * This is the axis on which the corpus is measurably wrong rather than merely
 * differently expressed: ของ is stored as ข…ง and its อ appears in no field at
 * all, so the analysis cannot be turned back into the word it analyses.
 */
function droppedLetters(
	word: string,
	stored: readonly CorpusSyllable[],
): string[] {
	const remaining = [...word];
	for (const syllable of stored) {
		for (const field of [
			syllable.initialConsonant,
			syllable.vowel,
			syllable.finalConsonant,
		]) {
			for (const character of field ?? "") {
				const index = remaining.indexOf(character);
				if (index >= 0) remaining.splice(index, 1);
			}
		}
	}
	return remaining;
}

/**
 * Run the rules over corpus entries and report where the two readings differ.
 *
 * Deliberately *not* asserted to be empty. These rules have real exceptions
 * and the corpus's stored analysis has real defects; a test demanding zero
 * would be satisfied only by bending one of them until it passed. The count is
 * pinned to a recorded baseline instead, so a regression shows up as the number
 * moving.
 */
export function reconcileWithCorpus(
	entries: readonly CorpusEntry[],
): ReconciliationReport {
	let resolved = 0;
	let unresolvable = 0;
	let unanalysed = 0;
	let uncompared = 0;
	let agreements = 0;
	const disagreements: Disagreement[] = [];

	for (const entry of entries) {
		const resolution = resolveWord(entry.thai);
		if (resolution.state === "unanalysed") {
			unanalysed += 1;
			continue;
		}
		if (resolution.state === "unresolvable") {
			unresolvable += 1;
			continue;
		}
		resolved += 1;
		const stored = entry.syllables;
		if (!stored || stored.length === 0) {
			uncompared += 1;
			continue;
		}
		const rank = typeof entry.rank === "number" ? entry.rank : null;
		if (stored.length !== resolution.syllables.length) {
			disagreements.push({
				word: entry.thai,
				rank,
				rules: renderRules(resolution),
				corpus: renderCorpus(stored),
				kind: "syllable-count",
			});
			continue;
		}
		const sameShape = resolution.syllables.every((syllable, index) => {
			const other = stored[index];
			return (
				syllable.initialConsonant === other.initialConsonant &&
				(syllable.finalConsonant ?? null) === (other.finalConsonant ?? null)
			);
		});
		if (!sameShape) {
			disagreements.push({
				word: entry.thai,
				rank,
				rules: renderRules(resolution),
				corpus: renderCorpus(stored),
				kind: "syllable-shape",
			});
			continue;
		}
		if (droppedLetters(entry.thai, stored).length > 0) {
			disagreements.push({
				word: entry.thai,
				rank,
				rules: renderRules(resolution),
				corpus: renderCorpus(stored),
				kind: "dropped-letter",
			});
			continue;
		}
		agreements += 1;
	}

	return {
		considered: entries.length,
		resolved,
		unresolvable,
		unanalysed,
		uncompared,
		agreements,
		disagreements,
	};
}

/**
 * Words the rules read one way and the corpus another, where the *rules* are
 * right. Every one is the same phenomenon — a consonant doing double duty as
 * the final of one syllable and the initial of the next (สะกดตัวตาม) — which
 * these three lessons do not teach, so the reading they produce is the best
 * their own stated rules allow.
 */
export const KNOWN_SOUND_DOUBLING_WORDS: readonly string[] = Object.freeze([
	"ธรรม",
	"ชนบท",
	"มรดก",
	"อพยพ",
]);
