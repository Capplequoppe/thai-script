import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import vocabularyData from "../../vocabulary/data/vocabulary.json";
import { VocabularyService } from "../../vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../vocabulary/types";
import { consonants } from "../data/symbols";
import { LearningService } from "../services/ScriptLessonService";
import {
	DECK_LESSON_IDS,
	deckPathForLesson,
	resolveLessonContent,
	validateDeck,
} from "./lessonContent";
import { lessonEntryByNumber, lessonSequence } from "./lessonSequence";
import { checkOriginality } from "./originality";
import { lessons } from "./symbols";

/**
 * Task 1.4's own proof: Lesson 1's real, generated deck — validated,
 * checked for originality, and checked against the identity join and the
 * scheduling it must not disturb.
 *
 * `DECK_LESSON_IDS` in `lessonContent.ts` now contains `"lesson-01"`, wiring
 * `resolveLessonContent` to dispatch it to the deck arm — the last line task
 * 1.4 left for whichever task's `covers` included `lessonContent.ts`. The two
 * `lessonContent.test.ts` cases that used `lessonSequence[0]` as a stand-in
 * for "some declared lesson still on the video arm" were repointed at
 * `lessonSequence[1]` accordingly.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const LESSON_DIR = join(REPO_ROOT, "public", "lessons", "lesson-01");
const DECK_PATH = join(LESSON_DIR, "deck.json");
const MANIFEST_PATH = join(LESSON_DIR, "manifest.json");
const SCRIPT_PATH = join(REPO_ROOT, "content", "lessons", "lesson-01.md");

const vocabulary = vocabularyData as unknown as VocabEntry[];
const vocabularyByThai = new Map(
	vocabulary.map((entry) => [entry.thai, entry]),
);

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

const rawDeck = JSON.parse(readFileSync(DECK_PATH, "utf-8")) as RawDeck;
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as {
	assets: { path: string | null }[];
};

const lesson1Entry = lessonEntryByNumber(1);
const lesson1 = lessons.find((candidate) => candidate.number === 1);

const THAI_RANGE = /[฀-๿]/g;

/** Every distinct Thai character used anywhere in the deck's own text. */
function thaiCharsIn(deck: RawDeck): Set<string> {
	const chars = new Set<string>();
	for (const slide of deck.slides) {
		const texts = [
			slide.heading,
			slide.prompt,
			...(slide.body ?? []),
			...(slide.answers ?? []),
		];
		for (const text of texts) {
			for (const ch of text?.match(THAI_RANGE) ?? []) chars.add(ch);
		}
	}
	return chars;
}

/** Every run of 2+ Thai characters — a "word", as opposed to a bare letter. */
function thaiWordsIn(deck: RawDeck): Set<string> {
	const words = new Set<string>();
	for (const slide of deck.slides) {
		const texts = [
			slide.heading,
			slide.prompt,
			...(slide.body ?? []),
			...(slide.answers ?? []),
		];
		for (const text of texts) {
			for (const run of text?.match(/[฀-๿]+/g) ?? []) {
				if (run.length >= 2) words.add(run);
			}
		}
	}
	return words;
}

describe("lesson 1's identity", () => {
	it("declares lesson-01 as position 1, joined to the legacy number the lessons table still uses", () => {
		expect(lesson1Entry).toBeDefined();
		expect(lesson1Entry?.id).toBe("lesson-01");
		expect(lesson1Entry?.legacyNumber).toBe(1);
		expect(lesson1).toBeDefined();
		expect(lesson1?.consonants).toEqual(["ม", "น"]);
		expect(lesson1?.vowels).toEqual(["า"]);
	});

	it("no lesson past the opening band resolves to a video any more — task 4.3 closed the seam", () => {
		// This assertion used to derive "the first slot with no deck" and
		// check it still served video. Task 4.3 removed the video side of the
		// seam entirely, so the derivation now proves the absence instead.
		const stillOnVideo = lessonSequence.find(
			(entry) => !DECK_LESSON_IDS.has(entry.id),
		);
		expect(stillOnVideo).toBeUndefined();
	});

	it("the deck sits at the exact path resolveLessonContent serves it from", () => {
		const path = deckPathForLesson("lesson-01");
		expect(path).toEqual({
			ok: true,
			path: "/thai-script/lessons/lesson-01/deck.json",
		});
		expect(existsSync(DECK_PATH)).toBe(true);
	});

	it("resolves to the deck arm: opening /lesson/1 renders in-house slides, not a video", () => {
		expect(DECK_LESSON_IDS.has("lesson-01")).toBe(true);
		const resolution = resolveLessonContent("lesson-01");
		expect(resolution.status).toBe("resolved");
		if (resolution.status !== "resolved") return;
		expect(resolution.content.kind).toBe("deck");
		expect(resolution.content).toEqual({
			kind: "deck",
			deckPath: "/thai-script/lessons/lesson-01/deck.json",
		});
	});
});

describe("the committed deck", () => {
	it("validates against the deck schema", () => {
		const result = validateDeck(rawDeck);
		if (!result.ok) {
			throw new Error(
				`lesson-01 deck rejected: ${result.errors.map((e) => e.message).join("; ")}`,
			);
		}
		expect(result.deck.lessonId).toBe("lesson-01");
		expect(result.deck.slides.length).toBeGreaterThan(0);
	});

	it("asks the learner to attempt an answer before any is revealed", () => {
		const retrievals = rawDeck.slides.filter((s) => s.kind === "retrieval");
		const reveals = rawDeck.slides.filter((s) => s.kind === "reveal");
		expect(retrievals.length).toBeGreaterThan(0);
		expect(reveals.length).toBe(retrievals.length);
	});

	it("teaches exactly the symbols lesson 1 declares — no more, no fewer", () => {
		expect(lesson1).toBeDefined();
		if (!lesson1) return;
		const declared = new Set([...lesson1.consonants, ...lesson1.vowels]);
		const used = thaiCharsIn(rawDeck);
		expect([...used].sort()).toEqual([...declared].sort());
	});

	it("every Thai example word resolves to a vocabulary.json entry (or is declared in teachingWords with a reason)", () => {
		const teachingWords = (
			(
				rawDeck as unknown as {
					teachingWords?: { thai: string; reason: string }[];
				}
			).teachingWords ?? []
		).filter((w) => w.reason.trim().length > 0);
		const teachingWordSet = new Set(teachingWords.map((w) => w.thai));

		const words = thaiWordsIn(rawDeck);
		expect(words.size).toBeGreaterThan(0);
		for (const word of words) {
			const known = vocabularyByThai.has(word) || teachingWordSet.has(word);
			expect(
				known,
				`${word} is neither in vocabulary.json nor teachingWords`,
			).toBe(true);
		}
		// This deck's `teachingWords` is empty — every word resolves through
		// vocabulary.json. Prove that branch is genuinely exercised (not
		// vacuously true because `words` came back empty, or because
		// `vocabularyByThai` itself failed to load): the three words this
		// lesson builds are really in the loaded vocabulary.
		expect(["มา", "นา", "นาน"].every((w) => vocabularyByThai.has(w))).toBe(
			true,
		);
	});

	it("every asset the deck references exists on disk, inside the lesson's own directory", () => {
		const referenced = new Set<string>();
		for (const slide of rawDeck.slides) {
			for (const path of slide.audio ?? []) referenced.add(path);
			if (slide.image) referenced.add(slide.image);
		}
		// Assert the loop below is not vacuous before trusting it. Lesson 1 is
		// narrated end to end, so a deck that referenced nothing would pass
		// every check in this test while shipping silence.
		expect(referenced.size).toBeGreaterThan(0);
		for (const path of referenced) {
			expect(path.startsWith("/thai-script/lessons/lesson-01/")).toBe(true);
			// Deck paths are browser URLs and carry Vite's `base` ("/thai-script/");
			// on disk that prefix is `public/` itself, not a directory beneath it.
			expect(
				existsSync(
					join(REPO_ROOT, "public", path.replace("/thai-script/", "")),
				),
			).toBe(true);
		}
	});

	it("every manifest asset reached `generated`, and every Thai clip was verified", () => {
		// The manifest is the record of what the run actually did, and the deck
		// is only written when every segment reached `generated` — so a deck
		// that exists alongside a `failed` segment would mean the pipeline's
		// central promise had broken.
		expect(manifest.assets.length).toBeGreaterThan(0);
		for (const asset of manifest.assets) {
			expect(asset.state).toBe("generated");
		}

		// Thai is the language being taught: a wrong tone here is a
		// mispronunciation the learner will go on to practise. Every Thai clip
		// is transcribed back before it is accepted, and `not-required` is what
		// an English clip gets — so a Thai clip carrying it would mean the
		// check had been skipped rather than passed.
		const thai = manifest.assets.filter((a) => a.language === "th");
		expect(thai.length).toBeGreaterThan(0);
		for (const asset of thai) {
			expect(asset.verification?.outcome).toBe("verified");
		}
	});

	it("no English narration line carries Thai, as a glyph or romanised", () => {
		// The English voice is not a Thai speaker. A Thai sound shaped by an
		// English mouth teaches the learner the wrong target, and in a tonal
		// language they then practise against it — so every Thai sound has to
		// come from a `th` clip.
		//
		// The generator's parser already refuses Thai *glyphs* on an English
		// line, which is the half a regex can catch. Romanisation is the half
		// it cannot: "maaw maa" is Thai wearing a Latin costume and reads as
		// ordinary English text. This checks it against the romanised names the
		// app itself declares, so the two can never drift apart.
		const script = readFileSync(
			join(REPO_ROOT, "content", "lessons", "lesson-01.md"),
			"utf8",
		);
		const english = script
			.split("\n")
			.filter((line) => line.startsWith("narration: en "))
			.map((line) => line.slice("narration: en ".length).toLowerCase());
		expect(english.length).toBeGreaterThan(0);

		const romanised = consonants
			.map((c) => c.nameRomanized)
			.filter(
				(name): name is string => typeof name === "string" && name.length > 0,
			)
			.flatMap((name) => name.toLowerCase().split(/\s+/))
			// Strip tone diacritics so "máa" and "maa" are the same token.
			.map((token) => token.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
			.filter((token) => token.length >= 3);

		const offenders: string[] = [];
		for (const line of english) {
			const words = line
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.split(/[^a-z]+/);
			for (const token of romanised) {
				if (words.includes(token)) offenders.push(`${token} :: ${line}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("every narration line in the script became exactly one clip", () => {
		// The script is the source of truth for what is spoken. A line that
		// silently failed to become a clip is the failure mode that would be
		// hardest to notice by playing the lesson — the narration would simply
		// skip a sentence.
		const script = readFileSync(
			join(REPO_ROOT, "content", "lessons", "lesson-01.md"),
			"utf8",
		);
		const spoken = script
			.split("\n")
			.filter((line) => /^narration: (en|th) /.test(line));
		expect(spoken.length).toBe(manifest.assets.length);

		const thaiLines = spoken.filter((line) =>
			line.startsWith("narration: th "),
		).length;
		expect(manifest.assets.filter((a) => a.language === "th").length).toBe(
			thaiLines,
		);
	});
});

describe("originality", () => {
	it("clears every piece of narration and mnemonic prose in the deck", async () => {
		const texts: string[] = [];
		for (const slide of rawDeck.slides) {
			if (slide.heading) texts.push(slide.heading);
			texts.push(...(slide.body ?? []));
			if (slide.prompt) texts.push(slide.prompt);
			texts.push(...(slide.answers ?? []));
		}
		expect(texts.length).toBeGreaterThan(0);
		for (const text of texts) {
			const result = await checkOriginality(text);
			if (result.status === "overlapping") {
				throw new Error(
					`"${text}" reuses a run from ${result.overlap.sources.join(", ")}: "${result.overlap.ngram}"`,
				);
			}
			expect(result.status).toBe("cleared");
		}
	});

	it("also clears the rewritten symbols.ts mnemonics for ม and น", async () => {
		expect(lesson1).toBeDefined();
		const { consonants } = await import("./symbols");
		for (const character of ["ม", "น"]) {
			const symbol = consonants.find((c) => c.character === character);
			expect(symbol).toBeDefined();
			const result = await checkOriginality(symbol?.mnemonic ?? "");
			expect(result.status).toBe("cleared");
		}
	});

	it("the check is not vacuous: a known paraphrase from the source is still caught", async () => {
		// The mnemonic this file replaced. Kept here only as the canary that
		// proves the corpus is loaded — not as content, and not committed
		// anywhere it would render.
		const knownParaphrase =
			"Think of a coffee mug with a broken handle. The head on top and loop on the bottom are where the handle used to be attached.";
		const result = await checkOriginality(knownParaphrase);
		expect(result.status).toBe("overlapping");
	});
});

describe("scheduling and vocabulary do not depend on which arm serves the lesson", () => {
	function completeLessonOneAndMeasure() {
		const storage = new InMemoryStorage();
		const cardRepo = new StorageCardRepository(storage);
		const stateRepo = new StorageLearnerStateRepository(storage);
		const learning = new LearningService(cardRepo, stateRepo);

		const info = learning.startLesson(1);
		learning.completeLesson(1);

		const vocab = new VocabularyService(cardRepo, stateRepo, vocabulary);
		return {
			cardIds: (info?.cards ?? []).map((c) => c.id).sort(),
			completedLessons: [...stateRepo.getCompletedLessons()].sort(),
			currentLesson: stateRepo.getCurrentLesson(),
			unlockedWords: vocab
				.getUnlockedWords()
				.map((w) => w.thai)
				.sort(),
		};
	}

	it("produces identical scheduled cards and unlocked vocabulary whether lesson 1 is on the video arm or the deck arm", () => {
		expect(lesson1Entry).toBeDefined();
		const id = lesson1Entry?.id ?? "";

		// "deck": today's real, wired-in resolution.
		const deckResolution = resolveLessonContent(id);
		expect(deckResolution.status).toBe("resolved");
		if (deckResolution.status === "resolved") {
			expect(deckResolution.content.kind).toBe("deck");
		}
		const deckArmState = completeLessonOneAndMeasure();

		// "video": what this lesson served before task 1.4 wired the deck in.
		// `DECK_LESSON_IDS` is a plain `Set` underneath its `ReadonlySet`
		// type; flipped for one assertion and restored in `finally` so
		// nothing leaks into another test file.
		const mutableDeckIds = DECK_LESSON_IDS as Set<string>;
		mutableDeckIds.delete(id);
		let videoResolution: ReturnType<typeof resolveLessonContent>;
		let videoArmState: ReturnType<typeof completeLessonOneAndMeasure>;
		try {
			videoResolution = resolveLessonContent(id);
			videoArmState = completeLessonOneAndMeasure();
		} finally {
			mutableDeckIds.add(id);
		}

		expect(videoResolution.status).toBe("resolved");
		if (videoResolution.status === "resolved") {
			expect(videoResolution.content.kind).toBe("video");
		}
		expect(deckArmState).toEqual(videoArmState);
		expect(DECK_LESSON_IDS.has(id)).toBe(true);
	});
});

describe("the lesson script on disk", () => {
	it("exists, is real Markdown, and is what generated the committed deck", () => {
		const source = readFileSync(SCRIPT_PATH, "utf-8");
		expect(source).toContain("lesson: lesson-01");
		const declaredSlideIds = [
			...source.matchAll(/^##\s+[a-z]+\s+(\S+)\s*$/gm),
		].map((m) => m[1]);
		expect(declaredSlideIds).toEqual(rawDeck.slides.map((s) => s.id));
	});
});
