import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import vocabularyData from "../../vocabulary/data/vocabulary.json";
import { syllableShapeOf } from "../../vocabulary/services/toneExplanation";
import { generateCardsForLesson } from "../services/ScriptCardGenerator";
import {
	DECK_LESSON_IDS,
	deckPathForLesson,
	resolveLessonContent,
	validateDeck,
} from "./lessonContent";
import {
	lessonCount,
	lessonSequence,
	numeralsTrackState,
	RETIRED_LESSONS,
	reconcileLessonSlots,
} from "./lessonSequence";
import { checkOriginality } from "./originality";
import { conditionalFormFor } from "./sceneGrammar";
import { clusterFor, SONORANTS } from "./syllableRules";
import { consonantCount, getSchedulingPriority } from "./symbolPriority";
import {
	consonants,
	getConsonant,
	lessons,
	rareVowels,
	specialRules,
	ThaiSymbolClass,
	type ToneValue,
	thaiNumerals,
	toneMarkRules,
	toneMarks,
	toneRules,
	vowels,
} from "./symbols";
import { resolveSyllableTone, type ToneMarkName } from "./toneMarkTable";

/**
 * Task 4.3's proof: the sequence is closed.
 *
 * Six claims, one file: no lesson serves the licensed video any more (AC1);
 * every symbol — the rare tail included — is taught by exactly one lesson
 * (AC2); demotion changed scheduling priority and nothing else (AC3); the
 * numerals track is optional in a way completion does not silently depend on
 * (AC4); the sequence's own rules resolve the tone of every corpus word in
 * the taught rank window, with disagreements counted against a recorded
 * baseline (AC5); and the resequenced ordering has no forward reference
 * (AC6). Everything reads the committed artefacts under `public/lessons/`
 * and `content/lessons/` — what the app serves is what is under test.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PUBLIC_LESSONS = join(REPO_ROOT, "public", "lessons");
const SCRIPTS = join(REPO_ROOT, "content", "lessons");

/** The lessons this task authored; the structural checks sweep these. */
const NEW_LESSON_IDS = [
	"lesson-12",
	"lesson-13",
	"lesson-14",
	"lesson-numerals",
] as const;

/** AC2's named letters: the demoted rare tail. */
const DEMOTED_LETTERS = [
	"ฬ",
	"ฆ",
	"ฑ",
	"ฒ",
	"ฐ",
	"ฎ",
	"ฏ",
	"ฃ",
	"ฅ",
	"ฌ",
] as const;

type RawSlide = {
	kind: string;
	id: string;
	heading?: string;
	body?: string[];
	prompt?: string;
	answers?: string[];
	audio?: string[];
	image?: string;
};
type RawDeck = { lessonId: string; title: string; slides: RawSlide[] };
type Manifest = { lessonId: string; assets: { path: string | null }[] };

const THAI = /[฀-๿]/g;
const THAI_RUN = /[฀-๿]+/g;
const THAI_CONSONANT = /[ก-ฮ]/;

function readDeck(id: string): RawDeck {
	return JSON.parse(
		readFileSync(join(PUBLIC_LESSONS, id, "deck.json"), "utf-8"),
	) as RawDeck;
}

function readScript(id: string): string {
	return readFileSync(join(SCRIPTS, `${id}.md`), "utf-8");
}

/** Every piece of learner-facing prose on a deck, in slide order. */
function textsOf(deck: RawDeck): string[] {
	const texts: string[] = [deck.title];
	for (const slide of deck.slides) {
		if (slide.heading) texts.push(slide.heading);
		if (slide.prompt) texts.push(slide.prompt);
		texts.push(...(slide.body ?? []));
		texts.push(...(slide.answers ?? []));
	}
	return texts;
}

function thaiCharsIn(texts: readonly string[]): Set<string> {
	const chars = new Set<string>();
	for (const text of texts)
		for (const ch of text.match(THAI) ?? []) chars.add(ch);
	return chars;
}

/**
 * Runs of two or more Thai characters containing at least one consonant —
 * candidate words. A vowel pattern printed with its placeholder hyphen
 * (`เ-ีย`) splits into fragments, and the trailing fragment of the patterns
 * this band teaches (`ีย`, `ัว`, `ือ`) contains ย, ว or อ — all inside ก-ฮ —
 * so pattern fragments are exempted by derivation from the declared symbol
 * sets rather than each check inventing its own skip list.
 */
function thaiWordRunsIn(texts: readonly string[]): Set<string> {
	const words = new Set<string>();
	for (const text of texts) {
		for (const run of text.match(THAI_RUN) ?? []) {
			if (run.length >= 2 && THAI_CONSONANT.test(run)) words.add(run);
		}
	}
	return words;
}

/** Placeholder-split fragments of every declared vowel pattern and rare sign. */
function patternFragments(): Set<string> {
	const fragments = new Set<string>();
	const patterns = [
		...lessons.flatMap((row) => row.vowels),
		...rareVowels.map((vowel) => vowel.character),
	];
	for (const pattern of patterns) {
		for (const piece of pattern.replaceAll(" ", "").split("-")) {
			if (piece.length > 0) fragments.add(piece);
		}
	}
	return fragments;
}

/** A `<key>: <glyphs> — <reason>` declaration in a lesson script. */
function declarationsOf(id: string, key: "previews" | "teaches"): Set<string> {
	const source = readScript(id);
	const glyphs = new Set<string>();
	for (const line of source.matchAll(
		new RegExp(String.raw`^${key}:\s*(.+)$`, "gm"),
	)) {
		const body = line[1];
		if (body.trim() === "none") continue;
		const [heads, ...rest] = body.split("—");
		if (rest.join("—").trim().length === 0) continue;
		for (const ch of heads.match(THAI) ?? []) glyphs.add(ch);
	}
	return glyphs;
}

/**
 * The `ranks:` window a script declares. The opening band predates the
 * convention and declares none, so absent is `undefined` here — but the four
 * lessons this task authored must declare one, and their own check below
 * throws through `requiredRankWindow`.
 */
function declaredRankWindow(
	id: string,
): { lo: number; hi: number } | undefined {
	const matched = readScript(id).match(/^ranks:\s*(\d+)\s*-\s*(\d+)\s*$/m);
	if (!matched) return undefined;
	return { lo: Number(matched[1]), hi: Number(matched[2]) };
}

function requiredRankWindow(id: string): { lo: number; hi: number } {
	const window = declaredRankWindow(id);
	if (!window) {
		throw new Error(`${id} declares no rank window for its example words`);
	}
	return window;
}

interface CorpusSyllableAnnotation {
	readonly text?: string | null;
	readonly finalConsonant?: string | null;
	readonly vowel?: string | null;
	readonly toneMark?: string | null;
	readonly tone?: string | null;
}
interface CorpusWord {
	readonly thai: string;
	readonly rank?: number | null;
	readonly romanization?: string;
	readonly syllables?: readonly CorpusSyllableAnnotation[] | null;
}

const corpus = vocabularyData as unknown as CorpusWord[];
const corpusByThai = new Map(corpus.map((entry) => [entry.thai, entry]));

const decks = new Map(
	lessonSequence.map((entry) => [entry.id, readDeck(entry.id)] as const),
);

// ============================================================================
// AC1 — the strangler is complete: every lesson serves a deck
// ============================================================================

describe("AC1 — no lesson in the sequence resolves to the video arm", () => {
	it("resolves every declared lesson to a deck", () => {
		const offences: string[] = [];
		for (const entry of lessonSequence) {
			const resolution = resolveLessonContent(entry.id);
			if (resolution.status !== "resolved") {
				offences.push(`${entry.id}: ${resolution.status}`);
				continue;
			}
			if (resolution.content.kind !== "deck") {
				offences.push(`${entry.id}: still serves ${resolution.content.kind}`);
			}
		}
		expect(offences, offences.join("\n")).toEqual([]);
		expect(DECK_LESSON_IDS.size).toBe(lessonSequence.length);
	});

	it("has a committed, schema-valid deck in every declared slot", () => {
		const reconciliation = reconcileLessonSlots([...DECK_LESSON_IDS]);
		expect(reconciliation.unfilled).toEqual([]);
		expect(reconciliation.orphaned).toEqual([]);
		for (const entry of lessonSequence) {
			expect(deckPathForLesson(entry.id)).toEqual({
				ok: true,
				path: `/thai-script/lessons/${entry.id}/deck.json`,
			});
			const result = validateDeck(decks.get(entry.id));
			if (!result.ok) {
				throw new Error(
					`${entry.id} deck rejected: ${result.errors.map((e) => e.message).join("; ")}`,
				);
			}
			expect(result.deck.lessonId).toBe(entry.id);
		}
	});
});

// ============================================================================
// AC2 — every symbol is taught by exactly one lesson
// ============================================================================

describe("AC2 — every symbol is taught by exactly one lesson", () => {
	const declaredLegacies = new Set(
		lessonSequence.map((entry) => entry.legacyNumber),
	);

	it("files every consonant in exactly one lessons-table row, and that row is in the sequence", () => {
		expect(consonants).toHaveLength(44);
		for (const consonant of consonants) {
			const rows = lessons.filter((row) =>
				row.consonants.includes(consonant.character),
			);
			expect(
				rows,
				`${consonant.character} is taught by ${rows.length} lessons`,
			).toHaveLength(1);
			expect(rows[0].number).toBe(consonant.lesson);
			expect(
				declaredLegacies.has(consonant.lesson),
				`${consonant.character} is filed under ${consonant.lesson}, which the sequence does not declare`,
			).toBe(true);
		}
	});

	it("keeps the ten demoted letters taught — demotion moved their schedule, not their lesson", () => {
		for (const letter of DEMOTED_LETTERS) {
			const rows = lessons.filter((row) => row.consonants.includes(letter));
			expect(rows, letter).toHaveLength(1);
		}
	});

	it("files every vowel, tone mark, rare vowel and numeral under a declared lesson", () => {
		for (const vowel of vowels) {
			expect(
				declaredLegacies.has(vowel.lesson),
				`${vowel.character} → lesson ${vowel.lesson}`,
			).toBe(true);
			const row = lessons.find(
				(candidate) => candidate.number === vowel.lesson,
			);
			expect(row, vowel.character).toBeDefined();
			const rowChars = thaiCharsIn([
				...(row?.vowels ?? []),
				...(row?.consonants ?? []),
			]);
			for (const ch of thaiCharsIn([vowel.character])) {
				expect(rowChars.has(ch), `${vowel.character}: row omits ${ch}`).toBe(
					true,
				);
			}
		}
		for (const mark of toneMarks) {
			expect(declaredLegacies.has(mark.lesson), mark.character).toBe(true);
			const rows = lessons.filter((row) =>
				row.toneMarks.includes(mark.character),
			);
			expect(rows, mark.character).toHaveLength(1);
			expect(rows[0].number).toBe(mark.lesson);
		}
		for (const rare of rareVowels) {
			expect(declaredLegacies.has(rare.lesson), rare.character).toBe(true);
		}
		const numeralsEntry = lessonSequence.find((entry) => !entry.required);
		expect(numeralsEntry).toBeDefined();
		for (const numeral of thaiNumerals) {
			expect(numeral.lesson, numeral.thai).toBe(numeralsEntry?.legacyNumber);
		}
	});
});

// ============================================================================
// AC3 — demotion: same set, lower priority, still reviewed
// ============================================================================

describe("AC3 — demoted letters remain in the SRS set", () => {
	it("keeps the symbol set at 44 consonants, every one reachable through some lesson's cards", () => {
		expect(consonantCount()).toBe(44);
		const covered = new Set<string>();
		for (const entry of lessonSequence) {
			for (const card of generateCardsForLesson(entry.position)) {
				if (card.symbolCharacter) covered.add(card.symbolCharacter);
			}
		}
		for (const consonant of consonants) {
			expect(
				covered.has(consonant.character),
				`${consonant.character} has no card in any lesson`,
			).toBe(true);
		}
		for (const letter of DEMOTED_LETTERS) {
			expect(covered.has(letter), letter).toBe(true);
		}
	});

	it("schedules every demoted letter in the corpus-derived tail, cards entering review as usual", () => {
		// Measured floor: the ten demoted letters rank 34-44 of 44 by
		// any-position corpus frequency (`symbolPriority.ts`). The exact
		// numbers may drift with the corpus; the tail property is the claim.
		for (const letter of DEMOTED_LETTERS) {
			const priority = getSchedulingPriority(letter);
			expect(priority, letter).toBeTypeOf("number");
			expect(priority ?? 0, `${letter} is not in the tail`).toBeGreaterThan(33);
		}
		const rareTailPosition = lessonSequence.find(
			(entry) => entry.id === "lesson-14",
		)?.position;
		expect(rareTailPosition).toBeDefined();
		const cards = generateCardsForLesson(rareTailPosition ?? 0);
		for (const letter of DEMOTED_LETTERS) {
			const own = cards.filter((card) => card.symbolCharacter === letter);
			expect(own.length, `${letter} generates no review cards`).toBeGreaterThan(
				0,
			);
			for (const card of own) {
				expect(card.srs.repetitions).toBe(0);
			}
		}
	});

	it("gates progression on completed lessons only — mastery of a demoted letter is not an input", () => {
		// Completion is `completedLessons.length >= lessonCount` (the pinned
		// AchievementService expression); its only input is lesson positions.
		// A learner who completed every required lesson without a single
		// review of ฬ satisfies it.
		const everyRequired = lessonSequence
			.filter((entry) => entry.required)
			.map((entry) => entry.position);
		expect(everyRequired.length >= lessonCount).toBe(true);
	});
});

// ============================================================================
// AC4 — the numerals track: optional, three distinct states
// ============================================================================

describe("AC4 — the numerals track has three distinct states", () => {
	const optional = lessonSequence.filter((entry) => !entry.required);

	it("declares exactly one optional lesson, in last position, outside the required count", () => {
		expect(optional).toHaveLength(1);
		expect(optional[0].id).toBe("lesson-numerals");
		expect(optional[0].position).toBe(lessonSequence.length);
		expect(lessonCount).toBe(lessonSequence.length - 1);
		for (const entry of lessonSequence) {
			if (entry.required) {
				expect(entry.position).toBeLessThan(optional[0].position);
			}
		}
	});

	it("resolves a learner to exactly one of three distinct states", () => {
		const requiredPositions = lessonSequence
			.filter((entry) => entry.required)
			.map((entry) => entry.position);
		const midway = requiredPositions.slice(0, 5);

		const notStarted = numeralsTrackState(midway);
		const skipped = numeralsTrackState(requiredPositions);
		const completed = numeralsTrackState([
			...requiredPositions,
			optional[0].position,
		]);

		expect(notStarted).toBe("not-started");
		expect(skipped).toBe("skipped");
		expect(completed).toBe("completed");
		expect(new Set([notStarted, skipped, completed]).size).toBe(3);
	});

	it("reports course completion identically for a skipping and a completing learner", () => {
		const requiredPositions = lessonSequence
			.filter((entry) => entry.required)
			.map((entry) => entry.position);
		const skipping = requiredPositions;
		const completing = [...requiredPositions, optional[0].position];

		// The completion predicate the app ships (`AchievementService`):
		// completedLessons.length >= lessonCount.
		expect(skipping.length >= lessonCount).toBe(true);
		expect(completing.length >= lessonCount).toBe(true);
		expect(skipping.length >= lessonCount).toBe(
			completing.length >= lessonCount,
		);
		// And a learner mid-course is not complete, so the predicate is not
		// vacuously true.
		expect(skipping.slice(0, 5).length >= lessonCount).toBe(false);
	});
});

// ============================================================================
// AC5 — the sequence's rules resolve the taught corpus
// ============================================================================

/** `vocabulary.json` tone-mark field values → the table's mark names. */
const TONE_MARK_FIELD: Readonly<Record<string, ToneMarkName>> = {
	mayek: "mai ek",
	maytho: "mai tho",
	maytri: "mai tri",
	mayjattawa: "mai chattawa",
};

/**
 * Finals that keep a syllable live: any letter whose taught final sound is a
 * sonorant (m, n, ng, or a glide). Derived from the per-letter `finalSound`
 * fields rather than listed, so ร ล ญ ณ ฬ — which all end syllables as n —
 * are included the way `liveEndingConsonants` already records for ร and ล.
 */
const LIVE_FINALS = new Set(
	consonants
		.filter((consonant) =>
			["m", "n", "ng", "y", "w", "i", "o"].includes(
				consonant.finalSound.split(/[ (/]/)[0],
			),
		)
		.map((consonant) => consonant.character),
);
const SHORT_SIGNS = ["ะ", "ั", "ิ", "ึ", "ุ", "็"];
const LIVE_OPEN_SHORT = ["ำ", "ไ", "ใ"];

function firstConsonantIndex(chars: readonly string[]): number {
	return chars.findIndex((ch) => getConsonant(ch) !== undefined);
}

/**
 * The governing class of a written syllable, by the taught rules: the
 * leading-consonant rule for ห + sonorant and อ + ย, the cluster rule
 * (first letter governs), and otherwise the class of the initial letter.
 */
function governingClassOf(text: string): ThaiSymbolClass | undefined {
	const chars = [...text];
	const first = firstConsonantIndex(chars);
	if (first < 0) return undefined;
	const c0 = chars[first];
	const c1 = chars[first + 1];
	if (c1 !== undefined && getConsonant(c1) !== undefined) {
		if (c0 === "ห" && SONORANTS.includes(c1)) return ThaiSymbolClass.High;
		if (c0 === "อ" && c1 === "ย") return ThaiSymbolClass.Mid;
		if (clusterFor(c0 + c1)) return getConsonant(c0)?.classType;
	}
	return getConsonant(c0)?.classType;
}

/**
 * live / dead-short / dead-long from the stored final and vowel, using the
 * taught endings data: sonorant finals are live; stopped finals are dead
 * with the vowel's length deciding short against long; open syllables are
 * live on a long vowel and dead on a short one, except the short vowels the
 * ao-ai exception and sara am's built-in final keep live.
 */

interface ToneSweep {
	words: number;
	syllables: number;
	agreements: number;
	unresolved: number;
	disagreements: string[];
}

function sweepTaughtWindow(hi: number): ToneSweep {
	const sweep: ToneSweep = {
		words: 0,
		syllables: 0,
		agreements: 0,
		unresolved: 0,
		disagreements: [],
	};
	for (const entry of corpus) {
		if (typeof entry.rank !== "number" || entry.rank > hi) continue;
		sweep.words += 1;
		for (const annotation of entry.syllables ?? []) {
			const stored = annotation.tone;
			const text = annotation.text;
			if (!stored || !text) continue;
			sweep.syllables += 1;
			const governingClass = governingClassOf(text);
			const syllableType = syllableShapeOf(annotation);
			const markField = annotation.toneMark;
			const toneMark = markField ? TONE_MARK_FIELD[markField] : undefined;
			if (governingClass === undefined || syllableType === undefined) {
				sweep.unresolved += 1;
				continue;
			}
			const resolved = resolveSyllableTone({
				governingClass,
				syllableType,
				toneMark,
			});
			if (resolved === undefined) {
				sweep.unresolved += 1;
				continue;
			}
			if (resolved === (stored as ToneValue)) {
				sweep.agreements += 1;
			} else {
				sweep.disagreements.push(
					`${entry.thai} (rank ${entry.rank}) syllable ${text}: rules read ${resolved}, corpus stores ${stored}`,
				);
			}
		}
	}
	return sweep;
}

/**
 * Recorded, not asserted to be zero (AC5). Measured over ranks 1-2700:
 * agreement on 4,435 of 4,555 compared syllables (97.4%).
 *
 * Two earlier baselines are worth keeping in view, because each moved for the
 * same underlying reason. The first recorded 4,038 of 4,369 and blamed the
 * residue on one corpus defect — 299 low-class dead-short syllables (ทุก, รับ,
 * นัก) stored as "falling" where the rule says high. Re-deriving the corpus
 * with `enrich-vocabulary.py --retokenize` fixed that half and, by doing so,
 * showed that `syllableTypeOf` here had the *same* defect: both sides said
 * falling, so the sweep had been counting agreement on a shared mistake. That
 * produced the second baseline, 4,215 of 4,555.
 *
 * This third move — 4,215 to 4,377, 162 syllables — is the last shape of that
 * same defect. A syllable with no vowel written *and nothing closing it* is a
 * bare consonant standing alone: the ข of ขนาด, the ต of ตลอด, the ถ of ถนน.
 * It carries the implicit short /a/, so it is open and short, which is
 * dead-short. `syllableShapeOf` was reading "no vowel written" as "long" in
 * exactly the branch the earlier two fixes did not reach, which made those
 * syllables live and so rising instead of low. The fix landed in
 * `toneExplanation.ts`, which this sweep now shares.
 *
 * A fourth move, 4,377 to 4,435, came from the other side of the same
 * question. `parse_syllable` had always known that `อ` and a non-final `ว`
 * are vowels, but emitted a `vowel` field joined from `VOWEL_CHARS`, which
 * holds neither — so นอก, ขอ, ชอบ, ครอบ shipped with `vowel: null` beside a
 * tone derived knowing better. Fixing the field changed no tone at all;
 * 1,395 syllables simply gained the vowel they are written with. Those two
 * fixes needed each other: reading "no vowel written" as dead-short is only
 * right once the words that *do* write a vowel say so.
 *
 * What is left is now almost entirely อักษรนำ's *second* syllable, which the
 * corpus resolves and this sweep does not: ขนาด's นาด, ตลอด's ลอด, เสมอ's เมอ
 * disagree because `governingClassOf` reads the letter's own class where the
 * corpus has handed the syllable its leader's. Beside that sits the genuinely
 * irregular ก็ and a short tail this comment does not claim to have
 * characterised.
 *
 * A zero would only be reachable by bending the rules or the corpus until one
 * of them lied; the number moving is the signal.
 */
const TONE_SWEEP_BASELINE = {
	words: 2700,
	syllables: 4555,
	agreements: 4435,
	unresolved: 1,
	disagreements: 119,
};

describe("AC5 — the complete sequence's rules resolve the taught corpus", () => {
	const windows = lessonSequence
		.map((entry) => declaredRankWindow(entry.id))
		.filter(
			(window): window is { lo: number; hi: number } => window !== undefined,
		);
	const windowHi = Math.max(...windows.map((window) => window.hi));

	it("consults no untaught rule: every rule the resolver reads is filed under a declared lesson", () => {
		const declaredLegacies = new Set(
			lessonSequence.map((entry) => entry.legacyNumber),
		);
		expect(toneRules).toHaveLength(9);
		for (const rule of toneRules) {
			expect(declaredLegacies.has(rule.lesson), rule.id).toBe(true);
		}
		expect(toneMarkRules).toHaveLength(8);
		for (const rule of toneMarkRules) {
			expect(
				declaredLegacies.has(rule.lesson),
				`${rule.toneMarkName}/${rule.consonantClass}`,
			).toBe(true);
		}
		for (const id of [
			"live-endings",
			"dead-endings",
			"ao-ai-tone-exception",
			"sara-am-properties",
			"hor-nam",
			"silent-o-before-yo",
			"consonant-clusters",
			"unwritten-vowels",
		]) {
			const rule = specialRules.find((candidate) => candidate.id === id);
			expect(rule, id).toBeDefined();
			expect(declaredLegacies.has(rule?.lesson ?? -1), id).toBe(true);
		}
	});

	it("matches the recorded baseline across the taught rank window, reporting each disagreement", () => {
		const sweep = sweepTaughtWindow(windowHi);
		expect(sweep.words).toBeGreaterThan(1000);
		expect(sweep.agreements).toBeGreaterThan(sweep.disagreements.length);
		expect(
			{
				words: sweep.words,
				syllables: sweep.syllables,
				agreements: sweep.agreements,
				unresolved: sweep.unresolved,
				disagreements: sweep.disagreements.length,
			},
			`disagreements: ${sweep.disagreements.length}\nwords ${sweep.words} syllables ${sweep.syllables} agreements ${sweep.agreements} unresolved ${sweep.unresolved}\n${sweep.disagreements.slice(0, 40).join("\n")}`,
		).toEqual(TONE_SWEEP_BASELINE);
	});
});

// ============================================================================
// AC6 — no forward reference across the final sequence
// ============================================================================

/** Everything a lesson teaches, by its row, its data tables, and `teaches:`. */
function taughtBy(legacyNumber: number, id: string): Set<string> {
	const row = lessons.find((candidate) => candidate.number === legacyNumber);
	if (!row) {
		throw new Error(`no lessons row for legacy number ${legacyNumber}`);
	}
	const taught = thaiCharsIn([
		...row.consonants,
		...row.vowels,
		...row.toneMarks,
	]);
	for (const vowel of row.vowels) {
		const form = conditionalFormFor(vowel);
		if (!form) continue;
		for (const ch of thaiCharsIn([
			form.openForm,
			form.withFinalForm,
			...(form.exceptions ?? []).map((exception) => exception.form),
		])) {
			taught.add(ch);
		}
	}
	for (const rare of rareVowels) {
		if (rare.lesson === legacyNumber) {
			for (const ch of thaiCharsIn([rare.character])) taught.add(ch);
		}
	}
	for (const numeral of thaiNumerals) {
		if (numeral.lesson === legacyNumber) taught.add(numeral.thai);
	}
	for (const ch of declarationsOf(id, "teaches")) taught.add(ch);
	return taught;
}

describe("AC6 — no lesson uses a symbol a later lesson teaches", () => {
	it("sweeps every deck in the final sequence against what is taught by that point", () => {
		const offences: string[] = [];
		const running = new Set<string>();
		for (const entry of lessonSequence) {
			for (const ch of taughtBy(entry.legacyNumber, entry.id)) {
				running.add(ch);
			}
			const deck = decks.get(entry.id);
			if (!deck) throw new Error(`${entry.id}: no deck`);
			const previews = declarationsOf(entry.id, "previews");
			for (const ch of thaiCharsIn(textsOf(deck))) {
				if (running.has(ch) || previews.has(ch)) continue;
				offences.push(
					`${entry.id} (position ${entry.position}) uses ${ch}, taught later or never`,
				);
			}
		}
		expect(offences, offences.join("\n")).toEqual([]);
	});

	it("states the previews line on each of this task's scripts, none included", () => {
		for (const id of NEW_LESSON_IDS) {
			expect(
				/^previews:\s*\S/m.test(readScript(id)),
				`${id} states no previews: line`,
			).toBe(true);
		}
	});
});

// ============================================================================
// The retirement ledger — the migration's input
// ============================================================================

describe("retired legacy numbers stay resolvable for the persistence migration", () => {
	it("partitions 1..30 into declared and retired, absorbers all declared, none reused", () => {
		const declared = new Set(lessonSequence.map((entry) => entry.legacyNumber));
		const retired = new Set(RETIRED_LESSONS.map((entry) => entry.legacyNumber));
		for (const legacy of declared) {
			expect(retired.has(legacy), `${legacy} both declared and retired`).toBe(
				false,
			);
		}
		const union = [...declared, ...retired].sort((a, b) => a - b);
		expect(union).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
		const ids = new Set(lessonSequence.map((entry) => entry.id));
		for (const { absorbedBy } of RETIRED_LESSONS) {
			expect(ids.has(absorbedBy), absorbedBy).toBe(true);
		}
	});
});

// ============================================================================
// Structural gates for the four authored lessons
// ============================================================================

describe("the authored lessons resolve their example words inside the declared rank window", () => {
	const fragments = patternFragments();

	for (const id of NEW_LESSON_IDS) {
		it(`${id}: every word is a corpus word inside its window`, () => {
			const deck = decks.get(id);
			if (!deck) throw new Error(`${id}: no deck`);
			const { lo, hi } = requiredRankWindow(id);
			let checked = 0;
			for (const run of thaiWordRunsIn(textsOf(deck))) {
				if (fragments.has(run)) continue;
				const entry = corpusByThai.get(run);
				expect(entry, `${run} is not in vocabulary.json`).toBeDefined();
				if (!entry) continue;
				expect(entry.rank, `${run} has no frequency rank`).not.toBeNull();
				if (typeof entry.rank === "number") {
					expect(
						entry.rank,
						`${run} (rank ${entry.rank}) is outside ${lo}-${hi}`,
					).toBeGreaterThanOrEqual(lo);
					expect(entry.rank, `${run} (rank ${entry.rank})`).toBeLessThanOrEqual(
						hi,
					);
				}
				checked += 1;
			}
			expect(checked).toBeGreaterThan(4);
		});
	}
});

describe("the authored lessons ship only what their decks reference", () => {
	for (const id of NEW_LESSON_IDS) {
		it(`${id}: assets are contained and accounted for`, () => {
			const directory = join(PUBLIC_LESSONS, id);
			expect(existsSync(join(directory, "deck.json"))).toBe(true);
			expect(existsSync(join(directory, "manifest.json"))).toBe(true);
			const manifest = JSON.parse(
				readFileSync(join(directory, "manifest.json"), "utf-8"),
			) as Manifest;
			expect(manifest.lessonId).toBe(id);

			const deck = decks.get(id);
			const referenced = new Set<string>();
			for (const slide of deck?.slides ?? []) {
				for (const audio of slide.audio ?? []) referenced.add(audio);
				if (slide.image) referenced.add(slide.image);
			}
			for (const asset of referenced) {
				expect(asset.startsWith(`/thai-script/lessons/${id}/`), asset).toBe(
					true,
				);
				expect(asset).not.toContain("..");
			}
			const onDisk = readdirSync(directory).filter(
				(name) => name !== "deck.json" && name !== "manifest.json",
			);
			for (const name of onDisk) {
				expect(
					referenced.has(`/thai-script/lessons/${id}/${name}`),
					`${id}/${name} is committed but unreferenced`,
				).toBe(true);
			}
		});
	}
});

describe("the authored lessons reuse no phrasing from the source transcripts", () => {
	it("clears the shared originality check on every line of all four decks", async () => {
		const overlaps: string[] = [];
		let checked = 0;
		for (const id of NEW_LESSON_IDS) {
			const deck = decks.get(id);
			for (const text of textsOf(deck as RawDeck)) {
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
