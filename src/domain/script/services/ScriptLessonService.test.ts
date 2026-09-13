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
import { LearningService } from "./ScriptLessonService";

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
			const lesson = service.startLesson(1);
			expect(lesson).not.toBeNull();
			expect(lesson?.lessonNumber).toBe(1);
			expect(lesson?.cards.length).toBeGreaterThan(0);
		});

		it("persists cards to storage", () => {
			service.startLesson(1);
			const state = storage.load();
			expect(Object.keys(state.cards).length).toBeGreaterThan(0);
		});

		it("sets currentLesson in state", () => {
			service.startLesson(1);
			const state = storage.load();
			expect(state.currentLesson).toBe(1);
		});

		it("throws if lesson is already completed", () => {
			service.startLesson(1);
			service.completeLesson(1);
			expect(() => service.startLesson(1)).toThrow();
		});

		it("requires sequential lessons (cannot skip)", () => {
			expect(() => service.startLesson(3)).toThrow();
		});
	});

	describe("completeLesson", () => {
		it("marks lesson as completed", () => {
			service.startLesson(1);
			service.completeLesson(1);
			const state = storage.load();
			expect(state.completedLessons).toContain(1);
			expect(state.currentLesson).toBeNull();
		});
	});

	describe("unlearnLesson", () => {
		it("removes lesson and its cards from state", () => {
			service.startLesson(1);
			service.completeLesson(1);
			service.unlearnLesson(1);
			const state = storage.load();
			expect(state.completedLessons).not.toContain(1);
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
			service.startLesson(1);
			service.completeLesson(1);
			expect(service.getNextLesson()).toBe(2);
		});

		it("returns null after all 25 lessons completed", () => {
			const _reviewService = new ReviewService(cardRepo, stateRepo);
			for (let i = 1; i <= 25; i++) {
				service.startLesson(i);
				service.completeLesson(i);
				// Graduate all cards for this lesson so mastery gate passes
				const state = storage.load();
				for (const card of Object.values(state.cards)) {
					if (card.lessonNumber === i && card.srs.learningStep !== null) {
						card.srs.learningStep = null;
						card.srs.interval = 4320;
					}
				}
				storage.save(state);
			}
			expect(service.getNextLesson()).toBeNull();
		});
	});

	describe("getLessonSummary", () => {
		it("returns lesson with symbol info for a given lesson number", () => {
			const summary = service.getLessonSummary(1);
			expect(summary.lessonNumber).toBe(1);
			expect(summary.consonants.length).toBeGreaterThan(0);
		});

		it("includes rare vowels for lesson 22", () => {
			const summary = service.getLessonSummary(22);
			expect(summary.rareVowels.map((v) => v.character)).toEqual([
				"ฤ",
				"ฤๅ",
				"ฦ",
				"ฦๅ",
			]);
		});

		it("includes numerals for lesson 23", () => {
			const summary = service.getLessonSummary(23);
			expect(summary.numerals.map((n) => n.character)).toEqual(["๑", "๒", "๓"]);
		});

		it("includes tone rule ids matching their generated card ids", () => {
			const summary = service.getLessonSummary(2);
			expect(summary.toneRules).toEqual([
				{ id: "tone-rule:low-live", description: expect.any(String) },
			]);
		});

		it("includes tone mark rule ids matching their generated card ids", () => {
			const summary = service.getLessonSummary(17);
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
			service.startLesson(1);
			service.completeLesson(1);
			expect(service.startLesson(2)).not.toBeNull();
		});

		it("getLessonMasteryProgress returns correct total/graduated/percentage", () => {
			service.startLesson(1);
			service.completeLesson(1);

			const beforeProgress = service.getLessonMasteryProgress(1);
			expect(beforeProgress.total).toBeGreaterThan(0);
			expect(beforeProgress.graduated).toBe(0);
			expect(beforeProgress.percentage).toBe(0);

			// Graduate all cards
			graduateAllCards(storage, 1);

			const afterProgress = service.getLessonMasteryProgress(1);
			expect(afterProgress.graduated).toBe(afterProgress.total);
			expect(afterProgress.percentage).toBe(1);
		});

		it("startLesson succeeds when previous lesson is mastered", () => {
			service.startLesson(1);
			service.completeLesson(1);
			graduateAllCards(storage, 1);

			const lesson2 = service.startLesson(2);
			expect(lesson2).not.toBeNull();
			expect(lesson2?.lessonNumber).toBe(2);
		});

		it("isNextLessonAvailable returns true after completing lessons", () => {
			service.startLesson(1);
			service.completeLesson(1);
			service.startLesson(2);
			service.completeLesson(2);
			service.startLesson(3);
			service.completeLesson(3);
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
			const result = gatedService.startLesson(1);
			expect(result).toBeNull();
		});

		it("works normally without ApprenticeService (backward compat)", () => {
			const result = service.startLesson(1);
			expect(result).not.toBeNull();
			expect(result?.lessonNumber).toBe(1);
		});
	});

	describe("reconcileCards", () => {
		it("backfills a persisted card's audioUrl once completed lessons regain it, without touching other cards' srs", () => {
			service.startLesson(1);
			service.completeLesson(1);

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
			completeLessonsUpTo(22);
			expect(service.getPendingCatchUps()).toHaveLength(0);
		});

		it("flags a pending catch-up scoped to just the backfilled items", () => {
			completeLessonsUpTo(22);
			// Simulate lesson 22 having been completed before rare vowels were
			// wired into card generation.
			deleteCardsStartingWith("ฤ:");
			deleteCardsStartingWith("ฤๅ:");
			deleteCardsStartingWith("ฦ:");
			deleteCardsStartingWith("ฦๅ:");

			service.reconcileCards();

			const pending = service.getPendingCatchUps();
			expect(pending).toHaveLength(1);
			expect(pending[0]?.lessonNumber).toBe(22);
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
			completeLessonsUpTo(22);
			deleteCardsStartingWith("ฤ:");
			service.reconcileCards();

			const cards = service.getPendingCatchUpCards(22);
			expect(cards.length).toBeGreaterThan(0);
			expect(cards.every((c) => c.id.startsWith("ฤ:"))).toBe(true);
		});

		it("returns no cards for a lesson with nothing pending", () => {
			completeLessonsUpTo(22);
			expect(service.getPendingCatchUpCards(22)).toHaveLength(0);
		});

		it("dismissPendingCatchUp clears the pending entry", () => {
			completeLessonsUpTo(22);
			deleteCardsStartingWith("ฤ:");
			service.reconcileCards();
			expect(service.getPendingCatchUps()).toHaveLength(1);

			service.dismissPendingCatchUp(22);

			expect(service.getPendingCatchUps()).toHaveLength(0);
		});
	});
});
