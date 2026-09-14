import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import vocabularyData from "../../vocabulary/data/vocabulary.json";
import { VocabularyService } from "../../vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../vocabulary/types";
import { LearningService } from "../services/ScriptLessonService";
import {
	DECK_LESSON_IDS,
	deckPathForLesson,
	resolveLessonContent,
	validateDeck,
} from "./lessonContent";
import { lessonEntryByNumber } from "./lessonSequence";
import { checkOriginality } from "./originality";
import { lessons } from "./symbols";

/**
 * Task 1.4's own proof: Lesson 1's real, generated deck — validated,
 * checked for originality, and checked against the identity join and the
 * scheduling it must not disturb.
 *
 * **Known gap, reported rather than routed around:** AC1 asks for a case
 * asserting `resolveLessonContent` actually dispatches lesson 1 to the deck
 * arm. That requires `DECK_LESSON_IDS` in `lessonContent.ts` to contain
 * `"lesson-01"` — but `lessonContent.ts` is task 1.1a's file, not this task's
 * (`covers`: content/lessons/lesson-01.md, public/lessons/lesson-01/,
 * src/domain/script/data/symbols.ts, src/domain/script/data/lesson01Deck.test.ts).
 * Making that edit here was tried and reverted: it turns two of
 * `lessonContent.test.ts`'s own cases red — "reports a declared lesson
 * absent from the lessons table as unresolvable" and "...with no content
 * source as unresolvable" both use `lessonSequence[0]` (lesson 1) as their
 * stand-in for "some declared lesson" and assume it is *not* a deck lesson.
 * Flipping the switch here would silently break a test this task does not
 * own. So: the deck below is complete, valid, and sitting at the exact path
 * `resolveLessonContent` would serve it from — the wiring in `DECK_LESSON_IDS`
 * is the one line left for whichever task's `covers` includes
 * `lessonContent.ts` next.
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

	it("lesson 2 still resolves to its video, unchanged by this task", () => {
		const entry2 = lessonEntryByNumber(2);
		expect(entry2).toBeDefined();
		const resolution = resolveLessonContent(entry2?.id);
		expect(resolution.status).toBe("resolved");
		if (resolution.status !== "resolved") return;
		expect(resolution.content.kind).toBe("video");
	});

	it("the deck sits at the exact path resolveLessonContent would serve it from once wired in", () => {
		const path = deckPathForLesson("lesson-01");
		expect(path).toEqual({ ok: true, path: "/lessons/lesson-01/deck.json" });
		expect(existsSync(DECK_PATH)).toBe(true);
		// DECK_LESSON_IDS still excludes lesson-01 — see the module comment above.
		expect(DECK_LESSON_IDS.has("lesson-01")).toBe(false);
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
		// Lesson 1 ships with no narration audio and no illustrations in this
		// pass: generating real ElevenLabs narration needs a live
		// ELEVENLABS_API_KEY, which was not available when this deck was
		// generated. The pipeline still ran for real — `manifest.json` records
		// a completed run with zero assets, not an absent or partial one — and
		// content/lessons/lesson-01.md declares no `narration:` lines, so
		// nothing was silently skipped.
		expect(referenced.size).toBe(0);
		expect(manifest.assets).toEqual([]);
		for (const path of referenced) {
			expect(path.startsWith("/lessons/lesson-01/")).toBe(true);
			expect(existsSync(join(REPO_ROOT, "public", path))).toBe(true);
		}
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

		// "video": today's real, wired-in resolution.
		const beforeResolution = resolveLessonContent(id);
		expect(beforeResolution.status).toBe("resolved");
		if (beforeResolution.status === "resolved") {
			expect(beforeResolution.content.kind).toBe("video");
		}
		const videoArmState = completeLessonOneAndMeasure();

		// "deck": the arm this task's own generated content will serve once
		// `DECK_LESSON_IDS` is wired in. `DECK_LESSON_IDS` is a plain `Set`
		// underneath its `ReadonlySet` type; flipped for one assertion and
		// restored in `finally` so nothing leaks into another test file.
		const mutableDeckIds = DECK_LESSON_IDS as Set<string>;
		mutableDeckIds.add(id);
		let deckResolution: ReturnType<typeof resolveLessonContent>;
		let deckArmState: ReturnType<typeof completeLessonOneAndMeasure>;
		try {
			deckResolution = resolveLessonContent(id);
			deckArmState = completeLessonOneAndMeasure();
		} finally {
			mutableDeckIds.delete(id);
		}

		expect(deckResolution.status).toBe("resolved");
		if (deckResolution.status === "resolved") {
			expect(deckResolution.content.kind).toBe("deck");
		}
		expect(deckArmState).toEqual(videoArmState);
		expect(DECK_LESSON_IDS.has(id)).toBe(false);
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
