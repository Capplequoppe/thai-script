import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import { ReviewService } from "../../session/services/ReviewService";
import vocabularyData from "../../vocabulary/data/vocabulary.json";
import { VocabularyService } from "../../vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../vocabulary/types";
import { LearningService } from "../services/ScriptLessonService";
import {
	DECK_LESSON_IDS,
	lessonContentFor,
	resolveLessonContent,
} from "./lessonContent";
import { lessonSequence } from "./lessonSequence";

/**
 * Task 6.2's own proof, in criterion order: confirm every lesson resolves to
 * a deck (AC1) *before* trusting anything else here, then the removal's
 * other four claims. AC2 (`LessonContent` has one shape and the exhaustive
 * `never` default in `describeLessonContent` still compiles) is a
 * compile-time property `tsc` checks on this whole tree — nothing here can
 * honestly assert it at runtime, so it is not re-asserted as a test.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const SRC_ROOT = join(REPO_ROOT, "src");
const PUBLIC_VIDEOS = join(REPO_ROOT, "public", "videos");

// ============================================================================
// AC1 — every lesson resolves to a deck, checked before anything is deleted
// ============================================================================

describe("AC1 — every lesson in the sequence resolves to a deck", () => {
	it("resolves every declared lesson to the deck arm", () => {
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
	});

	it("flags a lesson forced off the deck set instead of silently passing", () => {
		// A fixture lesson that the real sequence never declares, and that is
		// deliberately absent from `DECK_LESSON_IDS` — standing in for "a
		// lesson still on the video arm" now that the video arm no longer
		// exists to construct directly. The pre-deletion check must refuse
		// this the same way it would have refused an unmigrated video lesson.
		const forcedOffDeckArm = {
			id: "lesson-not-a-deck",
			position: 999,
			legacyNumber: 999,
			required: true,
		} as const;
		expect(DECK_LESSON_IDS.has(forcedOffDeckArm.id)).toBe(false);

		const result = lessonContentFor(forcedOffDeckArm);
		expect(result.status).not.toBe("resolved");
	});
});

// ============================================================================
// AC3 — no `videoUrl` reference remains anywhere in source
// ============================================================================

const VIDEO_URL_TOKEN = ["video", "Url"].join("");

function listSourceFiles(dir: string): string[] {
	const files: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === "node_modules") continue;
		const full = join(dir, name);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			files.push(...listSourceFiles(full));
			continue;
		}
		if (/\.(ts|tsx)$/.test(name)) files.push(full);
	}
	return files;
}

describe("AC3 — no videoUrl reference remains anywhere", () => {
	it("finds no occurrence of the token in any source file", () => {
		// Excludes this file itself: it names the token above to build the
		// search string without containing it as a literal, but exclusion by
		// path keeps the check honest regardless of how that's spelled.
		const self = import.meta.url.replace("file://", "");
		const offences: string[] = [];
		for (const file of listSourceFiles(SRC_ROOT)) {
			if (file === self) continue;
			const content = readFileSync(file, "utf-8");
			if (content.includes(VIDEO_URL_TOKEN)) {
				offences.push(file.slice(REPO_ROOT.length + 1));
			}
		}
		expect(offences, offences.join("\n")).toEqual([]);
	});

	it("the search token is spelled correctly, so a clean sweep isn't vacuous", () => {
		// Canary: prove the search string actually matches the field name it
		// claims to, by constructing an object with a property of that name.
		const probe: Record<string, string> = { [VIDEO_URL_TOKEN]: "x" };
		expect(VIDEO_URL_TOKEN).toBe("videoUrl");
		expect(probe.videoUrl).toBe("x");
	});
});

// ============================================================================
// AC4 — public/videos contains no ThaiPod101 file
// ============================================================================

describe("AC4 — public/videos contains no licensed file", () => {
	it("the directory is gone, or if present, holds nothing", () => {
		// `readdirSync` directly, rather than an `existsSync` guard: `existsSync`
		// swallows every error (including a permission failure) into `false`,
		// which would read a directory this process merely couldn't stat the
		// same as one that was actually removed. Only ENOENT — "genuinely
		// gone" — is treated as a pass; any other failure surfaces as one.
		let entries: string[];
		try {
			entries = readdirSync(PUBLIC_VIDEOS);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
			throw err;
		}
		expect(entries).toEqual([]);
	});
});

// ============================================================================
// AC5 — scheduled cards and unlocked vocabulary are unchanged across removal
// ============================================================================

/**
 * Recorded from this exact fixture — a learner mid-course through lesson 11,
 * every card graduated — measured against the tree immediately before this
 * task's edits landed, using the same `LearningService`/`VocabularyService`
 * calls below. Removing the video arm touches only
 * `LessonContent`/`LessonSummary`/lesson-serving UI; card generation
 * (`ScriptCardGenerator`) and vocabulary unlocking (`VocabularyService`)
 * import neither, so the baseline held unchanged across the removal, and
 * this assertion is here to keep proving that on every later change to this
 * area too.
 */
const SCHEDULE_BASELINE = {
	dueCardsCount: 212,
	nextLesson: 12,
	totalCards: 212,
	unlockedCount: 14,
};

describe("AC5 — a mid-course learner's schedule and vocabulary are unchanged", () => {
	it("matches the recorded baseline for scheduled cards, next lesson, and unlocked words", () => {
		const FUTURE_NOW = new Date(Date.now() + 15 * 60 * 1000).toISOString();
		const storage = new InMemoryStorage();
		const cardRepo = new StorageCardRepository(storage);
		const stateRepo = new StorageLearnerStateRepository(storage);
		const learning = new LearningService(cardRepo, stateRepo);
		const review = new ReviewService(cardRepo, stateRepo);

		for (let n = 1; n <= 11; n++) {
			learning.startLesson(n);
			learning.completeLesson(n);
			const state = storage.load();
			for (const card of Object.values(state.cards)) {
				if (card.lessonNumber === n) {
					card.srs.learningStep = null;
					card.srs.interval = 4320;
				}
			}
			storage.save(state);
		}

		const dueCards = review.getDueCards(FUTURE_NOW);
		const totalCards = Object.keys(storage.load().cards).length;

		const vocab = new VocabularyService(
			cardRepo,
			stateRepo,
			vocabularyData as unknown as VocabEntry[],
		);
		const unlocked = vocab.getUnlockedWords();

		expect({
			dueCardsCount: dueCards.length,
			nextLesson: learning.getNextLesson(),
			totalCards,
			unlockedCount: unlocked.length,
		}).toEqual(SCHEDULE_BASELINE);
	});
});
