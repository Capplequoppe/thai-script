import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../../infrastructure/persistence/StorageLearnerStateRepository";
import { ReviewService } from "../../session/services/ReviewService";
import {
	ApprenticeService,
	MAX_SCRIPT_APPRENTICE_ITEMS,
} from "../../shared/services/ApprenticeService";
import type { SrsData } from "../../shared/types";
import { RecallRating } from "../../srs/value-objects/RecallRating";
import { lessonEntryByNumber, lessonSequence } from "../data/lessonSequence";

/**
 * The position of the lesson `symbols.ts` files under this number.
 *
 * These tests mean "the lesson that teaches ม", not "position 1" — the two
 * were the same integer until a lesson was inserted ahead of them. Resolved
 * through the sequence so they stay correct across a resequence.
 */
const at = (legacyNumber: number): number =>
	lessonEntryByNumber(legacyNumber)?.position ?? legacyNumber;

import { LearningService } from "./ScriptLessonService";

/**
 * Marks every position ahead of `position` complete, straight into the state.
 *
 * `startLesson` refuses a lesson whose predecessors are incomplete, and most
 * of these tests are about the lesson they name rather than about that rule.
 * Written to the state rather than played so it creates no cards.
 */
const unblock = (storage: InMemoryStorage, position: number): void => {
	const state = storage.load();
	state.completedLessons = [
		...new Set([
			...state.completedLessons,
			...Array.from({ length: position - 1 }, (_, i) => i + 1),
		]),
	];
	storage.save(state);
};

describe("LearningService", () => {
	let service: LearningService;
	let storage: InMemoryStorage;
	let cardRepo: StorageCardRepository;
	let stateRepo: StorageLearnerStateRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		cardRepo = new StorageCardRepository(storage);
		stateRepo = new StorageLearnerStateRepository(storage);
		service = new LearningService(cardRepo, stateRepo);
	});

	describe("startLesson", () => {
		it("starts lesson 1 and generates cards", () => {
			unblock(storage, at(1));
			const lesson = service.startLesson(at(1));
			expect(lesson).not.toBeNull();
			expect(lesson?.lessonNumber).toBe(at(1));
			expect(lesson?.cards.length).toBeGreaterThan(0);
		});

		it("persists cards to storage", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			const state = storage.load();
			expect(Object.keys(state.cards).length).toBeGreaterThan(0);
		});

		it("sets currentLesson in state", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			const state = storage.load();
			expect(state.currentLesson).toBe(at(1));
		});

		it("throws if lesson is already completed", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			expect(() => service.startLesson(at(1))).toThrow();
		});

		it("requires sequential lessons (cannot skip)", () => {
			expect(() => service.startLesson(at(3))).toThrow();
		});

		it("refuses a lesson with an incomplete predecessor, naming that predecessor", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));

			// Prerequisites come from the declared order: with everything up to
			// the harbour lesson done, the first incomplete predecessor of the
			// fourth teaching lesson is the second one.
			expect(() => service.startLesson(at(4))).toThrow(
				`Must complete lesson ${at(2)} before starting lesson ${at(4)}`,
			);
		});
	});

	describe("completeLesson", () => {
		it("marks lesson as completed", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			const state = storage.load();
			expect(state.completedLessons).toContain(at(1));
			expect(state.currentLesson).toBeNull();
		});
	});

	describe("unlearnLesson", () => {
		it("removes lesson and its cards from state", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			service.unlearnLesson(at(1));
			const state = storage.load();
			expect(state.completedLessons).not.toContain(at(1));
			const lesson1Cards = Object.values(state.cards).filter(
				(c) => c.lessonNumber === 1,
			);
			expect(lesson1Cards).toHaveLength(0);
		});
	});

	describe("getNextLesson", () => {
		it("returns 1 when no lessons completed", () => {
			expect(service.getNextLesson()).toBe(1);
		});

		it("returns 2 after lesson 1 completed", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			expect(service.getNextLesson()).toBe(at(2));
		});

		it("returns null after every declared lesson is completed", () => {
			const _reviewService = new ReviewService(cardRepo, stateRepo);
			for (const { position } of lessonSequence) {
				service.startLesson(position);
				service.completeLesson(position);
				// Graduate all cards for this lesson so mastery gate passes
				const state = storage.load();
				for (const card of Object.values(state.cards)) {
					if (
						card.lessonNumber === position &&
						card.srs.learningStep !== null
					) {
						card.srs.learningStep = null;
						card.srs.interval = 4320;
					}
				}
				storage.save(state);
			}
			expect(service.getNextLesson()).toBeNull();
		});
	});

	describe("every lesson count derives from the declared sequence", () => {
		// The five literal sites CONTEXT.md names — ScriptLessonService's
		// TOTAL_LESSONS, AchievementService's all_lessons threshold, both
		// ProgressPage sites, and AchievementBadge's user-facing copy — plus
		// LessonPath's node walk. Updating any of them to the next count
		// instead of deriving it reopens the defect at the next resequence,
		// so this asserts over the source itself.
		const DERIVED_SOURCE_FILES = [
			"./ScriptLessonService.ts",
			"../../shared/services/AchievementService.ts",
			"../../../presentation/pages/ProgressPage.tsx",
			"../../../presentation/components/organisms/AchievementBadge.tsx",
			"../../../presentation/components/organisms/LessonPath.tsx",
		];

		function sourceOf(relativePath: string): string {
			return readFileSync(
				fileURLToPath(new URL(relativePath, import.meta.url)),
				"utf-8",
			);
		}

		it("leaves no lesson-count literal in any of the named files", () => {
			for (const file of DERIVED_SOURCE_FILES) {
				expect(
					sourceOf(file),
					`${file} contains a lesson-count literal`,
				).not.toMatch(/\b25\b/);
			}
		});

		it("has each named file read the declared sequence instead", () => {
			for (const file of DERIVED_SOURCE_FILES) {
				expect(
					sourceOf(file),
					`${file} does not derive from the declared sequence`,
				).toMatch(/lessonSequence|lessonCount/);
			}
		});

		it("keeps the badge's copy and its unlock condition in agreement at any count", () => {
			// Both sides reference the same derived count, so the copy cannot
			// promise a number the condition does not check.
			expect(
				sourceOf(
					"../../../presentation/components/organisms/AchievementBadge.tsx",
				),
			).toContain("Complete all ${lessonCount} lessons");
			expect(sourceOf("../../shared/services/AchievementService.ts")).toContain(
				"completedLessons.length >= lessonCount",
			);
		});
	});

	describe("getLessonSummary", () => {
		// `symbols.ts` has carried these rules, and each lesson's
		// `specialRulesIntroduced`, from the start — but nothing read either,
		// so ห นำ was never taught while หมี was still quizzed on its tone.
		it("surfaces the reading rules a lesson introduces", () => {
			// `getLessonSummary` takes a *position* in `lessonSequence`, not a
			// `symbols.ts` lesson number — and this branch resequenced the
			// course. ห นำ is position 18 (`lesson-leading-consonants`, legacy
			// 28), where it now arrives with the rest of อักษรนำ.
			expect(service.getLessonSummary(at(28)).specialRules).toEqual([
				expect.objectContaining({ id: "hor-nam" }),
				expect.objectContaining({ id: "silent-o-before-yo" }),
			]);
			expect(
				service.getLessonSummary(at(26)).specialRules.map((r) => r.id),
			).toEqual(["unwritten-vowels", "ror-han"]);
		});

		it("carries a title and description for each, not just an id", () => {
			const [rule] = service.getLessonSummary(at(28)).specialRules;

			expect(rule?.title).toContain("ห นำ");
			expect(rule?.description.length).toBeGreaterThan(40);
		});

		it("is empty for a lesson that introduces none", () => {
			expect(service.getLessonSummary(at(1)).specialRules).toEqual([]);
		});

		it("returns lesson with symbol info for a given lesson number", () => {
			const summary = service.getLessonSummary(at(1));
			expect(summary.lessonNumber).toBe(at(1));
			expect(summary.consonants.length).toBeGreaterThan(0);
		});

		it("includes rare vowels for the rare-tail lesson", () => {
			const summary = service.getLessonSummary(at(14));
			expect(summary.rareVowels.map((v) => v.character)).toEqual([
				"ฤ",
				"ฤๅ",
				"ฦ",
				"ฦๅ",
			]);
		});

		it("includes all ten numerals for the numerals lesson", () => {
			const summary = service.getLessonSummary(at(30));
			expect(summary.numerals.map((n) => n.character)).toEqual([
				"๐",
				"๑",
				"๒",
				"๓",
				"๔",
				"๕",
				"๖",
				"๗",
				"๘",
				"๙",
			]);
		});

		it("includes tone rule ids matching their generated card ids", () => {
			const summary = service.getLessonSummary(at(2));
			expect(summary.toneRules).toEqual([
				{ id: "tone-rule:low-live", description: expect.any(String) },
			]);
		});

		it("includes tone mark rule ids matching their generated card ids", () => {
			const summary = service.getLessonSummary(at(29));
			const ids = summary.toneRules.map((r) => r.id);
			expect(ids).toContain("tone-mark-rule:mai ek-mid");
			expect(ids).toContain("tone-mark-rule:mai tho-mid");
		});
	});

	describe("mastery gating", () => {
		function graduateAllCards(
			store: InMemoryStorage,
			lessonNumber: number,
		): void {
			const state = store.load();
			for (const card of Object.values(state.cards)) {
				if (card.lessonNumber === lessonNumber) {
					card.srs.learningStep = null;
					card.srs.interval = 4320;
				}
			}
			store.save(state);
		}

		it("lesson 1 is always available via isNextLessonAvailable", () => {
			expect(service.isNextLessonAvailable()).toBe(true);
		});

		it("startLesson allows lesson 2 after completing lesson 1", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			expect(service.startLesson(at(2))).not.toBeNull();
		});

		it("getLessonMasteryProgress returns correct total/graduated/percentage", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));

			const beforeProgress = service.getLessonMasteryProgress(at(1));
			expect(beforeProgress.total).toBeGreaterThan(0);
			expect(beforeProgress.graduated).toBe(0);
			expect(beforeProgress.percentage).toBe(0);

			// Graduate all cards
			graduateAllCards(storage, at(1));

			const afterProgress = service.getLessonMasteryProgress(at(1));
			expect(afterProgress.graduated).toBe(afterProgress.total);
			expect(afterProgress.percentage).toBe(1);
		});

		it("startLesson succeeds when previous lesson is mastered", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			graduateAllCards(storage, at(1));

			const lesson2 = service.startLesson(at(2));
			expect(lesson2).not.toBeNull();
			expect(lesson2?.lessonNumber).toBe(at(2));
		});

		it("isNextLessonAvailable returns true after completing lessons", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));
			service.startLesson(at(2));
			service.completeLesson(at(2));
			service.startLesson(at(3));
			service.completeLesson(at(3));
			expect(service.isNextLessonAvailable()).toBe(true);
		});
	});

	describe("apprentice gating", () => {
		function makeSrsData(overrides: Partial<SrsData> = {}): SrsData {
			return {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
				lapseCount: 0,
				...overrides,
			};
		}

		it("returns null when ApprenticeService says at script limit", () => {
			const apprenticeService = new ApprenticeService(cardRepo);

			const state = storage.load();
			// Fill up the script apprentice stage to MAX_SCRIPT_APPRENTICE_ITEMS
			for (let i = 0; i < MAX_SCRIPT_APPRENTICE_ITEMS; i++) {
				state.cards[`s${i}`] = {
					id: `s${i}`,
					question: "test",
					correctAnswer: "test",
					choices: ["test"],
					srs: makeSrsData({ learningStep: 1 }),
					symbolCharacter: "ก",
					property: "recognition",
					lessonNumber: 1,
				};
			}
			storage.save(state);

			const gatedService = new LearningService(
				cardRepo,
				stateRepo,
				apprenticeService,
			);
			unblock(storage, at(1));
			const result = gatedService.startLesson(at(1));
			expect(result).toBeNull();
		});

		it("works normally without ApprenticeService (backward compat)", () => {
			unblock(storage, at(1));
			const result = service.startLesson(at(1));
			expect(result).not.toBeNull();
			expect(result?.lessonNumber).toBe(at(1));
		});
	});

	describe("reconcileCards", () => {
		it("backfills a persisted card's audioUrl once completed lessons regain it, without touching other cards' srs", () => {
			unblock(storage, at(1));
			service.startLesson(at(1));
			service.completeLesson(at(1));

			const persistedBefore = cardRepo.findAll("script");
			expect(persistedBefore.length).toBeGreaterThan(0);
			const targetBefore = persistedBefore.find((c) => c.audioUrl);
			if (!targetBefore) {
				throw new Error("expected at least one card with audioUrl");
			}
			const targetId = targetBefore.id;
			const realAudioUrl = targetBefore.audioUrl;

			// Simulate the card having been persisted before it had audio.
			const state = storage.load();
			const raw = state.cards[targetId] as { audioUrl?: string };
			raw.audioUrl = undefined;
			storage.save(state);

			// Give it a review history distinct from a fresh card, from a fresh
			// domain instance that reflects the audioUrl-less storage above.
			const target = cardRepo.findById(targetId, "script");
			if (!target) throw new Error("expected card to still exist");
			target.recordReview(RecallRating.GOOD, new Date().toISOString());
			cardRepo.save(target);
			const ratedRepetitions = target.schedule.repetitions;
			expect(ratedRepetitions).toBeGreaterThan(0);
			expect(
				cardRepo.findAll("script").find((c) => c.id === targetId)?.audioUrl,
			).toBeUndefined();

			service.reconcileCards();

			const persistedAfter = cardRepo.findAll("script");
			const patched = persistedAfter.find((c) => c.id === target.id);
			expect(patched?.audioUrl).toBe(realAudioUrl);
			expect(patched?.schedule.repetitions).toBe(ratedRepetitions);

			// An untouched sibling card is unaffected.
			const sibling = persistedAfter.find((c) => c.id !== target.id);
			expect(sibling?.schedule.repetitions).toBe(0);
		});

		it("is a no-op when no lessons are completed", () => {
			service.reconcileCards();

			expect(cardRepo.findAll("script")).toHaveLength(0);
		});
	});

	describe("pending catch-ups", () => {
		function completeLessonsUpTo(n: number): void {
			for (let i = 1; i <= n; i++) {
				service.startLesson(i);
				service.completeLesson(i);
			}
		}

		function deleteCardsStartingWith(prefix: string): void {
			const state = storage.load();
			for (const id of Object.keys(state.cards)) {
				if (id.startsWith(prefix)) delete state.cards[id];
			}
			storage.save(state);
		}

		it("has nothing pending before any reconcile runs", () => {
			completeLessonsUpTo(at(14));
			expect(service.getPendingCatchUps()).toHaveLength(0);
		});

		it("flags a pending catch-up scoped to just the backfilled items", () => {
			completeLessonsUpTo(at(14));
			// Simulate the rare-tail lesson having been completed before rare vowels were
			// wired into card generation.
			deleteCardsStartingWith("ฤ:");
			deleteCardsStartingWith("ฤๅ:");
			deleteCardsStartingWith("ฦ:");
			deleteCardsStartingWith("ฦๅ:");

			service.reconcileCards();

			const pending = service.getPendingCatchUps();
			expect(pending).toHaveLength(1);
			expect(pending[0]?.lessonNumber).toBe(at(14));
			expect(pending[0]?.summary.rareVowels.map((v) => v.character)).toEqual([
				"ฤ",
				"ฤๅ",
				"ฦ",
				"ฦๅ",
			]);
			// Consonants ฃ, ฅ, ฌ from the same lesson were never removed, so
			// they aren't part of the catch-up.
			expect(pending[0]?.summary.consonants).toHaveLength(0);
			expect(pending[0]?.summary.videoUrl).toBeUndefined();
		});

		it("getPendingCatchUpCards returns only the pending items' live review cards", () => {
			completeLessonsUpTo(at(14));
			deleteCardsStartingWith("ฤ:");
			service.reconcileCards();

			const cards = service.getPendingCatchUpCards(at(14));
			expect(cards.length).toBeGreaterThan(0);
			expect(cards.every((c) => c.id.startsWith("ฤ:"))).toBe(true);
		});

		it("returns no cards for a lesson with nothing pending", () => {
			completeLessonsUpTo(at(14));
			expect(service.getPendingCatchUpCards(at(14))).toHaveLength(0);
		});

		it("dismissPendingCatchUp clears the pending entry", () => {
			completeLessonsUpTo(at(14));
			deleteCardsStartingWith("ฤ:");
			service.reconcileCards();
			expect(service.getPendingCatchUps()).toHaveLength(1);

			service.dismissPendingCatchUp(at(14));

			expect(service.getPendingCatchUps()).toHaveLength(0);
		});
	});
});
