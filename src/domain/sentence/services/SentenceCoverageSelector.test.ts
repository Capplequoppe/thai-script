import { describe, expect, it } from "vitest";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { SentenceReviewCard } from "../entities/SentenceReviewCard";
import type { SentenceEntry, SentenceProperty } from "../types";
import {
	DEFAULT_SENTENCE_BUDGET,
	SentenceCoverageSelector,
} from "./SentenceCoverageSelector";

const NOW = "2026-01-10T00:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const DAY = 86_400_000;

function at(offsetMs: number): string {
	return new Date(NOW_MS + offsetMs).toISOString();
}

function entry(id: string, words: string[], grammarId?: string): SentenceEntry {
	return {
		id,
		thai: `thai of ${id}`,
		romanization: `rom of ${id}`,
		english: `english of ${id}`,
		words,
		...(grammarId ? { grammarId } : {}),
		difficulty: 1,
		thai_audio_file: null,
		cards: { readingComprehension: { distractors: [] } },
	};
}

function card(
	sentenceId: string,
	nextReviewDate: string,
	property: SentenceProperty = "readingComprehension",
): SentenceReviewCard {
	return new SentenceReviewCard(
		`sentence:${sentenceId}:${property}`,
		`question for ${sentenceId}`,
		`answer for ${sentenceId}`,
		[],
		SrsSchedule.fromDTO({
			easeFactor: 2.5,
			interval: 1440,
			repetitions: 1,
			learningStep: null,
			nextReviewDate,
			lastReviewDate: null,
		}),
		sentenceId,
		property,
	);
}

/** The ids of the sentences a selection drew from, in the order chosen. */
function sentenceIdsOf(cards: readonly ReviewableCard[]): string[] {
	const seen: string[] = [];
	for (const c of cards) {
		if (c instanceof SentenceReviewCard && !seen.includes(c.sentenceId)) {
			seen.push(c.sentenceId);
		}
	}
	return seen;
}

/** Every card is due; `allCards` and `dueCards` coincide. */
function allDue(
	selector: SentenceCoverageSelector,
	cards: readonly ReviewableCard[],
	maxCards?: number,
) {
	return selector.select({
		dueCards: cards,
		allCards: cards,
		maxCards,
		now: NOW,
	});
}

describe("SentenceCoverageSelector", () => {
	describe("session size", () => {
		it("caps the session at the sentence budget", () => {
			const sentences = Array.from({ length: 40 }, (_, i) =>
				entry(`s${String(i).padStart(2, "0")}`, [`w${i}`]),
			);
			const cards = sentences.map((s) => card(s.id, at(-DAY)));

			const selected = allDue(new SentenceCoverageSelector(sentences), cards);

			expect(sentenceIdsOf(selected)).toHaveLength(DEFAULT_SENTENCE_BUDGET);
		});

		it("takes every due card of a sentence it picks", () => {
			const sentences = [entry("s1", ["a"])];
			const cards = [
				card("s1", at(-DAY), "selfValidation"),
				card("s1", at(-DAY), "readingComprehension"),
				card("s1", at(-DAY), "sentenceBuilding"),
			];

			const selected = allDue(
				new SentenceCoverageSelector(sentences, 1),
				cards,
			);

			// Grouped together and in the canonical exercise order, not the
			// order the repository happened to return them in.
			expect(selected.map((c) => (c as SentenceReviewCard).property)).toEqual([
				"readingComprehension",
				"sentenceBuilding",
				"selfValidation",
			]);
		});

		it("honours an explicit maxCards cap", () => {
			const sentences = [entry("s1", ["a"]), entry("s2", ["b"])];
			const cards = [
				card("s1", at(-DAY), "readingComprehension"),
				card("s1", at(-DAY), "selfValidation"),
				card("s2", at(-DAY), "readingComprehension"),
			];

			const selected = allDue(
				new SentenceCoverageSelector(sentences),
				cards,
				2,
			);

			expect(selected).toHaveLength(2);
		});

		it("returns nothing when nothing is due", () => {
			const selector = new SentenceCoverageSelector([entry("s1", ["a"])]);

			expect(selector.select({ dueCards: [], allCards: [], now: NOW })).toEqual(
				[],
			);
		});
	});

	describe("spreading a session across the material", () => {
		it("does not pair two sentences built from the same words when a different one is available", () => {
			// s1 and s2 are the near-duplicates the learner complains about:
			// same words, so practising one teaches what the other would.
			const sentences = [
				entry("s1", ["a", "b"]),
				entry("s2", ["a", "b"]),
				entry("s3", ["c", "d"]),
			];
			const cards = sentences.map((s) => card(s.id, at(-DAY)));

			const chosen = sentenceIdsOf(
				allDue(new SentenceCoverageSelector(sentences, 2), cards),
			);

			expect(chosen).toHaveLength(2);
			expect(chosen).toContain("s3");
			expect(chosen).not.toEqual(expect.arrayContaining(["s1", "s2"]));
		});

		it("falls back to the duplicate once the distinct material runs out", () => {
			const sentences = [
				entry("s1", ["a", "b"]),
				entry("s2", ["a", "b"]),
				entry("s3", ["c", "d"]),
			];
			const cards = sentences.map((s) => card(s.id, at(-DAY)));

			const chosen = sentenceIdsOf(
				allDue(new SentenceCoverageSelector(sentences, 3), cards),
			);

			expect(chosen.sort()).toEqual(["s1", "s2", "s3"]);
		});

		it("treats a shared grammar point as shared material too", () => {
			// Disjoint words, but s1 and s2 drill the same pattern.
			const sentences = [
				entry("s1", ["a"], "g1"),
				entry("s2", ["b"], "g1"),
				entry("s3", ["c"], "g2"),
			];
			const cards = sentences.map((s) => card(s.id, at(-DAY)));

			const chosen = sentenceIdsOf(
				allDue(new SentenceCoverageSelector(sentences, 2), cards),
			);

			expect(chosen).toContain("s3");
			expect(chosen).not.toEqual(expect.arrayContaining(["s1", "s2"]));
		});

		it("prefers the material that has gone longest without exposure", () => {
			const sentences = [entry("s1", ["a"]), entry("s2", ["b"])];
			const cards = [card("s1", at(-3600_000)), card("s2", at(-10 * DAY))];

			const chosen = sentenceIdsOf(
				allDue(new SentenceCoverageSelector(sentences, 1), cards),
			);

			expect(chosen).toEqual(["s2"]);
		});
	});

	describe("coverage from cards that are not in the session", () => {
		it("skips a sentence whose words another sentence already has scheduled far ahead", () => {
			const sentences = [
				entry("s1", ["common"]),
				entry("s2", ["common", "rare"]),
				entry("s3", ["common"]),
			];
			const dueCards = [card("s1", at(-DAY)), card("s2", at(-DAY))];
			// Not due, so not reviewable today — but it is why "common" needs
			// no help from this session.
			const scheduledAhead = card("s3", at(30 * DAY));

			const selected = new SentenceCoverageSelector(sentences, 1).select({
				dueCards,
				allCards: [...dueCards, scheduledAhead],
				now: NOW,
			});

			expect(sentenceIdsOf(selected)).toEqual(["s2"]);
		});

		it("ranks a word the learner just failed above one they just passed", () => {
			// `p` is carried by a sentence pushed 30 days out (passed);
			// `f` by one demoted to due-now (failed). Both candidates below
			// also carry the same neutral word `k`, so the only difference
			// between them is which of `p`/`f` they re-expose.
			const sentences = [
				entry("passed", ["p"]),
				entry("failed", ["f"]),
				entry("c1", ["p", "k"]),
				entry("c2", ["f", "k"]),
			];
			const passed = card("passed", at(30 * DAY));
			const failed = card("failed", at(0));
			const dueCards = [failed, card("c1", at(-DAY)), card("c2", at(-DAY))];

			const selected = new SentenceCoverageSelector(sentences, 1).select({
				dueCards,
				allCards: [...dueCards, passed],
				now: NOW,
			});

			expect(sentenceIdsOf(selected)).toEqual(["c2"]);
		});
	});

	describe("robustness", () => {
		it("keeps due cards whose sentence is no longer in the data", () => {
			const sentences = [entry("s1", ["a"])];
			const orphan = card("deleted-sentence", at(-DAY));
			const cards = [card("s1", at(-DAY)), orphan];

			const selected = allDue(new SentenceCoverageSelector(sentences), cards);

			expect(selected).toContain(orphan);
			expect(selected).toHaveLength(2);
		});

		it("returns only cards the repository reported as due", () => {
			const sentences = [entry("s1", ["a"]), entry("s2", ["b"])];
			const due = card("s1", at(-DAY));
			const notDue = card("s2", at(30 * DAY));

			const selected = new SentenceCoverageSelector(sentences).select({
				dueCards: [due],
				allCards: [due, notDue],
				now: NOW,
			});

			expect(selected).toEqual([due]);
		});

		it("is deterministic for the same state", () => {
			const sentences = Array.from({ length: 20 }, (_, i) =>
				entry(`s${String(i).padStart(2, "0")}`, [`w${i % 7}`, `x${i}`]),
			);
			const cards = sentences.map((s, i) => card(s.id, at(-DAY - i * 1000)));
			const selector = new SentenceCoverageSelector(sentences);

			expect(sentenceIdsOf(allDue(selector, cards))).toEqual(
				sentenceIdsOf(allDue(selector, cards)),
			);
		});

		it("rejects an unparseable `now`", () => {
			const selector = new SentenceCoverageSelector([entry("s1", ["a"])]);

			expect(() =>
				selector.select({ dueCards: [], allCards: [], now: "not a date" }),
			).toThrow(/unparseable now/);
		});
	});
});
