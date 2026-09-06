import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import realSentenceData from "../../sentence/data/sentences.json";
import { SentenceReviewCard } from "../../sentence/entities/SentenceReviewCard";
import type { SentenceEntry, SentenceProperty } from "../../sentence/types";
import type { CardPool } from "../../shared/CardPool";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { SentenceGameItemSource } from "./SentenceGameItemSource";

const REAL_SENTENCES = realSentenceData as unknown as SentenceEntry[];

function sentenceEntry(
	id: string,
	overrides: Partial<SentenceEntry> = {},
): SentenceEntry {
	return {
		id,
		thai: `thai of ${id}`,
		romanization: `romanization of ${id}`,
		english: `english of ${id}`,
		words: ["a", "b"],
		difficulty: 1,
		thai_audio_file: null,
		cards: { readingComprehension: { distractors: [] } },
		...overrides,
	};
}

function sentenceCard(
	id: string,
	sentenceId: string,
	property: SentenceProperty,
	question: string,
	correctAnswer: string,
): SentenceReviewCard {
	return new SentenceReviewCard(
		id,
		question,
		correctAnswer,
		[correctAnswer],
		SrsSchedule.initial(),
		sentenceId,
		property,
		"/audio/card-specific.mp3",
	);
}

function repositoryOf(cards: readonly ReviewableCard[]): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => (pool === "sentence" ? [...cards] : []),
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

describe("SentenceGameItemSource", () => {
	it("AC2: takes content from the SentenceEntry, never from any card's own fields", () => {
		const entry = sentenceEntry("basic-001", {
			thai: "มา กิน กัน",
			english: "Come eat together",
			thai_audio_file: "/audio/basic-001.mp3",
		});
		const cards = [
			sentenceCard(
				"s1",
				"basic-001",
				"listeningComprehension",
				"listening question",
				"listening answer",
			),
			sentenceCard(
				"s2",
				"basic-001",
				"readingComprehension",
				"reading question",
				"reading answer",
			),
		];
		const source = new SentenceGameItemSource(repositoryOf(cards), [entry]);

		const content = source.eligibleContent();

		expect(content).toEqual([
			{
				kind: "sentence",
				sentenceId: "basic-001",
				thaiText: "มา กิน กัน",
				englishMeaning: "Come eat together",
				audioUrl: "/audio/basic-001.mp3",
			},
		]);

		// Two cards, one item: the two disagree by design, so neither one's
		// own fields may reach the reveal.
		const cardValues = cards.flatMap((card) => [
			card.question,
			card.correctAnswer,
			card.audioUrl,
		]);
		const item = content[0];
		if (item?.kind !== "sentence") throw new Error("unreachable");
		expect(cardValues).not.toContain(item.thaiText);
		expect(cardValues).not.toContain(item.englishMeaning);
		expect(cardValues).not.toContain(item.audioUrl);
	});

	it("AC6: excludes a sentence card whose sentenceId has no matching entry", () => {
		const source = new SentenceGameItemSource(
			repositoryOf([
				sentenceCard("s1", "deleted-999", "readingComprehension", "Q", "A"),
			]),
			[sentenceEntry("basic-001")],
		);

		expect(source.eligibleContent()).toEqual([]);
	});

	it("AC6: keeps the entry-backed sentence when another card's sentence is missing", () => {
		const source = new SentenceGameItemSource(
			repositoryOf([
				sentenceCard("s1", "deleted-999", "readingComprehension", "Q", "A"),
				sentenceCard("s2", "basic-001", "readingComprehension", "Q", "A"),
			]),
			[sentenceEntry("basic-001")],
		);

		expect(
			source
				.eligibleContent()
				.map((item) => (item.kind === "sentence" ? item.sentenceId : null)),
		).toEqual(["basic-001"]);
	});

	it("leaves audioUrl undefined for an audio-less sentence", () => {
		const source = new SentenceGameItemSource(
			repositoryOf([
				sentenceCard("s1", "basic-001", "readingComprehension", "Q", "A"),
			]),
			[sentenceEntry("basic-001", { thai_audio_file: null })],
		);

		expect(source.eligibleContent()[0]?.audioUrl).toBeUndefined();
	});

	it("reports the sentence pool", () => {
		expect(new SentenceGameItemSource(repositoryOf([]), []).pool).toBe(
			"sentence",
		);
	});

	it("is empty when no sentence cards exist", () => {
		expect(
			new SentenceGameItemSource(repositoryOf([]), [
				sentenceEntry("basic-001"),
			]).eligibleContent(),
		).toEqual([]);
	});

	it("ignores cards that are not SentenceReviewCards", () => {
		const foreign = {
			id: "not-a-sentence-card",
			sentenceId: "basic-001",
		} as unknown as ReviewableCard;

		expect(
			new SentenceGameItemSource(repositoryOf([foreign]), [
				sentenceEntry("basic-001"),
			]).eligibleContent(),
		).toEqual([]);
	});

	it("AC3: the real shipped sentences.json carries no audio at all", () => {
		// The regression guard behind AC3's second half: if a future data drop
		// adds audio, this fails loudly and the "every item is reading" claim
		// in GameItemSelectionService.test.ts must be revisited rather than
		// silently becoming a coincidence.
		expect(REAL_SENTENCES.length).toBeGreaterThan(0);
		expect(
			REAL_SENTENCES.filter((entry) => entry.thai_audio_file !== null),
		).toEqual([]);
	});
});
