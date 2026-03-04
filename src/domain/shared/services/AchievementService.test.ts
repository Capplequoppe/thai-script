import { describe, expect, it } from "vitest";
import type { LearnerState, SessionSummary } from "../../shared/types";
import { INITIAL_LEARNER_STATE } from "../../shared/types";
import { AchievementService } from "./AchievementService";

const service = new AchievementService();

function makeSession(
	overrides: { type?: string; totalCards?: number; accuracy?: number } = {},
): SessionSummary {
	const totalCards = overrides.totalCards ?? 5;
	const accuracy = overrides.accuracy ?? 100;
	const correctCount = Math.round((accuracy / 100) * totalCards);
	return {
		sessionId: "s1",
		type: (overrides.type ?? "review") as SessionSummary["type"],
		completedAt: new Date().toISOString(),
		durationMs: 60_000,
		totalCards,
		correctCount,
		incorrectCount: totalCards - correctCount,
		accuracy,
		newCardsGraduated: 0,
	};
}

function makeCard(learningStep: number | null, interval: number) {
	return {
		id: crypto.randomUUID(),
		question: "test",
		correctAnswer: "test",
		choices: [],
		srs: {
			easeFactor: 2.0,
			interval,
			repetitions: 1,
			learningStep,
			nextReviewDate: new Date().toISOString(),
			lastReviewDate: null,
			lapseCount: 0,
		},
		symbolCharacter: "ก",
		property: "recognition" as const,
		lessonNumber: 1,
	};
}

describe("AchievementService", () => {
	it("returns no achievements for empty state", () => {
		const result = service.checkNewAchievements(
			INITIAL_LEARNER_STATE,
			makeSession(),
		);
		expect(result).toHaveLength(0);
	});

	it("skips already-unlocked achievements", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1],
			achievements: ["first_lesson"],
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).not.toContain("first_lesson");
	});

	it("unlocks first_lesson after completing 1 lesson", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1],
		};
		const result = service.checkNewAchievements(
			state,
			makeSession({ type: "lesson" }),
		);
		expect(result).toContain("first_lesson");
	});

	it("unlocks five_lessons after completing 5 lessons", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1, 2, 3, 4, 5],
			achievements: ["first_lesson"],
		};
		const result = service.checkNewAchievements(
			state,
			makeSession({ type: "lesson" }),
		);
		expect(result).toContain("five_lessons");
		expect(result).not.toContain("first_lesson");
	});

	it("unlocks all_lessons after completing all 25 lessons", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: Array.from({ length: 25 }, (_, i) => i + 1),
			achievements: ["first_lesson", "five_lessons"],
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("all_lessons");
	});

	it("unlocks first_review on first review session", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			sessionHistory: [makeSession({ type: "review" })],
		};
		const result = service.checkNewAchievements(
			state,
			makeSession({ type: "review" }),
		);
		expect(result).toContain("first_review");
	});

	it("unlocks century when total reviewed >= 100", () => {
		const sessions = Array.from({ length: 10 }, () =>
			makeSession({ totalCards: 10 }),
		);
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			sessionHistory: sessions,
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("century");
	});

	it("does not unlock century when total reviewed < 100", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			sessionHistory: [makeSession({ totalCards: 50 })],
		};
		const result = service.checkNewAchievements(
			state,
			makeSession({ totalCards: 20 }),
		);
		expect(result).not.toContain("century");
	});

	it("unlocks first_guru when a card has graduated (learningStep null, non-zero interval)", () => {
		const card = makeCard(null, 5000); // graduated, Guru stage
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { [card.id]: card },
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("first_guru");
	});

	it("does not unlock first_guru for apprentice card (learningStep not null)", () => {
		const card = makeCard(1, 10); // still in learning phase
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { [card.id]: card },
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).not.toContain("first_guru");
	});

	it("unlocks first_master when a card has interval >= GURU_THRESHOLD (20160)", () => {
		const card = makeCard(null, 20_160); // Master stage
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { [card.id]: card },
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("first_master");
		expect(result).toContain("first_guru"); // first_guru also unlocked
	});

	it("unlocks first_burned when a card has interval >= ENLIGHTENED_THRESHOLD (120960)", () => {
		const card = makeCard(null, 120_960); // Burned
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { [card.id]: card },
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("first_burned");
		expect(result).toContain("first_guru");
		expect(result).toContain("first_master");
	});

	it("unlocks vocab_start when vocabCards count > 0", () => {
		const vocabCard = {
			id: crypto.randomUUID(),
			question: "test",
			correctAnswer: "test",
			choices: [],
			srs: {
				easeFactor: 2.0,
				interval: 10,
				repetitions: 0,
				learningStep: 1,
				nextReviewDate: new Date().toISOString(),
				lastReviewDate: null,
				lapseCount: 0,
			},
			promptWord: "ขา",
			property: "thaiToEnglish" as const,
		};
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			vocabCards: { [vocabCard.id]: vocabCard },
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("vocab_start");
	});

	it("unlocks grammar_start after a grammar session", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			sessionHistory: [makeSession({ type: "grammar-lesson" })],
		};
		const result = service.checkNewAchievements(state, makeSession());
		expect(result).toContain("grammar_start");
	});

	it("unlocks perfect_session for 100% accuracy with >= 10 cards", () => {
		const state = { ...INITIAL_LEARNER_STATE };
		const result = service.checkNewAchievements(
			state,
			makeSession({ accuracy: 100, totalCards: 10 }),
		);
		expect(result).toContain("perfect_session");
	});

	it("does NOT unlock perfect_session for < 10 cards", () => {
		const state = { ...INITIAL_LEARNER_STATE };
		const result = service.checkNewAchievements(
			state,
			makeSession({ accuracy: 100, totalCards: 9 }),
		);
		expect(result).not.toContain("perfect_session");
	});

	it("does NOT unlock perfect_session for < 100% accuracy", () => {
		const state = { ...INITIAL_LEARNER_STATE };
		const result = service.checkNewAchievements(
			state,
			makeSession({ accuracy: 90, totalCards: 20 }),
		);
		expect(result).not.toContain("perfect_session");
	});
});
