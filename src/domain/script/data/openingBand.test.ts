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
import { classifyConsonant } from "./soundType";
import {
	consonants,
	lessons,
	type ThaiConsonant,
	ThaiSymbolClass,
} from "./symbols";

/**
 * Task 2.5's proof: the opening band, and the lesson that turns consonant
 * class from 44 memorised facts into two audible buckets plus a small residue.
 *
 * The band is six decks — the five this task authors (lessons 02-05 and
 * `lesson-sound-buckets`) plus `lesson-01` from task 1.4, which every check
 * here sweeps too, because "no symbol is used before it is taught" is a claim
 * about the band as a sequence and cannot be made one lesson at a time.
 *
 * Everything here reads the *committed* decks under `public/lessons/`, not a
 * fixture — the artefacts the app serves are the artefacts under test. The
 * lesson's rule is likewise read off the deck rather than restated here: the
 * third bucket's members come out of the slide that names them, so a lesson
 * that stopped naming one would stop being able to place it.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PUBLIC_LESSONS = join(REPO_ROOT, "public", "lessons");
const SCRIPTS = join(REPO_ROOT, "content", "lessons");

/** The slide whose body states which third-bucket letters are known so far. */
const THIRD_BUCKET_SLIDE = "bucket-three";
const BUCKETS_LESSON_ID = "lesson-sound-buckets";
/**
 * The first lesson still on the licensed video arm — the live end of the
 * strangler seam, which this test watches to prove the seam has two sides.
 *
 * It was `lesson-06` while the opening band was the only in-house band. Task
 * 3.3 moved lessons 06-11 onto the deck arm, so the video side now begins at
 * `lesson-12`; it moves again each time a later band is produced, and the
 * claim being made here is unchanged.
 */

interface BandLesson {
	readonly id: string;
	/**
	 * The `lessons`-table row this deck teaches, where there is one.
	 * `lesson-sound-buckets` has none: it introduces no symbol, so it declares
	 * no row, and the sequence entry that would give it one is owned by
	 * `lessonSequence.ts` (see the note on `describe("the content seam")`).
	 */
	readonly legacyNumber?: number;
}

/** Declaration order is the order the learner meets them. */
const BAND: readonly BandLesson[] = [
	{ id: "lesson-01", legacyNumber: 1 },
	{ id: "lesson-02", legacyNumber: 2 },
	{ id: "lesson-03", legacyNumber: 3 },
	{ id: "lesson-04", legacyNumber: 4 },
	{ id: "lesson-05", legacyNumber: 5 },
	{ id: BUCKETS_LESSON_ID },
];

type RawSlide = {
	kind: string;
	id: string;
	heading?: string;
	body?: string[];
	prompt?: string;
	answers?: string[];
	revealSlideId?: string;
	retrievalSlideId?: string;
	audio?: string[];
	image?: string;
	thai?: string;
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

/** Every piece of learner-facing prose on a deck, in slide order. */
function textsOf(deck: RawDeck): string[] {
	const texts: string[] = [deck.title];
	for (const slide of deck.slides) {
		if (slide.heading) texts.push(slide.heading);
		if (slide.prompt) texts.push(slide.prompt);
		// The reading panel. A slide that shows nothing but the script, large,
		// is where a symbol is most deliberately put in front of a learner —
		// so leaving it out here made a lesson look like it never used the
		// letter it spends three slides on.
		if (slide.thai) texts.push(slide.thai);
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

/** Runs of two or more Thai characters — words, as opposed to bare letters. */
function thaiWordsIn(texts: readonly string[]): Set<string> {
	const words = new Set<string>();
	for (const text of texts) {
		for (const run of text.match(THAI_RUN) ?? []) {
			if (run.length >= 2) words.add(run);
		}
	}
	return words;
}

/**
 * Symbols a `lessons` row declares. The table stores combining vowels with a
 * dotted-circle-free leading space (`" ี"`), so the Thai characters are pulled
 * out rather than the strings compared.
 */
function declaredSymbols(legacyNumber: number | undefined): Set<string> {
	// Three outcomes, not two. No `legacyNumber` means the lesson declares no
	// row at all (`lesson-sound-buckets`) and legitimately introduces nothing.
	// A `legacyNumber` whose row is missing is a broken band table, and it must
	// not arrive here as the same empty set: that would quietly make AC2's
	// "uses everything it declares" loop vacuous for that lesson.
	if (legacyNumber === undefined) return new Set();
	const row = lessons.find((lesson) => lesson.number === legacyNumber);
	if (!row) {
		throw new Error(
			`the band names lesson ${legacyNumber}, which the lessons table does not declare`,
		);
	}
	return thaiCharsIn([...row.consonants, ...row.vowels]);
}

/**
 * Symbols a lesson shows without teaching, declared in its script's own
 * comment block as `previews: <glyph> — <why>`. A deck may only reach outside
 * the taught set through one of these, and a declaration with no reason does
 * not count — which is what stops "previews:" becoming a blanket exemption.
 */
function declaredPreviews(id: string): Set<string> {
	const source = readFileSync(join(SCRIPTS, `${id}.md`), "utf-8");
	const previews = new Set<string>();
	for (const line of source.matchAll(/^previews:\s*(.+)$/gm)) {
		const body = line[1];
		if (body.trim() === "none") continue;
		const [glyphs, ...rest] = body.split("—");
		if (rest.join("—").trim().length === 0) continue;
		for (const ch of glyphs.match(THAI) ?? []) previews.add(ch);
	}
	return previews;
}

/** Sentences, split only on terminal punctuation so a clause keeps its glyphs. */
function sentencesOf(text: string): string[] {
	return text
		.split(/(?<=[.?!])\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * Does this sentence assign a consonant class? Both channels count: the words
 * "low/mid/high class", and the three district names, because a district *is*
 * the class said without the word (sceneGrammar.ts).
 */
const CLASS_CLAIM =
	/\b(?:low|mid|high)[\s-]?class\b|\b(?:temple|market|harbor)\b/i;

const vocabulary = vocabularyData as unknown as VocabEntry[];
const vocabularyByThai = new Set(vocabulary.map((entry) => entry.thai));

const decks = new Map(BAND.map((lesson) => [lesson.id, readDeck(lesson.id)]));

/**
 * Every symbol the band has taught by the end of each of its lessons —
 * vowels as well as consonants, since AC2 governs both. `consonantsTaughtInBand`
 * narrows it to the consonants where a check needs only those.
 */
const taughtAfter = new Map<string, Set<string>>();
{
	const running = new Set<string>();
	for (const lesson of BAND) {
		for (const ch of declaredSymbols(lesson.legacyNumber)) running.add(ch);
		taughtAfter.set(lesson.id, new Set(running));
	}
}

const consonantsTaughtInBand = [...(taughtAfter.get(BUCKETS_LESSON_ID) ?? [])]
	.map((ch) => consonants.find((c) => c.character === ch))
	.filter((c): c is ThaiConsonant => c !== undefined);

// ============================================================================
// The rule, as the lesson states it
// ============================================================================

type StatedRuleOutcome =
	| { placed: true; consonantClass: ThaiSymbolClass; bucket: string }
	| { placed: false; reason: string };

/**
 * Apply the derivable-buckets rule exactly as `lesson-sound-buckets` states
 * it. Buckets one and two come from the sound alone — `classifyConsonant`'s
 * own derivation, which reads `initialSound` and `isAspirated` and no table.
 * The third bucket is deliberately *not* derived: the lesson defers the split
 * and names the letters it has already taught, so this consults that list and
 * nothing else. A letter the lesson never names comes back unplaced.
 */
function classFromStatedRule(
	symbol: ThaiConsonant,
	namedLowInThirdBucket: ReadonlySet<string>,
): StatedRuleOutcome {
	const sound = classifyConsonant({
		character: symbol.character,
		initialSound: symbol.initialSound,
		isAspirated: symbol.isAspirated,
	});
	if (sound.state !== "classified") {
		return { placed: false, reason: sound.reason };
	}
	if (sound.soundType === "sonorant") {
		return {
			placed: true,
			consonantClass: ThaiSymbolClass.Low,
			bucket: "one — it can be hummed",
		};
	}
	if (sound.soundType === "unaspirated-obstruent") {
		return {
			placed: true,
			consonantClass: ThaiSymbolClass.Mid,
			bucket: "two — it stops and releases no breath",
		};
	}
	if (namedLowInThirdBucket.has(symbol.character)) {
		return {
			placed: true,
			consonantClass: ThaiSymbolClass.Low,
			bucket: "three — the lesson names it among the ones met so far",
		};
	}
	return {
		placed: false,
		reason: `bucket three, and the lesson presents nothing that places ${symbol.character}`,
	};
}

/** The third-bucket letters the buckets lesson itself claims are low class. */
function namedLowInThirdBucket(): Set<string> {
	const deck = decks.get(BUCKETS_LESSON_ID);
	const slide = deck?.slides.find((s) => s.id === THIRD_BUCKET_SLIDE);
	// An absent slide is not a lesson that names nobody. Both would return an
	// empty set and fail AC3, but only one of them is diagnosed correctly by
	// "the lesson presents nothing that places ช" — the other is a renamed
	// slide id, and it says so here instead of four letters down.
	if (!slide) {
		throw new Error(
			`${BUCKETS_LESSON_ID} has no "${THIRD_BUCKET_SLIDE}" slide, so the rule it states cannot be read off the deck`,
		);
	}
	const named = new Set<string>();
	for (const text of slide.body ?? []) {
		for (const sentence of sentencesOf(text)) {
			if (!/low[\s-]?class/i.test(sentence)) continue;
			for (const ch of sentence.match(THAI) ?? []) named.add(ch);
		}
	}
	return named;
}

// ============================================================================

/**
 * The seam, closed for five of the band's six lessons.
 *
 * `lesson-01` through `lesson-05` all have a `legacyNumber` already declared
 * in `lessonSequence.ts`, so wiring them onto the deck arm is a `DECK_LESSON_IDS`
 * addition with no effect on lesson position or the five-store identity join
 * (CONTEXT.md Rule 1). `lesson-sound-buckets` does not: it introduces no
 * symbol of its own, so it has no row in the legacy lessons table and no
 * `legacyNumber` to join on, and deciding how a legacy-less lesson takes a
 * position in the sequence is exactly the kind of migration decision that
 * belongs with the task that owns `lessonSequence.ts`'s identity semantics —
 * not a one-line addition made in passing here. Its deck is committed and
 * schema-valid at the path the deck arm would serve it from, but it stays
 * undeclared and unreachable from any route until that decision is made.
 */
describe("the content seam", () => {
	it("has a committed, schema-valid deck at the exact path the deck arm serves, for every band lesson", () => {
		for (const { id } of BAND) {
			const path = deckPathForLesson(id);
			expect(path).toEqual({
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

	// AC1 — every band lesson that has a place in the declared sequence
	// resolves to the deck arm. `lesson-sound-buckets` is the one exception,
	// named above, and is asserted separately as still-undeclared rather than
	// silently skipped here.
	it("resolves every band lesson with a declared sequence position to the deck arm", () => {
		for (const { id, legacyNumber } of BAND) {
			if (legacyNumber === undefined) continue;
			const resolution = resolveLessonContent(id);
			expect(resolution.status, id).toBe("resolved");
			if (resolution.status !== "resolved") continue;
			expect(resolution.content.kind, id).toBe("deck");
		}
	});

	it("leaves lesson-sound-buckets undeclared until its sequence position is decided", () => {
		expect(resolveLessonContent(BUCKETS_LESSON_ID).status).toBe("undeclared");
	});

	it("serves every declared lesson from the deck arm — task 4.3 closed the video side of the seam", () => {
		for (const entry of lessonSequence) {
			expect(DECK_LESSON_IDS.has(entry.id), entry.id).toBe(true);
		}
	});

	it("never registers a lesson on the deck arm without a deck to serve", () => {
		expect(DECK_LESSON_IDS.size).toBeGreaterThan(0);
		for (const id of DECK_LESSON_IDS) {
			expect(existsSync(join(lessonDir(id), "deck.json")), id).toBe(true);
			const resolution = resolveLessonContent(id);
			expect(resolution.status, id).toBe("resolved");
			if (resolution.status !== "resolved") continue;
			expect(resolution.content.kind, id).toBe("deck");
		}
	});
});

describe("the band's symbol coverage", () => {
	it("introduces exactly the symbols each lesson declares, and reaches outside the taught set only through a declared preview", () => {
		for (const lesson of BAND) {
			const deck = decks.get(lesson.id);
			expect(deck, lesson.id).toBeDefined();
			if (!deck) continue;

			const used = thaiCharsIn(textsOf(deck));
			const declared = declaredSymbols(lesson.legacyNumber);
			const taught = taughtAfter.get(lesson.id) ?? new Set();
			const previews = declaredPreviews(lesson.id);

			for (const ch of declared) {
				expect(
					used.has(ch),
					`${lesson.id} declares ${ch} but never uses it`,
				).toBe(true);
			}
			for (const ch of used) {
				const known = taught.has(ch) || previews.has(ch);
				expect(
					known,
					`${lesson.id} uses ${ch}, which is neither taught by this point nor declared as a preview with a reason`,
				).toBe(true);
			}
		}
	});
});

describe("the derivable-buckets lesson", () => {
	it("derives the class of every consonant taught so far from the rule it states", () => {
		const named = namedLowInThirdBucket();
		expect(consonantsTaughtInBand.length).toBe(12);

		for (const symbol of consonantsTaughtInBand) {
			const outcome = classFromStatedRule(symbol, named);
			if (!outcome.placed) {
				throw new Error(
					`the lesson cannot place ${symbol.character} (${symbol.nameRomanized}): ${outcome.reason}`,
				);
			}
			expect(
				outcome.consonantClass,
				`${symbol.character} via bucket ${outcome.bucket}`,
			).toBe(symbol.classType);
		}

		// Eight of the twelve come from sound alone; the rule is not a list
		// wearing a rule's clothes. The other four are exactly the ones that
		// stop being placeable once the lesson's own list is taken away, which
		// is what makes the third branch depend on the lesson rather than on
		// this test knowing the answer.
		const derivedFromSoundAlone = consonantsTaughtInBand.filter(
			(symbol) => classFromStatedRule(symbol, new Set()).placed,
		);
		expect(derivedFromSoundAlone.length).toBe(8);
	});

	it("claims no class for a letter the sequence has not yet taught", () => {
		const taught = taughtAfter.get(BUCKETS_LESSON_ID) ?? new Set();
		const deck = decks.get(BUCKETS_LESSON_ID);
		expect(deck).toBeDefined();
		if (!deck) return;

		let claimsChecked = 0;
		for (const text of textsOf(deck)) {
			for (const sentence of sentencesOf(text)) {
				if (!CLASS_CLAIM.test(sentence)) continue;
				claimsChecked += 1;
				for (const ch of sentence.match(THAI) ?? []) {
					expect(
						taught.has(ch),
						`the buckets lesson assigns a class alongside ${ch}, which the sequence has not taught yet: "${sentence}"`,
					).toBe(true);
				}
			}
		}
		// The lesson is about class, so it had better be making claims.
		expect(claimsChecked).toBeGreaterThan(0);

		// It names the third bucket as existing and unresolved without
		// asserting who is on the far side of it.
		const bucketThree = deck.slides.find((s) => s.id === THIRD_BUCKET_SLIDE);
		expect(bucketThree).toBeDefined();
		expect((bucketThree?.body ?? []).join(" ")).toMatch(/split/i);

		// Not vacuous: the detector really does catch a class claim about an
		// untaught letter. ผ is high class and is taught at lesson 14, nine
		// lessons past this one.
		const planted = "ผ is a high class letter.";
		const [sentence] = sentencesOf(planted);
		expect(CLASS_CLAIM.test(sentence)).toBe(true);
		expect(
			[...(sentence.match(THAI) ?? [])].some((ch) => !taught.has(ch)),
		).toBe(true);
	});
});

describe("the band's example words", () => {
	it("resolves every Thai example word against vocabulary.json, or a declared teaching word", () => {
		let total = 0;
		for (const lesson of BAND) {
			const deck = decks.get(lesson.id);
			if (!deck) continue;
			// AC5's second arm. Nothing emits `teachingWords` today —
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
				expect(
					vocabularyByThai.has(word) || teaching.has(word),
					`${lesson.id}: ${word} is neither in vocabulary.json nor a declared teaching word`,
				).toBe(true);
			}
		}
		expect(total).toBeGreaterThan(0);
		// Prove the corpus itself loaded, so the branch above is not passing
		// because the lookup set came back empty.
		expect(vocabularyByThai.has("พูด")).toBe(true);
	});
});

describe("the band's narration", () => {
	it("clears the shared originality check on every line of every band deck", async () => {
		let checked = 0;
		// Every line is reported, not just the first: a rewrite pass wants the
		// whole list, and one-at-a-time turns an editing job into a bisect.
		const overlaps: string[] = [];
		for (const lesson of BAND) {
			const deck = decks.get(lesson.id);
			if (!deck) continue;
			for (const text of textsOf(deck)) {
				const result = await checkOriginality(text);
				if (result.status === "overlapping") {
					overlaps.push(
						`${lesson.id}: "${result.overlap.ngram}" (${result.overlap.sources.join(", ")}) in "${text}"`,
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

describe("the band's assets", () => {
	it("references only assets that exist inside the lesson's own directory, and leaves none unreferenced", () => {
		for (const lesson of BAND) {
			const deck = decks.get(lesson.id);
			if (!deck) continue;
			const manifest = readManifest(lesson.id);
			expect(manifest.lessonId).toBe(lesson.id);

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
					path.startsWith(`/thai-script/lessons/${lesson.id}/`),
					`${lesson.id}: ${path} escapes the lesson's own directory`,
				).toBe(true);
				expect(
					existsSync(
						join(REPO_ROOT, "public", path.replace("/thai-script/", "")),
					),
					`${lesson.id}: ${path} is referenced but absent`,
				).toBe(true);
			}

			// The other direction: nothing sitting in the lesson directory is
			// unaccounted for. These decks carry no narration audio yet — no
			// ELEVENLABS_API_KEY was available, and the scripts declare no
			// `narration:` lines, so the pipeline ran for real with zero
			// segments rather than skipping any. This half of the check is
			// what notices if a stray file is ever committed beside them.
			const onDisk = readdirSync(lessonDir(lesson.id));
			for (const entry of onDisk) {
				if (entry === "deck.json" || entry === "manifest.json") continue;
				const files = readdirSync(join(lessonDir(lesson.id), entry));
				for (const file of files) {
					const url = `/thai-script/lessons/${lesson.id}/${entry}/${file}`;
					expect(
						referenced.has(url),
						`${lesson.id}: ${url} is on disk but nothing references it`,
					).toBe(true);
				}
			}
		}
	});
});

describe("the band's retrieval practice", () => {
	it("asks the learner to attempt an answer before every reveal, on every band deck", () => {
		for (const lesson of BAND) {
			const deck = decks.get(lesson.id);
			expect(deck, lesson.id).toBeDefined();
			if (!deck) continue;

			const retrievals = deck.slides.filter((s) => s.kind === "retrieval");
			const reveals = deck.slides.filter((s) => s.kind === "reveal");
			expect(
				retrievals.length,
				`${lesson.id} has no retrieval step`,
			).toBeGreaterThan(0);
			expect(reveals.length, lesson.id).toBe(retrievals.length);

			const seen = new Set<string>();
			for (const slide of deck.slides) {
				if (slide.kind === "retrieval") {
					seen.add(slide.id);
					// The prompt must not carry its own answer.
					expect(slide.revealSlideId, `${lesson.id}/${slide.id}`).toBeTruthy();
					expect("answers" in slide, `${lesson.id}/${slide.id}`).toBe(false);
					continue;
				}
				if (slide.kind !== "reveal") continue;
				expect(
					seen.has(slide.retrievalSlideId ?? ""),
					`${lesson.id}: reveal ${slide.id} comes before the retrieval it answers`,
				).toBe(true);
			}
		}
	});
});
