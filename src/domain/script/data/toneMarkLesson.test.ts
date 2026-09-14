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
import { lessonEntryById, lessonSequence } from "./lessonSequence";
import { checkOriginality } from "./originality";
import { ThaiSymbolClass, type ToneValue, toneRules } from "./symbols";
import {
	buildToneMarkTable,
	TONE_MARK_NAMES,
	type ToneMarkName,
} from "./toneMarkTable";

/**
 * Task 4.2's proof: the eight-cell tone-mark table, taught as one lesson.
 *
 * The load-bearing decision, same as task 3.2's: the resolver AC3 runs is
 * parameterised entirely by facts pulled out of the committed deck's own
 * prose, never by importing `toneMarkTable.ts`. Resolving a marked corpus
 * word against `toneMarkTable.ts` would pass in exactly the case this task
 * exists to catch — a lesson that states a cell incompletely while the
 * underlying data (already proven correct by task 4.1) is fine.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PUBLIC_LESSONS = join(REPO_ROOT, "public", "lessons");

const LESSON_ID = "lesson-tone-marks";

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

function readDeck(id: string): RawDeck {
	return JSON.parse(
		readFileSync(join(PUBLIC_LESSONS, id, "deck.json"), "utf-8"),
	) as RawDeck;
}

const deck = readDeck(LESSON_ID);

function slide(slideId: string): RawSlide {
	const found = deck.slides.find((s) => s.id === slideId);
	if (!found) throw new Error(`${LESSON_ID}: no slide "${slideId}"`);
	return found;
}

function bodyOf(slideId: string): string[] {
	return slide(slideId).body ?? [];
}

function textOf(slideId: string): string {
	const found = slide(slideId);
	return [found.heading ?? "", ...(found.body ?? [])].join(" ");
}

/** Every piece of learner-facing prose on the deck, in slide order. */
function textsOf(): string[] {
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
// Reading the twelve cells off the lesson's own three class slides
// ============================================================================

const CLASS_SLIDES: Readonly<Record<ThaiSymbolClass, string>> = {
	[ThaiSymbolClass.Mid]: "mid-class-marks",
	[ThaiSymbolClass.High]: "high-class-marks",
	[ThaiSymbolClass.Low]: "low-class-marks",
};

const MARK_SUFFIX: Readonly<Record<string, ToneMarkName>> = {
	ek: "mai ek",
	tho: "mai tho",
	tri: "mai tri",
	chattawa: "mai chattawa",
};

const CELL_LINE =
	/mai (ek|tho|tri|chattawa)\b[^.]*?\bgives\b[^.]*?\b(low|falling|high|rising)\b/i;

const UNREACHABLE_LINE =
	/mai tri and mai chattawa never sit over a (?:temple|harbor) letter/i;

/**
 * The resolved cells stated on one class's slide — read fresh on every call so
 * a test can mutate the committed deck's slide body in place and see the
 * derivation react, rather than caching a snapshot the mutation can't reach.
 */
function resolvedCellsFromLesson(
	consonantClass: ThaiSymbolClass,
): Map<ToneMarkName, ToneValue> {
	const resolved = new Map<ToneMarkName, ToneValue>();
	for (const line of bodyOf(CLASS_SLIDES[consonantClass])) {
		const match = CELL_LINE.exec(line);
		if (!match) continue;
		const mark = MARK_SUFFIX[match[1].toLowerCase()];
		resolved.set(mark, match[2].toLowerCase() as ToneValue);
	}
	return resolved;
}

function statesUnreachable(consonantClass: ThaiSymbolClass): boolean {
	return UNREACHABLE_LINE.test(textOf(CLASS_SLIDES[consonantClass]));
}

/**
 * AC3's resolver — reads only what `resolvedCellsFromLesson` recovers from the
 * committed deck. Never consults `toneMarkTable.ts`.
 */
function resolveFromLesson(
	toneMarkName: ToneMarkName,
	consonantClass: ThaiSymbolClass,
): ToneValue | undefined {
	return resolvedCellsFromLesson(consonantClass).get(toneMarkName);
}

// ============================================================================
// AC1 — the seam and the sequence
// ============================================================================

describe("AC1 — the lesson resolves to the deck arm at its declared position", () => {
	it("is declared, decked, and comes after every spelling-based tone rule", () => {
		expect(DECK_LESSON_IDS.has(LESSON_ID)).toBe(true);

		const entry = lessonEntryById(LESSON_ID);
		expect(entry.ok, `${LESSON_ID} is not declared in lessonSequence`).toBe(
			true,
		);
		if (!entry.ok) return;

		// Every spelling tone rule (`toneRules`, lessons 2-16 today) precedes
		// this lesson's position — the whole point of appending it, and the
		// property that would break silently if the sequence were reordered
		// under it.
		expect(toneRules.length).toBeGreaterThan(0);
		for (const rule of toneRules) {
			const ruleEntry = lessonSequence.find(
				(candidate) => candidate.legacyNumber === rule.lesson,
			);
			expect(
				ruleEntry,
				`spelling rule ${rule.id} names lesson ${rule.lesson}, which is not declared`,
			).toBeDefined();
			if (!ruleEntry) continue;
			expect(
				ruleEntry.position,
				`spelling rule ${rule.id} (lesson ${rule.lesson}) does not precede ${LESSON_ID}`,
			).toBeLessThan(entry.entry.position);
		}

		const content = resolveLessonContent(LESSON_ID);
		expect(content).toEqual({
			status: "resolved",
			content: {
				kind: "deck",
				deckPath: `/thai-script/lessons/${LESSON_ID}/deck.json`,
			},
		});

		const result = validateDeck(deck);
		if (!result.ok) {
			throw new Error(
				`${LESSON_ID} deck rejected: ${result.errors.map((e) => e.message).join("; ")}`,
			);
		}
		expect(result.deck.lessonId).toBe(LESSON_ID);
	});
});

// ============================================================================
// AC2 — all twelve combinations, four of them declared unreachable
// ============================================================================

describe("AC2 — all twelve class-by-mark combinations appear", () => {
	it("states every resolved cell that toneMarkTable.ts declares resolved", () => {
		const table = buildToneMarkTable();
		let resolvedChecked = 0;
		for (const cell of table) {
			if (cell.state !== "resolved") continue;
			const stated = resolveFromLesson(cell.toneMarkName, cell.consonantClass);
			expect(
				stated,
				`${cell.consonantClass}/${cell.toneMarkName} is resolved in toneMarkTable.ts but the lesson never states it`,
			).toBe(cell.resultingTone);
			resolvedChecked += 1;
		}
		expect(resolvedChecked).toBe(8);
	});

	it("marks the four unreachable combinations as unreachable, not silently absent", () => {
		const table = buildToneMarkTable();
		const unreachable = table.filter((cell) => cell.state === "unreachable");
		expect(unreachable).toHaveLength(4);
		for (const cell of unreachable) {
			expect(
				cell.consonantClass,
				"the four unreachable cells are all high or low class",
			).not.toBe(ThaiSymbolClass.Mid);
			expect(
				statesUnreachable(cell.consonantClass),
				`${cell.consonantClass} slide never states that mai tri/mai chattawa do not occur there`,
			).toBe(true);
			// And the lesson never states a resolved tone for it either — an
			// "unreachable" cell silently answered would be worse than one
			// silently omitted.
			expect(
				resolveFromLesson(cell.toneMarkName, cell.consonantClass),
			).toBeUndefined();
		}
	});

	it("names all four mark names and all three classes somewhere in the deck", () => {
		const allText = textsOf().join(" ");
		for (const name of TONE_MARK_NAMES) {
			expect(allText, name).toContain(name);
		}
		expect(allText).toMatch(/market/);
		expect(allText).toMatch(/temple/);
		expect(allText).toMatch(/harbor/);
	});
});

// ============================================================================
// AC3 — tones resolve from the lesson's own stated table
// ============================================================================

const vocabulary = vocabularyData as unknown as VocabEntry[];
const vocabularyByThai = new Map(
	vocabulary.map((entry) => [entry.thai, entry]),
);

const TONE_MARK_FIELD: Readonly<Record<ToneMarkName, string>> = {
	"mai ek": "mayek",
	"mai tho": "maytho",
	"mai tri": "maytri",
	"mai chattawa": "mayjattawa",
};

interface MarkedWord {
	readonly thai: string;
	readonly toneMarkName: ToneMarkName;
	readonly consonantClass: ThaiSymbolClass;
}

/**
 * One single-syllable corpus word per resolved cell, read off the corpus's
 * own annotations (`syllables[0].toneMark`/`consonantClass`/`tone`) rather
 * than asserted here — `expectWordResolves` below checks the resolver's
 * answer against that same corpus field, not against a value repeated in
 * this file.
 */
const AC3_SAMPLE: readonly MarkedWord[] = [
	{ thai: "ไก่", toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.Mid },
	{ thai: "เก้า", toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.Mid },
	{ thai: "โต๊ะ", toneMarkName: "mai tri", consonantClass: ThaiSymbolClass.Mid },
	{
		thai: "เดี๋ยว",
		toneMarkName: "mai chattawa",
		consonantClass: ThaiSymbolClass.Mid,
	},
	{ thai: "ข่าว", toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.High },
	{ thai: "ให้", toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.High },
	{ thai: "ล่าง", toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.Low },
	{ thai: "ม้า", toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.Low },
];

function expectWordResolves(word: MarkedWord): void {
	const entry = vocabularyByThai.get(word.thai);
	expect(entry, `${word.thai} is not in vocabulary.json`).toBeDefined();
	const syllable = entry?.syllables[0];
	expect(syllable, `${word.thai} has no syllable annotation`).toBeDefined();
	expect(syllable?.toneMark, `${word.thai}`).toBe(
		TONE_MARK_FIELD[word.toneMarkName],
	);
	expect(syllable?.consonantClass, `${word.thai}`).toBe(word.consonantClass);
	const resolved = resolveFromLesson(word.toneMarkName, word.consonantClass);
	expect(
		resolved,
		`the lesson states no tone for ${word.consonantClass}/${word.toneMarkName}`,
	).toBe(syllable?.tone);
}

describe("AC3 — the lesson's stated table resolves real corpus words", () => {
	it("reproduces the tone of one word per resolved cell", () => {
		for (const word of AC3_SAMPLE) expectWordResolves(word);
		expect(AC3_SAMPLE).toHaveLength(8);
	});

	it("depends on the lesson text: thinning a class slide stops the resolution", () => {
		expect(resolveFromLesson("mai chattawa", ThaiSymbolClass.Mid)).toBe(
			"rising",
		);

		const target = slide("mid-class-marks");
		const original = target.body;
		try {
			target.body = (original ?? []).filter(
				(line) => !/mai chattawa/i.test(line),
			);
			expect(
				resolveFromLesson("mai chattawa", ThaiSymbolClass.Mid),
			).toBeUndefined();
			expect(() => expectWordResolves(AC3_SAMPLE[3])).toThrow();
		} finally {
			target.body = original;
		}
		expect(resolveFromLesson("mai chattawa", ThaiSymbolClass.Mid)).toBe(
			"rising",
		);
	});
});

// ============================================================================
// AC4 — every example word resolves inside the declared rank window
// ============================================================================

describe("AC4 — every Thai example word is a real, rank-windowed corpus word", () => {
	it("resolves every word the deck shows against vocabulary.json", () => {
		const declaredRanks = readFileSync(
			join(REPO_ROOT, "content", "lessons", "lesson-tone-marks.md"),
			"utf-8",
		).match(/^ranks:\s*(\d+)\s*-\s*(\d+)\s*$/m);
		expect(
			declaredRanks,
			"lesson-tone-marks.md declares no rank window",
		).not.toBeNull();
		const lo = Number(declaredRanks?.[1]);
		const hi = Number(declaredRanks?.[2]);

		const teachingWords = new Set(
			(
				deck as unknown as {
					teachingWords?: { thai: string; reason: string }[];
				}
			).teachingWords?.map((w) => w.thai) ?? [],
		);

		let checked = 0;
		for (const text of textsOf()) {
			for (const run of text.match(/[ก-๙]+/g) ?? []) {
				const characters = [...run];
				if (characters.length === 1) continue;
				if (teachingWords.has(run)) continue;
				const entry = vocabularyByThai.get(run);
				expect(
					entry,
					`${run} is neither in vocabulary.json nor teachingWords`,
				).toBeDefined();
				if (!entry) continue;
				expect(entry.rank, `${run} has no frequency rank`).not.toBeNull();
				if (entry.rank !== null) {
					expect(
						entry.rank,
						`${run} (rank ${entry.rank}) is outside the declared window ${lo}-${hi}`,
					).toBeGreaterThanOrEqual(lo);
					expect(entry.rank).toBeLessThanOrEqual(hi);
				}
				checked += 1;
			}
		}
		expect(checked).toBeGreaterThan(4);
	});
});

// ============================================================================
// AC5 — originality
// ============================================================================

describe("AC5 — the lesson reuses no phrasing from the source transcripts", () => {
	it("clears the shared originality check on every line of the deck", async () => {
		const overlaps: string[] = [];
		let checked = 0;
		for (const text of textsOf()) {
			const result = await checkOriginality(text);
			if (result.status === "overlapping") {
				overlaps.push(
					`"${result.overlap.ngram}" (${result.overlap.sources.join(", ")}) in "${text}"`,
				);
				continue;
			}
			expect(result.status).toBe("cleared");
			checked += result.ngramsChecked;
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

describe("AC6 — every asset the deck references exists", () => {
	it("references only files inside the lesson's own directory, and leaves none unreferenced", () => {
		const directory = join(PUBLIC_LESSONS, LESSON_ID);
		const path = deckPathForLesson(LESSON_ID);
		expect(path).toEqual({
			ok: true,
			path: `/thai-script/lessons/${LESSON_ID}/deck.json`,
		});
		expect(existsSync(join(directory, "deck.json"))).toBe(true);
		expect(existsSync(join(directory, "manifest.json"))).toBe(true);

		const manifest = JSON.parse(
			readFileSync(join(directory, "manifest.json"), "utf-8"),
		) as Manifest;
		expect(manifest.lessonId).toBe(LESSON_ID);

		const referenced = new Set<string>();
		for (const s of deck.slides) {
			for (const audio of s.audio ?? []) referenced.add(audio);
			if (s.image) referenced.add(s.image);
		}
		for (const asset of referenced) {
			expect(
				asset.startsWith(`/thai-script/lessons/${LESSON_ID}/`),
				asset,
			).toBe(true);
			const file = asset.slice(`/thai-script/lessons/${LESSON_ID}/`.length);
			expect(file).not.toContain("..");
			expect(existsSync(join(directory, file)), asset).toBe(true);
		}
		const onDisk = readdirSync(directory).filter(
			(name) => name !== "deck.json" && name !== "manifest.json",
		);
		for (const name of onDisk) {
			expect(
				referenced.has(`/thai-script/lessons/${LESSON_ID}/${name}`),
				`${LESSON_ID}/${name} is committed but no slide references it`,
			).toBe(true);
		}
		for (const asset of manifest.assets) {
			if (asset.path === null) continue;
			expect(existsSync(join(directory, asset.path)), asset.path).toBe(true);
		}
	});
});
