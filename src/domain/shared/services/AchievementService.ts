import { SrsStage } from "../../srs/value-objects/SrsStage";
import type { LearnerState, SessionSummary } from "../types";

export class AchievementService {
	/**
	 * Returns IDs of achievements newly earned given the current state and last session.
	 * Pure computation — does NOT modify state. Caller is responsible for persisting.
	 */
	checkNewAchievements(
		state: LearnerState,
		session: SessionSummary,
	): string[] {
		const alreadyUnlocked = new Set(state.achievements ?? []);
		const earned: string[] = [];

		const check = (id: string, condition: boolean) => {
			if (condition && !alreadyUnlocked.has(id)) earned.push(id);
		};

		const { completedLessons, sessionHistory, cards, vocabCards, grammarCards } = state;

		// Lesson milestones
		check("first_lesson", completedLessons.length >= 1);
		check("five_lessons", completedLessons.length >= 5);
		check("all_lessons", completedLessons.length >= 25);

		// Review milestones
		const reviewSessions = sessionHistory.filter(
			(s) =>
				s.type === "review" ||
				s.type === "vocab-review" ||
				s.type === "grammar-review",
		);
		check("first_review", reviewSessions.length >= 1);

		const totalReviewed = sessionHistory.reduce((sum, s) => sum + s.totalCards, 0);
		check("century", totalReviewed >= 100);
		check("warrior", totalReviewed >= 500);

		// Card stage checks — scan all pools
		const allSrsData = [
			...Object.values(cards).map((c) => c.srs),
			...Object.values(vocabCards).map((c) => c.srs),
			...Object.values(grammarCards).map((c) => c.srs),
		];

		// "Guru" = any graduated card (learningStep === null and interval > 0)
		const hasGuruCard = allSrsData.some(
			(srs) => srs.learningStep === null && srs.interval > 0,
		);
		// "Master" = interval >= GURU_THRESHOLD (14 days = 20160 min)
		const hasMasterCard = allSrsData.some(
			(srs) =>
				srs.learningStep === null &&
				srs.interval >= SrsStage.GURU_THRESHOLD,
		);
		// "Burned" = interval >= ENLIGHTENED_THRESHOLD (84 days = 120960 min)
		const hasBurnedCard = allSrsData.some(
			(srs) =>
				srs.learningStep === null &&
				srs.interval >= SrsStage.ENLIGHTENED_THRESHOLD,
		);

		check("first_guru", hasGuruCard);
		check("first_master", hasMasterCard);
		check("first_burned", hasBurnedCard);

		// Content starts
		check("vocab_start", Object.keys(vocabCards).length > 0);
		const hasGrammarSession = sessionHistory.some(
			(s) => s.type === "grammar-lesson" || s.type === "grammar-review",
		);
		check("grammar_start", hasGrammarSession);

		// Perfect session: check the current session only
		check(
			"perfect_session",
			session.accuracy === 100 && session.totalCards >= 10,
		);

		return earned;
	}
}
