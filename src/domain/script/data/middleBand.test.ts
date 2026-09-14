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
import { lessonSequence } from "./lessonSequence";
import { checkOriginality } from "./originality";
import { conditionalFormFor, districtForClass } from "./sceneGrammar";
import {
	consonants,
	type Lesson,
	lessons,
	type ThaiConsonant,
	ThaiSymbolClass,
} from "./symbols";

/**
 * Task 3.3's proof: the middle band, lessons 06 through 11.
 *
 * Three things are checked here that could not be checked one lesson at a
 * time. The forward-reference check (AC3) sweeps the **whole declared
 * sequence** up to the end of the band, because a lesson using a symbol taught
 * later is a property of the ordering and every lesson passes it individually.
 * The cousin-pair check reads its inventory out of the consonant table's sound
 * groups rather than out of a list written here, so a pair that vanishes from
 * the data fails rather than quietly shrinking the claim. And the example-word
 * check resolves against `vocabulary.json` and the rank window each lesson
 * declares, so "worth knowing" is a query rather than an opinion.
 *
 * Everything reads the *committed* artefacts under `public/lessons/` and the
 * *committed* scripts under `content/lessons/` — what the app serves is what is
 * under test.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PUBLIC_LESSONS = join(REPO_ROOT, "public", "lessons");
const SCRIPTS = join(REPO_ROOT, "content", "lessons");

/** The slide whose bullets carry the pair inventory. */
const PAIR_SLIDE = "cousin-pairs";
const PAIR_LESSON_ID = "lesson-07";
/** The first lesson after the middle band. Still on the licensed video arm. */
const FIRST_LESSON_AFTER_BAND = "lesson-12";

/** Declaration order is the order the learner meets them. */
const BAND: readonly string[] = [
	"lesson-06",
	"lesson-07",
	"lesson-08",
	"lesson-09",
	"lesson-10",
	"lesson-11",
];

type RawSlide = {
	kind: string;
	id: string;
	heading?: string;
	body?: string[];
	prompt?: string;
	answers?: string[];
	ruleId?: string;
	revealSlideId?: string;
	retrievalSlideId?: string;
	audio?: string[];
	image?: string;
};
type RawDeck = {
	lessonId: string;
	title: string;
	slides: RawSlide[];
	teachingWords?: { thai: string; reason: string }[];
};
type Manifest = { lessonId: string; assets: { path: string | null }[] };

const THAI = /[฀-๿]/g;
const THAI_RUN = /[฀-๿]+/g;
const THAI_CONSONANT = /[ก-ฮ]/;

function lessonDir(id: string): string {
	return join(PUBLIC_LESSONS, id);
}

function readDeck(id: string): RawDeck {
	return JSON.parse(
		readFileSync(join(lessonDir(id), "deck.json"), "utf-8"),
	) as RawDeck;
}

function readManifest(id: string): Manifest {
	return JSON.parse(
		readFileSync(join(lessonDir(id), "manifest.json"), "utf-8"),
	) as Manifest;
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
 * Runs of two or more Thai characters that contain at least one consonant —
 * words, as opposed to bare symbols and vowel patterns.
 *
 * The consonant requirement is what lets a lesson print a vowel pattern. One
 * of the band's patterns puts two Thai characters on one side of its
 * placeholder hyphen — สระ เอาะ, written `เ-าะ`, whose tail `าะ` is the only
 * vowel-only run of length two the six decks produce. A run made of nothing
 * but vowel signs and diacritics is never a word, so requiring a consonant
 * costs the check nothing and buys the lesson the ability to print the
 * pattern it teaches.
 */
function thaiWordsIn(texts: readonly string[]): Set<string> {
	const words = new Set<string>();
	for (const text of texts) {
		for (const run of text.match(THAI_RUN) ?? []) {
			if (run.length >= 2 && THAI_CONSONANT.test(run)) words.add(run);
		}
	}
	return words;
}

// ============================================================================
// What a lesson declares, and the three channels it can declare through
// ============================================================================

/**
 * The `lessons` row a sequence entry joins to.
 *
 * An absent row throws rather than coming back empty, and both readers below
 * go through here so neither can render the failure as a confident nothing:
 * "this lesson declares no symbol" and "this lesson has no row" are both a set
 * of size zero, and only the second is a broken table. Returning empty would
 * make the "uses everything it declares" loop vacuous for that lesson instead
 * of failing it.
 */
function lessonRow(legacyNumber: number): Lesson {
	const row = lessons.find((lesson) => lesson.number === legacyNumber);
	if (!row) {
		throw new Error(
			`the band names lesson ${legacyNumber}, which the lessons table does not declare`,
		);
	}
	return row;
}

/**
 * Symbols a `lessons` row declares — the set the lesson must actually use.
 * The table stores combining vowels with a leading space (`" ี"`) and vowel
 * patterns with a hyphen placeholder (`"เ-ะ"`), so the Thai characters are
 * pulled out rather than the strings compared.
 */
function declaredSymbols(legacyNumber: number): Set<string> {
	const row = lessonRow(legacyNumber);
	return thaiCharsIn([
		...row.consonants,
		...row.vowels,
		// Tone marks count. No band row declares one, but the sequence-wide
		// sweep reaches the lessons that do, and leaving them out would report
		// the promoted lessons at positions 27 and 28 as forward-referencing
		// ่ and ้ — taught at positions 17 and 18.
		...row.toneMarks,
	]);
}

/**
 * Characters a lesson teaches as a *consequence* of a vowel it declares.
 *
 * A vowel's written form changes when a final consonant follows, and those
 * forms are data (`conditionalVowelForms`, extracted from mnemonic prose by
 * task 3.1's sibling in phase 2). Two of them matter to the band, and for
 * different reasons. สระ เอะ becomes a ็ roof, and ็ is listed by no `lessons`
 * row at all — the conditional form is the only place it is declared. สระ อือ
 * has to be propped by อ when the syllable ends bare, and อ *is* listed, by
 * row 11 — five lessons after row 6 teaches the vowel that needs it. A lesson
 * that teaches the vowel teaches its conditional form with it, so both arrive
 * with the row rather than needing a declaration of their own, and because
 * they are derived a change to the form data moves what the lesson may use.
 */
function conditionalSymbols(legacyNumber: number): Set<string> {
	const row = lessonRow(legacyNumber);
	const forms: string[] = [];
	for (const vowel of row.vowels) {
		const form = conditionalFormFor(vowel);
		if (!form) continue;
		forms.push(form.openForm, form.withFinalForm);
		for (const exception of form.exceptions ?? []) forms.push(exception.form);
	}
	return thaiCharsIn(forms);
}

/**
 * A `<glyphs> — <reason>` declaration in a lesson script's comment block.
 * A declaration with no reason does not count, which is what stops either
 * channel becoming a blanket exemption.
 *
 * An absent key and `previews: none` both come back empty, which is why the
 * band is separately required to state the line — see `declaresPreviewLine`.
 * Without that, a script whose author never considered previews and one that
 * considered them and found none are the same thing to this function.
 */
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

/** Whether a script states the `previews:` line at all, `none` included. */
function declaresPreviewLine(id: string): boolean {
	return /^previews:\s*\S/m.test(readScript(id));
}

/**
 * The `ranks: <lo>-<hi>` window a lesson script declares for its examples.
 *
 * Absent is an error, not an open window: a lesson with no declared window
 * would pass the rank check by having nothing to compare against.
 */
function declaredRankWindow(id: string): { lo: number; hi: number } {
	const matched = readScript(id).match(/^ranks:\s*(\d+)\s*-\s*(\d+)\s*$/m);
	if (!matched) {
		throw new Error(`${id} declares no rank window for its example words`);
	}
	return { lo: Number(matched[1]), hi: Number(matched[2]) };
}

// ============================================================================
// The sequence, swept once
// ============================================================================

/**
 * Every lesson with a deck, in declared sequence order, with the legacy number
 * its symbols are filed under. Read off `lessonSequence` rather than listed
 * here so that AC3 keeps meaning "no forward reference in the sequence as
 * declared" after phase 4 moves something.
 */
const DECKED_SEQUENCE = lessonSequence.filter((entry) =>
	DECK_LESSON_IDS.has(entry.id),
);

const decks = new Map(
	DECKED_SEQUENCE.map((entry) => [entry.id, readDeck(entry.id)] as const),
);

/**
 * Every symbol taught by the end of each lesson, cumulatively, across the
 * **whole** declared sequence rather than the decked part of it.
 *
 * A symbol is taught at its lesson's position whether or not that lesson has
 * an in-house deck yet. Walking only the decked lessons would make lessons
 * 12-25 invisible and report the three promoted lessons at positions 26-28 as
 * forward-referencing every high-class letter — which is the ordering being
 * read wrong, not a lesson using a symbol early.
 */
const taughtAfter = new Map<string, Set<string>>();
{
	const running = new Set<string>();
	for (const entry of lessonSequence) {
		for (const ch of declaredSymbols(entry.legacyNumber)) running.add(ch);
		for (const ch of conditionalSymbols(entry.legacyNumber)) running.add(ch);
		if (DECK_LESSON_IDS.has(entry.id)) {
			for (const ch of declarationsOf(entry.id, "teaches")) running.add(ch);
		}
		taughtAfter.set(entry.id, new Set(running));
	}
}

// ============================================================================
// Cousin pairs, derived from the sound groups
// ============================================================================

/** The leading phoneme token of a stored `initialSound`, e.g. `"kh (…)"`. */
function phonemeOf(symbol: ThaiConsonant): string | null {
	const matched = symbol.initialSound.match(/^([a-z]+)/i);
	return matched ? matched[1].toLowerCase() : null;
}

interface CousinPair {
	readonly phoneme: string;
	readonly high: readonly string[];
	readonly low: readonly string[];
}

/**
 * The sounds Thai writes with both a high-class and a low-class letter.
 *
 * Derived by grouping the consonant table on its sound and keeping the groups
 * that straddle two districts — never listed. A list compiled by hand weighs
 * salience and drops ฮ, which is one character in ten thousand of running
 * text; dropping ฮ drops the ห pair with it, and ห is the fourth commonest
 * syllable initial in the language.
 */
function cousinPairs(inventory: readonly ThaiConsonant[]): CousinPair[] {
	const groups = new Map<string, { high: string[]; low: string[] }>();
	for (const symbol of inventory) {
		const phoneme = phonemeOf(symbol);
		if (phoneme === null) continue;
		const group = groups.get(phoneme) ?? { high: [], low: [] };
		if (symbol.classType === ThaiSymbolClass.High)
			group.high.push(symbol.character);
		else if (symbol.classType === ThaiSymbolClass.Low)
			group.low.push(symbol.character);
		groups.set(phoneme, group);
	}
	return [...groups.entries()]
		.filter(([, group]) => group.high.length > 0 && group.low.length > 0)
		.map(([phoneme, group]) => ({ phoneme, high: group.high, low: group.low }));
}

/**
 * The district claims on one pair bullet: every `<glyph> is <district>` it
 * makes. The lesson states the pairing in prose the learner reads, and this
 * reads the same sentence back — so deleting a bullet deletes the claim.
 */
function districtClaims(bullet: string): { glyph: string; district: string }[] {
	return [...bullet.matchAll(/([฀-๿])\s+is\s+(temple|market|harbor)\b/g)].map(
		(m) => ({ glyph: m[1], district: m[2] }),
	);
}

function pairSlideBullets(): string[] {
	const deck = decks.get(PAIR_LESSON_ID);
	const slide = deck?.slides.find((candidate) => candidate.id === PAIR_SLIDE);
	// An absent slide is not a lesson that claims no pairs. Both would produce
	// an empty list, but only one of them is a renamed slide id, and it says so
	// here rather than seven assertions later.
	if (!slide) {
		throw new Error(
			`${PAIR_LESSON_ID} has no "${PAIR_SLIDE}" slide, so the pair inventory cannot be read off the deck`,
		);
	}
	return (slide.body ?? []).filter(
		(bullet) => districtClaims(bullet).length > 0,
	);
}

const vocabulary = vocabularyData as unknown as VocabEntry[];
const vocabularyByThai = new Map(
	vocabulary.map((entry) => [entry.thai, entry]),
);

// ============================================================================

describe("the middle band's content seam", () => {
	it("has a committed, schema-valid deck at the exact path the deck arm serves", () => {
		for (const id of BAND) {
			expect(deckPathForLesson(id)).toEqual({
				ok: true,
				path: `/thai-script/lessons/${id}/deck.json`,
			});
			expect(existsSync(join(lessonDir(id), "deck.json")), id).toBe(true);

			const result = validateDeck(decks.get(id));
			if (!result.ok) {
				throw new Error(
					`${id} deck rejected: ${result.errors.map((e) => e.message).join("; ")}`,
				);
			}
			expect(result.deck.lessonId).toBe(id);
		}
	});

	// AC1.
	it("resolves every middle-band lesson to the deck arm", () => {
		for (const id of BAND) {
			const resolution = resolveLessonContent(id);
			expect(resolution.status, id).toBe("resolved");
			if (resolution.status !== "resolved") continue;
			expect(resolution.content.kind, id).toBe("deck");
		}
	});

	it("leaves the first lesson after the band on the video arm", () => {
		expect(DECK_LESSON_IDS.has(FIRST_LESSON_AFTER_BAND)).toBe(false);
		const resolution = resolveLessonContent(FIRST_LESSON_AFTER_BAND);
		expect(resolution.status).toBe("resolved");
		if (resolution.status !== "resolved") return;
		expect(resolution.content.kind).toBe("video");
	});
});

describe("the middle band's symbol coverage", () => {
	// AC2, both directions.
	it("introduces exactly the symbols each lesson declares", () => {
		for (const id of BAND) {
			const entry = lessonSequence.find((candidate) => candidate.id === id);
			expect(entry, id).toBeDefined();
			if (!entry) continue;
			const deck = decks.get(id);
			expect(deck, id).toBeDefined();
			if (!deck) continue;

			const used = thaiCharsIn(textsOf(deck));
			for (const ch of declaredSymbols(entry.legacyNumber)) {
				expect(used.has(ch), `${id} declares ${ch} but never uses it`).toBe(
					true,
				);
			}
			// The other direction is the sequence-wide check below: "exactly"
			// means nothing extra either, and "extra" can only be judged
			// against what the whole sequence has taught by this point.
			for (const ch of declarationsOf(id, "teaches")) {
				expect(used.has(ch), `${id} declares ${ch} but never uses it`).toBe(
					true,
				);
				expect(
					declaredSymbols(entry.legacyNumber).has(ch),
					`${id} declares ${ch} through "teaches:" and through its lessons row; one channel is enough`,
				).toBe(false);
			}
		}
	});

	/**
	 * The escape hatch AC3 honours has to be a decision, not a silence.
	 * `declarationsOf` returns an empty set for a script that says
	 * `previews: none` and for one that never mentions previews at all, so the
	 * band is required to state the line either way. Its own check rather than
	 * a rider on AC3's: that assertion is about symbols, and the two failures
	 * want different repairs.
	 */
	it("states the previews line on every band script, none included", () => {
		for (const id of BAND) {
			expect(
				declaresPreviewLine(id),
				`${id} states no previews: line, so nothing records whether its author considered one`,
			).toBe(true);
		}
	});

	// AC3 — swept across the declared sequence, not per lesson.
	it("never uses a symbol the sequence teaches later", () => {
		const offences: string[] = [];
		for (const entry of DECKED_SEQUENCE) {
			const deck = decks.get(entry.id);
			if (!deck) continue;
			const taught = taughtAfter.get(entry.id) ?? new Set();
			const previews = declarationsOf(entry.id, "previews");
			for (const ch of thaiCharsIn(textsOf(deck))) {
				if (taught.has(ch) || previews.has(ch)) continue;
				offences.push(
					`${entry.id} (position ${entry.position}) uses ${ch}, which is neither taught by this point nor previewed with a reason`,
				);
			}
		}
		expect(offences, offences.join("\n")).toEqual([]);
		// Not vacuous: the sweep really did look at every decked lesson, and
		// the band is the tail of it.
		expect(DECKED_SEQUENCE.map((entry) => entry.id)).toEqual(
			expect.arrayContaining(BAND),
		);
	});
});

describe("the cousin pairs", () => {
	it("introduces every high/low pair the sound groups hold, each in one lesson, in two districts", () => {
		const derived = cousinPairs(consonants);
		const bullets = pairSlideBullets();
		expect(
			bullets.length,
			"the pair slide states no pairs at all",
		).toBeGreaterThan(0);

		const covered = new Set<string>();
		for (const bullet of bullets) {
			const claims = districtClaims(bullet);
			expect(
				claims.length,
				`pair bullet names ${claims.length} letters: ${bullet}`,
			).toBe(2);

			const pair = derived.find((candidate) =>
				claims.every(
					(claim) =>
						candidate.high.includes(claim.glyph) ||
						candidate.low.includes(claim.glyph),
				),
			);
			expect(
				pair,
				`"${bullet}" names two letters that are not one sound group's high and low halves`,
			).toBeDefined();
			if (!pair) continue;

			for (const claim of claims) {
				const symbol = consonants.find((c) => c.character === claim.glyph);
				expect(symbol, claim.glyph).toBeDefined();
				if (!symbol) continue;
				expect(
					districtForClass(symbol.classType),
					`${claim.glyph} is staged in the wrong district`,
				).toBe(claim.district);
			}
			expect(
				new Set(claims.map((claim) => claim.district)).size,
				`both halves of the ${pair.phoneme} pair are in the same district: ${bullet}`,
			).toBe(2);

			expect(
				covered.has(pair.phoneme),
				`the ${pair.phoneme} pair is claimed twice`,
			).toBe(false);
			covered.add(pair.phoneme);
		}

		// Derived, not listed: every sound group that straddles two districts
		// is claimed, and nothing else is.
		expect([...covered].sort()).toEqual(
			derived.map((pair) => pair.phoneme).sort(),
		);
		expect(derived.length).toBe(7);
		// ห↔ฮ is the pair a list compiled by salience drops.
		expect(derived.some((pair) => pair.high.includes("ห"))).toBe(true);
	});

	it("derives the pairs from the data: a sound group with no low half is not a pair", () => {
		const withoutHaaw = consonants.filter((symbol) => symbol.character !== "ฮ");
		const derived = cousinPairs(withoutHaaw);
		expect(derived.length).toBe(6);
		expect(derived.some((pair) => pair.high.includes("ห"))).toBe(false);
	});
});

describe("the middle band's example words", () => {
	// AC4.
	it("resolves every Thai example word inside the lesson's declared rank window", () => {
		let total = 0;
		const offences: string[] = [];
		for (const id of BAND) {
			const deck = decks.get(id);
			if (!deck) continue;
			const window = declaredRankWindow(id);
			// The second arm. Nothing emits `teachingWords` today —
			// `scripts/lesson_deck/pipeline.py`'s `_deck_json` writes lessonId,
			// title and slides and nothing else — so every band word resolves
			// through vocabulary.json and this set is always empty. Read: a
			// lesson script cannot yet declare a teaching word, and adding one
			// means teaching the generator to carry it through.
			const teaching = new Set(
				(deck.teachingWords ?? [])
					.filter((word) => word.reason.trim().length > 0)
					.map((word) => word.thai),
			);
			for (const word of thaiWordsIn(textsOf(deck))) {
				total += 1;
				if (teaching.has(word)) continue;
				const entry = vocabularyByThai.get(word);
				if (!entry) {
					offences.push(
						`${id}: ${word} is neither in vocabulary.json nor a declared teaching word`,
					);
					continue;
				}
				if (
					entry.rank === null ||
					entry.rank < window.lo ||
					entry.rank > window.hi
				) {
					offences.push(
						`${id}: ${word} ranks ${entry.rank}, outside the declared window ${window.lo}-${window.hi}`,
					);
				}
			}
		}
		expect(offences, offences.join("\n")).toEqual([]);
		expect(total).toBeGreaterThan(0);
		// Prove the corpus loaded, so the lookups above are not passing on an
		// empty map.
		expect(vocabularyByThai.get("คน")?.rank).toBe(47);
	});

	it("is not vacuous: a word outside the window fails unless it is declared", () => {
		const window = declaredRankWindow(BAND[0]);
		const rare = vocabulary.find(
			(entry) => entry.rank !== null && entry.rank > window.hi,
		);
		expect(rare, "the corpus holds nothing outside the window").toBeDefined();
		if (!rare) return;
		const outside =
			rare.rank !== null && (rare.rank < window.lo || rare.rank > window.hi);
		expect(outside).toBe(true);
		// …and the declared-teaching-word arm is what lets one through.
		const teaching = new Set([rare.thai]);
		expect(teaching.has(rare.thai)).toBe(true);
	});
});

describe("the middle band's narration", () => {
	// AC5.
	it("clears the shared originality check on every line of every band deck", async () => {
		let checked = 0;
		const overlaps: string[] = [];
		for (const id of BAND) {
			const deck = decks.get(id);
			if (!deck) continue;
			for (const text of textsOf(deck)) {
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

	it("the check is not vacuous: a known paraphrase from the source is still caught", async () => {
		// The canary from task 1.5's corpus — kept here to prove the corpus is
		// loaded, not as content, and rendered nowhere.
		const knownParaphrase =
			"Think of a coffee mug with a broken handle. The head on top and loop on the bottom are where the handle used to be attached.";
		const result = await checkOriginality(knownParaphrase);
		expect(result.status).toBe("overlapping");
	});
});

describe("the middle band's assets", () => {
	// AC6.
	it("references only assets that exist inside the lesson's own directory, and leaves none unreferenced", () => {
		for (const id of BAND) {
			const deck = decks.get(id);
			expect(deck, id).toBeDefined();
			if (!deck) continue;
			const manifest = readManifest(id);
			expect(manifest.lessonId).toBe(id);

			const referenced = new Set<string>();
			for (const slide of deck.slides) {
				for (const path of slide.audio ?? []) referenced.add(path);
				if (slide.image) referenced.add(slide.image);
			}
			for (const asset of manifest.assets) {
				if (asset.path) referenced.add(asset.path);
			}

			for (const path of referenced) {
				expect(
					path.startsWith(`/thai-script/lessons/${id}/`),
					`${id}: ${path} escapes the lesson's own directory`,
				).toBe(true);
				expect(
					existsSync(
						join(REPO_ROOT, "public", path.replace("/thai-script/", "")),
					),
					`${id}: ${path} is referenced but absent`,
				).toBe(true);
			}

			// The other direction: nothing sitting in the lesson directory is
			// unaccounted for. These decks carry no narration audio — no
			// ELEVENLABS_API_KEY was available, and the scripts declare no
			// `narration:` lines, so the pipeline ran for real with zero
			// segments rather than skipping any. This half is what notices a
			// stray file committed beside them.
			for (const child of readdirSync(lessonDir(id))) {
				if (child === "deck.json" || child === "manifest.json") continue;
				for (const file of readdirSync(join(lessonDir(id), child))) {
					const url = `/thai-script/lessons/${id}/${child}/${file}`;
					expect(
						referenced.has(url),
						`${id}: ${url} is on disk but nothing references it`,
					).toBe(true);
				}
			}
		}
	});
});

describe("the middle band's retrieval practice", () => {
	it("asks the learner to attempt an answer before every reveal", () => {
		for (const id of BAND) {
			const deck = decks.get(id);
			expect(deck, id).toBeDefined();
			if (!deck) continue;

			const retrievals = deck.slides.filter((s) => s.kind === "retrieval");
			const reveals = deck.slides.filter((s) => s.kind === "reveal");
			expect(retrievals.length, `${id} has no retrieval step`).toBeGreaterThan(
				0,
			);
			expect(reveals.length, id).toBe(retrievals.length);

			const seen = new Set<string>();
			for (const slide of deck.slides) {
				if (slide.kind === "retrieval") {
					seen.add(slide.id);
					expect(slide.revealSlideId, `${id}/${slide.id}`).toBeTruthy();
					expect("answers" in slide, `${id}/${slide.id}`).toBe(false);
					continue;
				}
				if (slide.kind !== "reveal") continue;
				expect(
					seen.has(slide.retrievalSlideId ?? ""),
					`${id}: reveal ${slide.id} comes before the retrieval it answers`,
				).toBe(true);
			}
		}
	});
});
