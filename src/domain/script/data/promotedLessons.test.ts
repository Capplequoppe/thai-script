import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import vocabularyData from "../../vocabulary/data/vocabulary.json";
import type { VocabEntry } from "../../vocabulary/types";
import {
	DECK_LESSON_IDS,
	deckPathForLesson,
	resolveLessonContent,
	validateDeck,
} from "./lessonContent";
import {
	lessonEntryById,
	lessonSequence,
	PHASE_THREE_LESSON_IDS,
	reconcileLessonSlots,
} from "./lessonSequence";
import { checkOriginality } from "./originality";
import { CLUSTER_INVENTORY, O_LEADING_WORDS, SONORANTS } from "./syllableRules";
import {
	completeToneChart,
	getConsonant,
	ThaiSymbolClass,
	type ToneValue,
	vowels,
} from "./symbols";

/**
 * Task 3.2's proof: the three concepts that actually stop a beginner reading,
 * promoted from asides to lessons.
 *
 * The load-bearing decision is AC4's. Every rule these lessons teach is also
 * encoded in `syllableRules.ts`, and resolving a word against *that* would
 * pass in precisely the case this task exists to catch: a lesson that states a
 * rule incompletely and leaves the learner deriving from material that does
 * not reach. So the resolver below is parameterised by facts pulled out of the
 * committed decks — the inventory comes off the cluster slides, each unwritten
 * vowel is recovered from the worked examples the lesson prints, and the class
 * transfer comes off the one slide that states it. `syllableRules.ts` is
 * imported only to cross-check that the lessons and the rule module agree
 * about the same twenty pairs, ten sonorants and four อ words; it is never
 * consulted to read a word.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PUBLIC_LESSONS = join(REPO_ROOT, "public", "lessons");

const UNWRITTEN = "lesson-unwritten-vowels";
const CLUSTERS = "lesson-clusters";
const LEADING = "lesson-leading-consonants";

/** Declaration order is the order the learner meets them. */
const PROMOTED = [
	{ id: UNWRITTEN, legacyNumber: 26 },
	{ id: CLUSTERS, legacyNumber: 27 },
	{ id: LEADING, legacyNumber: 28 },
] as const;

type RawSlide = {
	kind: string;
	id: string;
	heading?: string;
	body?: string[];
	prompt?: string;
	answers?: string[];
	revealSlideId?: string;
	retrievalSlideId?: string;
	ruleId?: string;
	audio?: string[];
	image?: string;
};
type RawDeck = { lessonId: string; title: string; slides: RawSlide[] };
type Manifest = { lessonId: string; assets: { path: string | null }[] };

const THAI_RUN = /[฀-๿]+/g;
const THAI_LETTER = /[ก-ฮ]/g;

function readDeck(id: string): RawDeck {
	return JSON.parse(
		readFileSync(join(PUBLIC_LESSONS, id, "deck.json"), "utf-8"),
	) as RawDeck;
}

const decks = new Map(PROMOTED.map(({ id }) => [id, readDeck(id)]));

function deckFor(id: string): RawDeck {
	const deck = decks.get(id);
	if (!deck) throw new Error(`${id}: no committed deck`);
	return deck;
}

/**
 * A slide by id, or a thrown error naming it.
 *
 * Not `undefined`: every derivation below reads its facts off a named slide,
 * and a renamed slide would otherwise arrive at the resolver as a rule with no
 * examples — diagnosed twelve steps later as "the lesson cannot read คน".
 */
function slide(deckId: string, slideId: string): RawSlide {
	const found = deckFor(deckId).slides.find((s) => s.id === slideId);
	if (!found) throw new Error(`${deckId}: no slide "${slideId}"`);
	return found;
}

function bodyOf(deckId: string, slideId: string): string[] {
	return slide(deckId, slideId).body ?? [];
}

/** Heading and body together — the learner-facing text of one slide. */
function textOf(deckId: string, slideId: string): string {
	const found = slide(deckId, slideId);
	return [found.heading ?? "", ...(found.body ?? [])].join(" ");
}

/** Every piece of learner-facing prose on a deck, in slide order. */
function textsOf(deck: RawDeck): string[] {
	const texts: string[] = [deck.title];
	for (const s of deck.slides) {
		if (s.heading) texts.push(s.heading);
		if (s.prompt) texts.push(s.prompt);
		texts.push(...(s.body ?? []));
		texts.push(...(s.answers ?? []));
	}
	return texts;
}

// ============================================================================
// The alphabet the lessons are allowed to assume
// ============================================================================

/**
 * What a consonant sounds like at the front of a syllable, as a romanization
 * token. `initialSound` is prose ("dt (between D and T, unaspirated T)"), and
 * its first word is the token every romanization in `vocabulary.json` uses.
 *
 * Prior material: which letter makes which sound is the alphabet, taught
 * across the opening band, and none of the three lessons under test restates
 * it.
 */
function onsetOf(character: string): string {
	const consonant = getConsonant(character);
	if (!consonant) throw new Error(`${character} is not a Thai consonant`);
	return (consonant.initialSound.split(/[\s(]/)[0] ?? "").toLowerCase();
}

interface FinalReading {
	readonly sound: string;
	/** A stop final closes the syllable dead; everything else leaves it live. */
	readonly stops: boolean;
}

function finalOf(character: string): FinalReading | undefined {
	const consonant = getConsonant(character);
	if (!consonant) return undefined;
	const raw = consonant.finalSound;
	if (/not used as final/i.test(raw)) return undefined;
	const stop = /^([KTP])-stop/.exec(raw);
	if (stop) return { sound: stop[1].toLowerCase(), stops: true };
	return { sound: (raw.split(/[\s(]/)[0] ?? "").toLowerCase(), stops: false };
}

function classOf(character: string): ThaiSymbolClass | undefined {
	return getConsonant(character)?.classType;
}

function isConsonant(character: string): boolean {
	return getConsonant(character) !== undefined;
}

const TONE_BY_CLASS = new Map(
	completeToneChart.withoutToneMark.rules.map((rule) => [
		rule.class.toLowerCase(),
		rule,
	]),
);

/** The no-tone-mark tone table, read off `symbols.ts`. Opening-band material. */
function toneFor(
	consonantClass: ThaiSymbolClass,
	syllableType: "live" | "dead",
	length: "short" | "long",
): ToneValue {
	const row = TONE_BY_CLASS.get(consonantClass);
	if (!row) throw new Error(`no tone row for ${consonantClass}`);
	if (syllableType === "live") return row.live as ToneValue;
	return (length === "short" ? row.deadShort : row.deadLong) as ToneValue;
}

/**
 * The written vowels the sample words spell out loud, as romanization and
 * length. Prior material again — every one has a symbol on the page and a
 * lesson of its own; the three lessons here are about the vowels that do not.
 * `theWrittenVowelTableAgreesWithTheAlphabet` holds it to `symbols.ts`.
 */
const WRITTEN_VOWELS: Readonly<
	Record<string, { romanization: string; length: "short" | "long" }>
> = {
	ะ: { romanization: "a", length: "short" }, // ะ
	"ั": { romanization: "a", length: "short" }, // ◌ั
	า: { romanization: "aa", length: "long" }, // า
	"ิ": { romanization: "i", length: "short" }, // ◌ิ
	"ี": { romanization: "ii", length: "long" }, // ◌ี
	"ุ": { romanization: "u", length: "short" }, // ◌ุ
	"ู": { romanization: "uu", length: "long" }, // ◌ู
};

/** Vowels written in front of the consonant they belong to. */
const PREPOSED_VOWELS: Readonly<
	Record<string, { romanization: string; length: "short" | "long" }>
> = {
	ใ: { romanization: "ai", length: "long" }, // ใ
	ไ: { romanization: "ai", length: "long" }, // ไ
};

// ============================================================================
// Romanization, as the corpus writes it
// ============================================================================

const TONE_OF_DIACRITIC: Readonly<Record<string, ToneValue>> = {
	"̀": "low",
	"́": "high",
	"̂": "falling",
	"̌": "rising",
};

interface RomanSyllable {
	readonly plain: string;
	readonly tone: ToneValue;
}

/** Split a corpus romanization into syllables, each with its tone. */
function romanSyllables(romanization: string): RomanSyllable[] {
	return romanization
		.split(/[-\s]+/)
		.filter((part) => part.length > 0)
		.map((part) => {
			const decomposed = part.normalize("NFD");
			let tone: ToneValue = "mid";
			for (const mark of Object.keys(TONE_OF_DIACRITIC)) {
				if (decomposed.includes(mark)) tone = TONE_OF_DIACRITIC[mark];
			}
			return {
				plain: decomposed.replace(/[̀-ͯ]/g, ""),
				tone,
			};
		});
}

// ============================================================================
// The rules, read off the lessons
// ============================================================================

/** `word (romanization)` pairs printed in a slide's prose. */
function examplePairs(deckId: string, slideId: string): [string, string][] {
	const pairs: [string, string][] = [];
	for (const line of bodyOf(deckId, slideId)) {
		for (const match of line.matchAll(/([ก-๎]+)\s*\(([^)]+)\)/g)) {
			pairs.push([match[1], match[2]]);
		}
	}
	return pairs;
}

/** The vowel length a slide states in its own words. */
function statedLength(deckId: string, slideId: string): "short" | "long" {
	const match = /\b(short|long)\b/.exec(textOf(deckId, slideId));
	if (!match) {
		throw new Error(
			`${deckId}/${slideId}: states no vowel length, so a reader cannot tell live from dead`,
		);
	}
	return match[1] as "short" | "long";
}

interface UnwrittenVowel {
	readonly id: string;
	readonly romanization: string;
	readonly length: "short" | "long";
	/** How many examples the derivation agreed across. */
	readonly evidence: number;
}

/**
 * Recover an unwritten vowel from the worked examples the lesson prints.
 *
 * The lesson never writes "the vowel is o" in a form a machine could read —
 * it prints คน (khon) and five more like it. `shape` says which characters of
 * the example are the onset and which is the final; whatever romanization is
 * left over in the middle is the vowel the lesson is teaching. Every example
 * on the slide has to leave the same residue or the derivation refuses.
 */
function deriveUnwrittenVowel(
	slideId: string,
	shape: (
		word: string[],
	) => { onset: string; final: string | null } | undefined,
): UnwrittenVowel {
	const residues = new Set<string>();
	let evidence = 0;
	for (const [word, romanization] of examplePairs(UNWRITTEN, slideId)) {
		const characters = [...word];
		const parts = shape(characters);
		if (!parts) continue;
		const syllables = romanSyllables(romanization);
		const target = syllables[0];
		if (!target) continue;
		if (!target.plain.startsWith(parts.onset)) continue;
		let middle = target.plain.slice(parts.onset.length);
		if (parts.final !== null) {
			if (!middle.endsWith(parts.final)) continue;
			middle = middle.slice(0, middle.length - parts.final.length);
		}
		if (middle.length === 0) continue;
		residues.add(middle);
		evidence += 1;
	}
	if (residues.size !== 1) {
		throw new Error(
			`${UNWRITTEN}/${slideId}: ${evidence} usable example(s) left ${residues.size} different vowels (${[...residues].join(", ")}); the lesson does not state this reading`,
		);
	}
	return {
		id: slideId,
		romanization: [...residues][0],
		length: statedLength(UNWRITTEN, slideId),
		evidence,
	};
}

/** The six readings the unwritten-vowels lesson teaches, derived from it. */
function unwrittenVowelsFromLesson() {
	const implicitO = deriveUnwrittenVowel("implicit-o", (word) =>
		word.length === 2 && word.every(isConsonant)
			? { onset: onsetOf(word[0]), final: finalOf(word[1])?.sound ?? null }
			: undefined,
	);
	const implicitA = deriveUnwrittenVowel("implicit-a", (word) =>
		isConsonant(word[0]) ? { onset: onsetOf(word[0]), final: null } : undefined,
	);
	const bareFinalRo = deriveUnwrittenVowel("bare-final-ro", (word) =>
		word.length === 2 && word[1] === "ร" && isConsonant(word[0])
			? { onset: onsetOf(word[0]), final: finalOf("ร")?.sound ?? null }
			: undefined,
	);
	const roHan = deriveUnwrittenVowel("ro-han", (word) =>
		word.length === 4 && word[1] === "ร" && word[2] === "ร"
			? { onset: onsetOf(word[0]), final: finalOf(word[3])?.sound ?? null }
			: undefined,
	);
	const oAsVowel = deriveUnwrittenVowel("o-as-vowel", (word) =>
		word.length === 3 && word[1] === "อ" && isConsonant(word[0])
			? { onset: onsetOf(word[0]), final: finalOf(word[2])?.sound ?? null }
			: undefined,
	);
	const wAsVowel = deriveUnwrittenVowel("w-as-vowel", (word) =>
		word.length === 3 && word[1] === "ว" && isConsonant(word[0])
			? { onset: onsetOf(word[0]), final: finalOf(word[2])?.sound ?? null }
			: undefined,
	);
	// อ is the one letter that is a consonant in one position and a vowel in
	// every other, and the lesson has to say which: without the restriction
	// ตลอด reads as อ-initial nonsense that scores better than dtà-làawt.
	const oIsConsonantOnlyAtWordStart =
		/อ is a consonant only at the front of a word/.test(
			textOf(UNWRITTEN, "o-as-vowel"),
		);
	return {
		implicitO,
		implicitA,
		bareFinalRo,
		roHan,
		oAsVowel,
		wAsVowel,
		oIsConsonantOnlyAtWordStart,
	};
}

type ClusterKind = "true" | "false-sound" | "silent-second" | "lexical";

interface LessonCluster {
	readonly pair: string;
	readonly kind: ClusterKind;
	readonly onset: string;
}

const CLUSTER_SLIDES: Readonly<Record<string, ClusterKind>> = {
	"true-clusters": "true",
	"false-sound-clusters": "false-sound",
	"silent-second-clusters": "silent-second",
	"lexical-pairs": "lexical",
};

/** How a true cluster's second letter sounds when both letters are spoken. */
const SECOND_LETTER_SOUND: Readonly<Record<string, string>> = {
	ร: "r",
	ล: "l",
	ว: "w",
};

/**
 * The inventory, read off the four slides that list it.
 *
 * Every two-character Thai run on one of those slides is a pair and every
 * longer run is an example word, which is the distinction the lesson's own
 * prose makes. A false-sound pair additionally states its sound ("ทร is read
 * as s"), and that is parsed rather than assumed, because assuming it would
 * let the lesson stop saying it.
 */
function clustersFromLesson(): Map<string, LessonCluster> {
	const inventory = new Map<string, LessonCluster>();
	for (const [slideId, kind] of Object.entries(CLUSTER_SLIDES)) {
		const lines = bodyOf(CLUSTERS, slideId);
		const statedSounds = new Map<string, string>();
		for (const line of lines) {
			for (const match of line.matchAll(/([ก-ฮ]{2}) is read as ([a-z]+)\b/g)) {
				statedSounds.set(match[0].slice(0, 2), match[2]);
			}
		}
		for (const line of lines) {
			for (const run of line.match(THAI_RUN) ?? []) {
				if ([...run].length !== 2) continue;
				const [first, second] = [...run];
				if (!isConsonant(first) || !isConsonant(second)) continue;
				const onset =
					kind === "true"
						? onsetOf(first) + (SECOND_LETTER_SOUND[second] ?? "?")
						: kind === "false-sound"
							? (statedSounds.get(run) ?? "?")
							: onsetOf(first);
				inventory.set(run, { pair: run, kind, onset });
			}
		}
	}
	return inventory;
}

type LeadingBranchId = "silent-h" | "silent-o" | "spoken-leader";

interface LessonBranch {
	readonly id: LeadingBranchId;
	readonly slideId: string;
	readonly leaders: readonly string[] | "any-mid-or-high";
	readonly leaderSpoken: boolean;
	readonly closed: boolean;
	readonly words: readonly string[];
}

/** The single sentence that states the class transfer, and nothing else. */
const CLASS_TRANSFER =
	/\bhands? (?:its|their) class\b|\bpasses (?:its|their) class\b|\bgives (?:its|their) class\b|\bthe leader's class\b/i;
const SILENT_LEADER =
	/\bsilent\b|\bnever spoken\b|\bnot spoken\b|\bnot hear it\b/i;
const CLOSED_BRANCH = /\bcomplete list\b|\bno fifth\b|\bno more\b/i;

const BRANCH_SLIDES: Readonly<Record<LeadingBranchId, string>> = {
	"silent-h": "branch-silent-h",
	"silent-o": "branch-silent-o",
	"spoken-leader": "branch-spoken-leader",
};

function leadingRuleFromLesson() {
	const statement = bodyOf(LEADING, "one-rule").find((line) =>
		CLASS_TRANSFER.test(line),
	);
	if (!statement) {
		throw new Error(
			`${LEADING}/one-rule: no line states that the leader hands its class on, so the lesson has no rule`,
		);
	}
	// Not `?? []`: an absent list would make every call to `applyLeadingRule`
	// answer "that is not a sonorant", which reads as a confident no rather
	// than as the lesson having stopped saying which letters the rule ranges
	// over. The statement above refuses the same way and this has to match it.
	const sonorantLine = bodyOf(LEADING, "why-it-exists").find((line) =>
		/\bare the sonorants\b/i.test(line),
	);
	if (!sonorantLine) {
		throw new Error(
			`${LEADING}/why-it-exists: no line names the sonorants, so the rule ranges over nothing`,
		);
	}
	const sonorants = [...(sonorantLine.match(THAI_LETTER) ?? [])];

	const branches = (Object.keys(BRANCH_SLIDES) as LeadingBranchId[]).map(
		(id): LessonBranch => {
			const slideId = BRANCH_SLIDES[id];
			const text = textOf(LEADING, slideId);
			const headingLetters = [
				...((slide(LEADING, slideId).heading ?? "").match(THAI_LETTER) ?? []),
			];
			const closed = CLOSED_BRANCH.test(text);
			const listing = bodyOf(LEADING, slideId).find((line) =>
				CLOSED_BRANCH.test(line),
			);
			return {
				id,
				slideId,
				leaders: headingLetters.length > 0 ? headingLetters : "any-mid-or-high",
				leaderSpoken: !SILENT_LEADER.test(text),
				closed,
				words: closed ? (listing?.match(THAI_RUN) ?? []) : [],
			};
		},
	);
	return { statement, sonorants, branches };
}

type LeadingOutcome =
	| {
			readonly leads: true;
			readonly branch: LeadingBranchId;
			readonly leaderSpoken: boolean;
			readonly effectiveClass: ThaiSymbolClass;
	  }
	| { readonly leads: false; readonly reason: string };

/**
 * The one code path all three branches go through.
 *
 * `effectiveClass` is `classOf(leader)` in every branch and is not looked up
 * per branch: that identity is exactly what the lesson's single sentence
 * claims, so a test that calls this with ห, with อ and with ส and gets three
 * right answers out of one statement is the claim, checked.
 */
function applyLeadingRule(
	rule: ReturnType<typeof leadingRuleFromLesson>,
	leader: string,
	led: string,
	word?: string,
): LeadingOutcome {
	if (!rule.sonorants.includes(led)) {
		return { leads: false, reason: `${led} is not one of the sonorants` };
	}
	const leaderClass = classOf(leader);
	if (leaderClass === undefined) {
		return { leads: false, reason: `${leader} is not a Thai consonant` };
	}
	if (
		leaderClass !== ThaiSymbolClass.Mid &&
		leaderClass !== ThaiSymbolClass.High
	) {
		return { leads: false, reason: `${leader} is low class and leads nothing` };
	}
	const named = rule.branches.find(
		(branch) =>
			branch.leaders !== "any-mid-or-high" && branch.leaders.includes(leader),
	);
	const branch =
		named ?? rule.branches.find((b) => b.leaders === "any-mid-or-high");
	if (!branch) return { leads: false, reason: "the lesson declares no branch" };
	if (branch.closed && word !== undefined && !branch.words.includes(word)) {
		return {
			leads: false,
			reason: `${branch.slideId} is closed at ${branch.words.length} words and ${word} is not one`,
		};
	}
	return {
		leads: true,
		branch: branch.id,
		leaderSpoken: branch.leaderSpoken,
		effectiveClass: leaderClass,
	};
}

// ============================================================================
// Reading a word with nothing but what the three lessons state
// ============================================================================

interface LessonRules {
	readonly unwritten: ReturnType<typeof unwrittenVowelsFromLesson>;
	readonly clusters: Map<string, LessonCluster>;
	readonly leading: ReturnType<typeof leadingRuleFromLesson>;
}

function rulesFromLessons(): LessonRules {
	return {
		unwritten: unwrittenVowelsFromLesson(),
		clusters: clustersFromLesson(),
		leading: leadingRuleFromLesson(),
	};
}

interface Syllable {
	readonly onset: string;
	readonly initial: string;
	readonly vowel: string;
	readonly length: "short" | "long";
	readonly final: string | null;
	readonly light: boolean;
	readonly implicitO: boolean;
	readonly leader: string | null;
	tone?: ToneValue;
	consonantClass?: ThaiSymbolClass;
}

type Reading = readonly Syllable[];

const MAX_READINGS = 256;

/**
 * Every way the rules allow a syllable to start at `index`.
 *
 * `leader` is a silent leading consonant the caller has already put through
 * the rule. It is passed in rather than peeled off outside because a preposed
 * vowel is written before it — ไหล is ไ, then the silent ห, then ล — so the
 * leader is not always the first character of its own syllable and a caller
 * that assumed it was read ไหล as *hlai*.
 */
function syllablesAt(
	rules: LessonRules,
	characters: readonly string[],
	index: number,
	leader?: string,
): { syllable: Syllable; length: number }[] {
	const out: { syllable: Syllable; length: number }[] = [];
	const here = characters[index];
	if (here === undefined) return out;

	const preposed = PREPOSED_VOWELS[here];
	const onsetStart = index + (preposed ? 1 : 0) + (leader ? 1 : 0);
	const first = characters[onsetStart];
	if (first === undefined || !isConsonant(first)) return out;
	if (
		first === "อ" &&
		onsetStart > 0 &&
		rules.unwritten.oIsConsonantOnlyAtWordStart
	) {
		return out;
	}

	const onsets: { onset: string; initial: string; width: number }[] = [
		{ onset: onsetOf(first), initial: first, width: 1 },
	];
	const second = characters[onsetStart + 1];
	if (second !== undefined) {
		const pair = rules.clusters.get(first + second);
		// A lexical pair is in the inventory and the lesson says the spelling
		// does not decide it, so no rule-driven reading may claim it.
		if (pair && pair.kind !== "lexical") {
			onsets.push({ onset: pair.onset, initial: first, width: 2 });
		}
	}

	for (const { onset, initial, width } of onsets) {
		const j = onsetStart + width;
		const rest = characters.length - onsetStart;
		const emit = (
			vowel: string,
			length: "short" | "long",
			final: string | null,
			consumed: number,
			flags: { light?: boolean; implicitO?: boolean } = {},
		) => {
			if (final !== null && !finalOf(final)) return;
			out.push({
				syllable: {
					onset,
					initial,
					vowel,
					length,
					final,
					light: flags.light ?? false,
					implicitO: flags.implicitO ?? false,
					leader: leader ?? null,
				},
				length: j - index + consumed,
			});
		};

		if (preposed) {
			// A preposed vowel is spelled before its consonant; the rime is the
			// vowel itself plus an optional final.
			emit(preposed.romanization, preposed.length, null, 0);
			const after = characters[j];
			if (after !== undefined && isConsonant(after)) {
				emit(preposed.romanization, preposed.length, after, 1);
			}
			continue;
		}

		const at = characters[j];
		const written = at === undefined ? undefined : WRITTEN_VOWELS[at];
		if (written) {
			emit(written.romanization, written.length, null, 1);
			const after = characters[j + 1];
			if (after !== undefined && isConsonant(after)) {
				emit(written.romanization, written.length, after, 2);
			}
		}

		// อ after the first letter of the word is the long vowel -aaw.
		if (at === "อ" && j > 0) {
			const { romanization, length } = rules.unwritten.oAsVowel;
			emit(romanization, length, null, 1);
			const after = characters[j + 1];
			if (after !== undefined && isConsonant(after)) {
				emit(romanization, length, after, 2);
			}
		}

		// ว with a consonant on each side and no other vowel is the vowel ua.
		if (at === "ว" && isConsonant(characters[j + 1] ?? "")) {
			const { romanization, length } = rules.unwritten.wAsVowel;
			emit(romanization, length, characters[j + 1], 2);
		}

		// รร is a vowel: the consonant after it is the final, and with nothing
		// after it the pair supplies its own n.
		if (at === "ร" && characters[j + 1] === "ร") {
			const { romanization, length } = rules.unwritten.roHan;
			const after = characters[j + 2];
			if (after !== undefined && isConsonant(after)) {
				emit(romanization, length, after, 3);
			} else if (after === undefined) {
				emit(romanization, length, "น", 2);
			}
		}

		// A word ending on a bare ร ends -aawn.
		if (at === "ร" && j === characters.length - 1) {
			const { romanization, length } = rules.unwritten.bareFinalRo;
			emit(romanization, length, at, 1);
		}

		// Two consonants with nothing between them hold a short o.
		if (at !== undefined && isConsonant(at)) {
			const { romanization, length } = rules.unwritten.implicitO;
			emit(romanization, length, at, 1, { implicitO: true });
		}

		// A lone consonant that will not fit takes a short a of its own. It is
		// never the last syllable: a trailing consonant can always be read as a
		// final, so nothing is left over for it to rescue.
		if (width === 1 && rest > 1) {
			const { romanization, length } = rules.unwritten.implicitA;
			emit(romanization, length, null, 0, { light: true });
		}
	}
	return out;
}

/** Every complete reading of the word, in no particular order. */
function readingsOf(rules: LessonRules, word: string): Reading[] {
	const characters = [...word];
	const readings: Syllable[][] = [];
	const stack: Syllable[] = [];

	const walk = (index: number): void => {
		if (readings.length >= MAX_READINGS) return;
		if (index === characters.length) {
			readings.push(stack.slice());
			return;
		}
		// A silent leader is written after the preposed vowel, if there is one,
		// and before the consonant it leads.
		const leaderAt = index + (PREPOSED_VOWELS[characters[index] ?? ""] ? 1 : 0);
		const leader = characters[leaderAt];
		const led = characters[leaderAt + 1];
		if (leader !== undefined && led !== undefined) {
			const leading = applyLeadingRule(rules.leading, leader, led, word);
			if (leading.leads && !leading.leaderSpoken) {
				for (const option of syllablesAt(rules, characters, index, leader)) {
					stack.push(option.syllable);
					walk(index + option.length);
					stack.pop();
				}
			}
		}
		for (const option of syllablesAt(rules, characters, index)) {
			stack.push(option.syllable);
			walk(index + option.length);
			stack.pop();
		}
	};
	walk(0);
	return readings;
}

/**
 * Which of two readings the lesson prefers, in the order `which-reading-wins`
 * states it — fewest syllables, then fewest light syllables, then the bare ร
 * ending over the unwritten o. "states which reading wins when two of them
 * fit" holds the slide to that order.
 */
function scoreOf(reading: Reading): [number, number, number] {
	return [
		reading.length,
		reading.filter((syllable) => syllable.light).length,
		reading.filter((syllable) => syllable.implicitO).length,
	];
}

function compareReadings(a: Reading, b: Reading): number {
	const [x, y] = [scoreOf(a), scoreOf(b)];
	return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

/** Fill in each syllable's class and tone, applying the class transfer. */
function tone(rules: LessonRules, reading: Reading): Syllable[] {
	const out = reading.map((syllable) => ({ ...syllable }));
	out.forEach((syllable, index) => {
		const previous = out[index - 1];
		let consonantClass = classOf(syllable.initial);
		if (syllable.leader !== null) {
			const led = applyLeadingRule(
				rules.leading,
				syllable.leader,
				syllable.initial,
			);
			if (led.leads) consonantClass = led.effectiveClass;
		} else if (previous?.light) {
			const led = applyLeadingRule(
				rules.leading,
				previous.initial,
				syllable.initial,
			);
			if (led.leads && led.leaderSpoken) consonantClass = led.effectiveClass;
		}
		if (consonantClass === undefined) return;
		const finalReading = syllable.final ? finalOf(syllable.final) : undefined;
		const syllableType: "live" | "dead" = syllable.final
			? finalReading?.stops
				? "dead"
				: "live"
			: syllable.length === "long"
				? "live"
				: "dead";
		syllable.consonantClass = consonantClass;
		syllable.tone = toneFor(consonantClass, syllableType, syllable.length);
	});
	return out;
}

type LessonReading =
	| { readonly state: "read"; readonly syllables: readonly Syllable[] }
	| { readonly state: "unreadable"; readonly reason: string };

/** Read a written Thai word using only what the three lessons state. */
function readWord(rules: LessonRules, word: string): LessonReading {
	const readings = readingsOf(rules, word);
	if (readings.length === 0) {
		return {
			state: "unreadable",
			reason: "the lessons state no reading that consumes the whole word",
		};
	}
	const best = readings.reduce((a, b) => (compareReadings(a, b) <= 0 ? a : b));
	const resolved = tone(rules, best);
	if (resolved.some((syllable) => syllable.tone === undefined)) {
		return { state: "unreadable", reason: "a syllable has no class" };
	}
	return { state: "read", syllables: resolved };
}

// ============================================================================
// The corpus sample AC4 is measured on
// ============================================================================

const vocabulary = vocabularyData as unknown as VocabEntry[];
const vocabularyByThai = new Map(
	vocabulary.map((entry) => [entry.thai, entry]),
);

/**
 * Corpus words whose reading turns on exactly these three rules — an unwritten
 * vowel, a cluster decision, a leading consonant, or a combination — and which
 * spell no tone mark, because a tone mark is a later lesson's material and a
 * word needing one would fail AC4 for the right reason and tell us nothing.
 *
 * Each is checked against `vocabulary.json`'s own romanization, not against a
 * reading written out here: the expected answer is the corpus's, so a lesson
 * and a test agreeing with each other and with nothing else cannot pass.
 */
const AC4_SAMPLE: readonly string[] = [
	// two consonants, a short o between them
	"คน",
	"ลง",
	"ตก",
	"จบ",
	"นก",
	"ผล",
	// a lone consonant that will not fit
	"ถนน",
	"ขนม",
	"ตลก",
	"นคร",
	// อ and ว read as vowels
	"ของ",
	"ชอบ",
	"บอก",
	"สอง",
	"รวม",
	"ดวง",
	"ขวด",
	// a bare final ร, and ร หัน
	"กร",
	"พร",
	"กรรม",
	"พรรค",
	// clusters, true and false
	"ตรง",
	"กลาง",
	"ความ",
	"ครอง",
	"ปลอม",
	"กลับ",
	"คลอง",
	"ปลา",
	"กรอบ",
	"พระ",
	"ประตู",
	"ขวา",
	"ตรวจ",
	"ทราบ",
	"ทรง",
	"จริง",
	// leading consonants, silent and spoken
	"ไกล",
	"ไหล",
	"สมุด",
	"สนุก",
	"ประชุม",
	"หมด",
	"หลง",
	"หนัง",
	"หญิง",
	"หมอ",
	"หรอก",
	"หลวง",
	"สวัสดี",
	"ขนาด",
	"ตลอด",
	"สงบ",
	"สมัย",
	"ผลิต",
	"สนใจ",
];

/** AC2's own list: the productive branch, by frequency rank. */
const AC2_SPOKEN_LEADER_WORDS: readonly string[] = [
	"สวัสดี",
	"ขนาด",
	"ตลอด",
	"สงบ",
	"สมัย",
	"ผลิต",
	"ถนน",
];

function expectWordReads(rules: LessonRules, word: string): void {
	const entry = vocabularyByThai.get(word);
	expect(entry, `${word} is not in vocabulary.json`).toBeDefined();
	const expected = romanSyllables(entry?.romanization ?? "");
	const reading = readWord(rules, word);
	if (reading.state !== "read") {
		throw new Error(`${word}: ${reading.reason}`);
	}
	expect(
		reading.syllables.length,
		`${word}: the lessons read ${reading.syllables.length} syllable(s), the corpus writes ${expected.length} (${entry?.romanization})`,
	).toBe(expected.length);
	reading.syllables.forEach((syllable, index) => {
		const target = expected[index];
		expect(
			target.plain.startsWith(syllable.onset),
			`${word} syllable ${index + 1}: the lessons open it "${syllable.onset}", the corpus writes "${target.plain}"`,
		).toBe(true);
		expect(
			target.plain.includes(syllable.vowel),
			`${word} syllable ${index + 1}: the lessons supply the vowel "${syllable.vowel}", which is not in "${target.plain}"`,
		).toBe(true);
		expect(
			syllable.tone,
			`${word} syllable ${index + 1}: the lessons give ${syllable.tone} tone, the corpus writes ${target.tone} (${entry?.romanization})`,
		).toBe(target.tone);
	});
}

// ============================================================================
// AC1 — the seam and the sequence
// ============================================================================

describe("AC1 — the three promoted lessons are served as decks", () => {
	it("resolves each to the deck arm at its declared sequence position", () => {
		for (const { id, legacyNumber } of PROMOTED) {
			expect(DECK_LESSON_IDS.has(id), id).toBe(true);

			const entry = lessonEntryById(id);
			expect(entry.ok, `${id} is not declared in lessonSequence`).toBe(true);
			if (!entry.ok) continue;
			expect(entry.entry.legacyNumber, id).toBe(legacyNumber);
			// Task 4.3's resequence moved the promoted lessons off their
			// appended slots (position == legacyNumber) into their teaching
			// positions; identity is the id and the legacy number, and the
			// relative ordering is asserted below.
			expect(entry.entry.position, id).toBeLessThanOrEqual(
				lessonSequence.length,
			);

			const content = resolveLessonContent(id);
			expect(content).toEqual({
				status: "resolved",
				content: {
					kind: "deck",
					deckPath: `/thai-script/lessons/${id}/deck.json`,
				},
			});

			const result = validateDeck(deckFor(id));
			if (!result.ok) {
				throw new Error(
					`${id} deck rejected: ${result.errors.map((e) => e.message).join("; ")}`,
				);
			}
			expect(result.deck.lessonId).toBe(id);
		}
	});

	it("fills the slots phase 3 declared for it, in declaration order", () => {
		const positions = PROMOTED.map((lesson) => {
			const entry = lessonEntryById(lesson.id);
			return entry.ok ? entry.entry.position : -1;
		});
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
		for (const { id } of PROMOTED) {
			expect(PHASE_THREE_LESSON_IDS).toContain(id);
		}
		const reconciliation = reconcileLessonSlots([...DECK_LESSON_IDS]);
		expect(reconciliation.orphaned).toEqual([]);
		for (const { id } of PROMOTED) {
			expect(reconciliation.filled).toContain(id);
		}
	});
});

// ============================================================================
// AC2 — one rule, three branches
// ============================================================================

describe("AC2 — the leading-consonant lesson states one rule", () => {
	it("states the class transfer once, and not again inside any branch", () => {
		const rule = leadingRuleFromLesson();
		expect(rule.statement).toMatch(CLASS_TRANSFER);
		const stating = deckFor(LEADING)
			.slides.filter((s) =>
				[s.heading ?? "", ...(s.body ?? [])].some((line) =>
					CLASS_TRANSFER.test(line),
				),
			)
			.map((s) => s.id);
		expect(
			stating,
			"the class transfer is stated on more than one slide, which is the split this lesson exists to close",
		).toEqual(["one-rule"]);
		expect(rule.branches).toHaveLength(3);
	});

	it("yields the class inheritance for a ห word and an อ word from that one statement", () => {
		const rule = leadingRuleFromLesson();
		const silentH = applyLeadingRule(rule, "ห", "ม", "หมอ");
		expect(silentH).toEqual({
			leads: true,
			branch: "silent-h",
			leaderSpoken: false,
			effectiveClass: ThaiSymbolClass.High,
		});
		const silentO = applyLeadingRule(rule, "อ", "ย", "อยาก");
		expect(silentO).toEqual({
			leads: true,
			branch: "silent-o",
			leaderSpoken: false,
			effectiveClass: ThaiSymbolClass.Mid,
		});
		const spoken = applyLeadingRule(rule, "ส", "ว", "สวัสดี");
		expect(spoken).toEqual({
			leads: true,
			branch: "spoken-leader",
			leaderSpoken: true,
			effectiveClass: ThaiSymbolClass.High,
		});
		// A low-class leader has no class worth passing on, in any branch.
		expect(applyLeadingRule(rule, "ล", "ม", "ลม").leads).toBe(false);
	});

	it("closes the อ branch at four words and says so", () => {
		const rule = leadingRuleFromLesson();
		const branch = rule.branches.find((b) => b.id === "silent-o");
		expect(branch?.closed).toBe(true);
		expect(branch?.words).toHaveLength(4);
		expect([...(branch?.words ?? [])].sort()).toEqual(
			[...O_LEADING_WORDS].sort(),
		);
		expect(textOf(LEADING, "branch-silent-o")).toMatch(/\bfour\b/i);
		// A ย word outside the four is refused by the same call that admits อยาก.
		expect(applyLeadingRule(rule, "อ", "ย", "ยาก").leads).toBe(false);
	});

	it("keeps the productive branch open and reaches AC2's frequency-ranked words", () => {
		const rule = leadingRuleFromLesson();
		const spoken = rule.branches.find((b) => b.id === "spoken-leader");
		expect(spoken?.closed).toBe(false);
		expect(spoken?.leaderSpoken).toBe(true);
		const text = textOf(LEADING, "branch-spoken-leader");
		for (const word of AC2_SPOKEN_LEADER_WORDS) {
			expect(text, `the lesson never shows ${word}`).toContain(word);
		}
		expect(textOf(LEADING, "branch-silent-h")).toMatch(/\bopen\b/i);
	});

	it("names the ten sonorants the rule ranges over", () => {
		const rule = leadingRuleFromLesson();
		expect([...rule.sonorants].sort()).toEqual([...SONORANTS].sort());
	});
});

// ============================================================================
// AC3 — the closed cluster inventory
// ============================================================================

describe("AC3 — the cluster lesson states a closed inventory", () => {
	it("lists twenty pairs and says that is all of them", () => {
		const inventory = clustersFromLesson();
		expect(inventory.size).toBe(20);
		expect([...inventory.keys()].sort()).toEqual(
			CLUSTER_INVENTORY.map((pair) => pair.pair).sort(),
		);
		const closure = textOf(CLUSTERS, "the-closure");
		expect(closure).toMatch(/\btwenty\b/i);
		expect(closure).toMatch(/not one opening|two syllables/i);
		expect(textOf(CLUSTERS, "only-three-followers")).toMatch(/ร, ล or ว/);
	});

	it("tells a learner that a pair outside the inventory is not a cluster", () => {
		const inventory = clustersFromLesson();
		for (const pair of ["ถน", "ขน", "สน", "ตล", "สว", "นค"]) {
			expect(
				inventory.get(pair),
				`${pair} was admitted as a cluster`,
			).toBeUndefined();
		}
		const rules = rulesFromLessons();
		// And the reading follows: ถน is two syllables, never one opening.
		const reading = readWord(rules, "ถนน");
		expect(reading.state).toBe("read");
		if (reading.state === "read") expect(reading.syllables).toHaveLength(2);
	});

	it("states each kind's sound and keeps the class on the first letter", () => {
		const inventory = clustersFromLesson();
		expect(inventory.get("ทร")).toEqual({
			pair: "ทร",
			kind: "false-sound",
			onset: "s",
		});
		expect(inventory.get("จร")?.onset).toBe("j");
		expect(inventory.get("คร")?.onset).toBe("khr");
		expect(textOf(CLUSTERS, "true-clusters")).toMatch(
			/takes its class from the first letter/i,
		);
		expect(textOf(CLUSTERS, "false-sound-clusters")).toMatch(
			/the class does not/i,
		);
		expect(textOf(CLUSTERS, "lexical-pairs")).toMatch(/decided by the word/i);
	});
});

// ============================================================================
// AC4 — corpus words read from the lessons' own content
// ============================================================================

describe("AC4 — the lessons as stated resolve real words", () => {
	it("recovers all six unwritten vowels from the examples the lesson prints", () => {
		const { unwritten } = rulesFromLessons();
		expect(unwritten.implicitO).toMatchObject({
			romanization: "o",
			length: "short",
		});
		expect(unwritten.implicitA).toMatchObject({
			romanization: "a",
			length: "short",
		});
		expect(unwritten.bareFinalRo).toMatchObject({
			romanization: "aaw",
			length: "long",
		});
		expect(unwritten.roHan).toMatchObject({
			romanization: "a",
			length: "short",
		});
		expect(unwritten.oAsVowel).toMatchObject({
			romanization: "aaw",
			length: "long",
		});
		expect(unwritten.wAsVowel).toMatchObject({
			romanization: "ua",
			length: "long",
		});
		expect(unwritten.oIsConsonantOnlyAtWordStart).toBe(true);
		for (const rule of Object.values(unwritten)) {
			if (typeof rule === "boolean") continue;
			expect(rule.evidence, `${rule.id} rests on one example`).toBeGreaterThan(
				1,
			);
		}
	});

	it("states which reading wins when two of them fit", () => {
		const text = textOf(UNWRITTEN, "which-reading-wins");
		expect(text).toMatch(/fewer of them|fewer syllables/i);
		expect(text).toMatch(/where that ties|then/i);
		expect(text).toMatch(/bare ร ending beats the short o/i);
	});

	it("resolves every sampled corpus word's pronunciation and tone", () => {
		const rules = rulesFromLessons();
		for (const word of AC4_SAMPLE) expectWordReads(rules, word);
		expect(AC4_SAMPLE.length).toBeGreaterThan(40);
	});

	it("resolves AC2's frequency-ranked leader words", () => {
		const rules = rulesFromLessons();
		for (const word of [...AC2_SPOKEN_LEADER_WORDS, "สนใจ"]) {
			expectWordReads(rules, word);
		}
	});

	it("depends on the lesson text: thinning a rule's examples stops the reading", () => {
		const rules = rulesFromLessons();
		expect(readWord(rules, "คน").state).toBe("read");

		// Take the worked examples off the implicit-o slide and nothing else.
		const original = slide(UNWRITTEN, "implicit-o").body;
		try {
			slide(UNWRITTEN, "implicit-o").body = [];
			expect(() => rulesFromLessons()).toThrow(/does not state this reading/);
		} finally {
			slide(UNWRITTEN, "implicit-o").body = original;
		}
		expect(readWord(rulesFromLessons(), "คน").state).toBe("read");
	});

	it("keeps its written-vowel table honest against the alphabet", () => {
		let checked = 0;
		for (const [character, reading] of Object.entries(WRITTEN_VOWELS)) {
			const symbol = vowels.find((vowel) =>
				vowel.character.includes(character),
			);
			if (!symbol) continue;
			expect(symbol.length, `${character} (${symbol.name})`).toBe(
				reading.length,
			);
			checked += 1;
		}
		expect(checked).toBeGreaterThan(4);
	});
});

// ============================================================================
// AC5 — originality
// ============================================================================

describe("AC5 — none of the three lessons reuses the source's phrasing", () => {
	it("clears the shared originality check on every line of every deck", async () => {
		const overlaps: string[] = [];
		let checked = 0;
		for (const { id } of PROMOTED) {
			for (const text of textsOf(deckFor(id))) {
				const result = await checkOriginality(text);
				if (result.status === "overlapping") {
					overlaps.push(
						`${id}: "${result.overlap.ngram}" (${result.overlap.sources.join(", ")}) in "${text}"`,
					);
					continue;
				}
				expect(result.status).toBe("cleared");
				checked += result.ngramsChecked;
			}
		}
		expect(overlaps, overlaps.join("\n")).toEqual([]);
		expect(checked).toBeGreaterThan(0);
	});

	it("catches a planted overlap, so the clearance above is not vacuous", async () => {
		const planted =
			"Think of a coffee mug with a broken handle. The head on top and loop on the bottom are where the handle used to be attached.";
		const result = await checkOriginality(planted);
		expect(result.status).toBe("overlapping");
	});
});

// ============================================================================
// AC6 — assets
// ============================================================================

describe("AC6 — every asset these decks reference exists", () => {
	it("references only files inside the lesson's own directory, and leaves none unreferenced", () => {
		for (const { id } of PROMOTED) {
			const directory = join(PUBLIC_LESSONS, id);
			const path = deckPathForLesson(id);
			expect(path).toEqual({
				ok: true,
				path: `/thai-script/lessons/${id}/deck.json`,
			});
			expect(existsSync(join(directory, "deck.json")), id).toBe(true);
			expect(existsSync(join(directory, "manifest.json")), id).toBe(true);

			const manifest = JSON.parse(
				readFileSync(join(directory, "manifest.json"), "utf-8"),
			) as Manifest;
			expect(manifest.lessonId).toBe(id);

			const referenced = new Set<string>();
			for (const s of deckFor(id).slides) {
				for (const audio of s.audio ?? []) referenced.add(audio);
				if (s.image) referenced.add(s.image);
			}
			for (const asset of referenced) {
				expect(asset.startsWith(`/thai-script/lessons/${id}/`), asset).toBe(
					true,
				);
				const file = asset.slice(`/thai-script/lessons/${id}/`.length);
				expect(file).not.toContain("..");
				expect(existsSync(join(directory, file)), asset).toBe(true);
			}
			// Two levels: the pipeline writes assets into `audio/` and `images/`
			// rather than beside the deck, so a one-level walk asserts the
			// subdirectory itself is a referenced asset. That could only pass
			// while the lesson had no assets at all.
			for (const child of readdirSync(directory)) {
				if (child === "deck.json" || child === "manifest.json") continue;
				for (const name of readdirSync(join(directory, child))) {
					expect(
						referenced.has(`/thai-script/lessons/${id}/${child}/${name}`),
						`${id}/${child}/${name} is committed but no slide references it`,
					).toBe(true);
				}
			}
			for (const asset of manifest.assets) {
				if (asset.file === null) continue;
				// `path` is the URL the app fetches; `file` is where it sits on disk.
				expect(existsSync(join(directory, asset.file)), asset.file).toBe(true);
			}
		}
	});

	it("shows only Thai words the vocabulary already holds", () => {
		// A single character is a letter being named and a run of exactly two
		// consonants is a spelling fragment the lessons quote — a cluster pair,
		// นน, รร. Neither is a word, and neither is looked up. Everything else
		// is a word the learner is being shown, and has to be one the app
		// already teaches.
		const ownName = "อักษรนำ";
		let checked = 0;
		for (const { id } of PROMOTED) {
			for (const text of textsOf(deckFor(id))) {
				for (const run of text.match(THAI_RUN) ?? []) {
					const characters = [...run];
					if (characters.length === 1) continue;
					if (characters.length === 2 && characters.every(isConsonant)) {
						continue;
					}
					if (run === ownName) continue;
					checked += 1;
					expect(
						vocabularyByThai.has(run),
						`${id}: ${run} is not in vocabulary.json`,
					).toBe(true);
				}
			}
		}
		expect(checked).toBeGreaterThan(50);
		expect(vocabularyByThai.has("พูด")).toBe(true);
	});
});
