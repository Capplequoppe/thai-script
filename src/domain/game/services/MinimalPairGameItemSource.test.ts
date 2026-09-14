import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import type { CardPool } from "../../shared/CardPool";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { ToneMinimalPairGroup, VocabEntry } from "../../vocabulary/types";
import { MinimalPairGameItemSource } from "./MinimalPairGameItemSource";

function vocabEntry(overrides: Partial<VocabEntry> = {}): VocabEntry {
	return {
		thai: "ไม่",
		romanization: "mâj",
		word_class: "adv",
		english: "not",
		rank: 20,
		frequency: 100,
		mnemonic: null,
		characters: [],
		syllables: [],
		toneRules: [],
		toneStatus: "verified",
		thai_audio_file: "/audio/word-maj.mp3",
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
		...overrides,
	};
}

function vocabCard(thai: string, property = "thaiToEnglish"): VocabCard {
	return new VocabCard(
		`vocab:${thai}:${property}`,
		"question",
		"answer",
		["answer"],
		SrsSchedule.initial(),
		thai,
		property,
	);
}

function repositoryOf(cards: readonly ReviewableCard[]): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => (pool === "vocab" ? [...cards] : []),
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

/** ไม่ (falling) / ไหม (rising) / ใหม่ (low) — the canonical group. */
const MAJ_GROUP: ToneMinimalPairGroup = {
	key: "m a j",
	members: [
		{ thai: "ไม่", tones: ["falling"] },
		{ thai: "ไหม", tones: ["rising"] },
		{ thai: "ใหม่", tones: ["low"] },
	],
};

const MAJ_ENTRIES: VocabEntry[] = [
	vocabEntry({ thai: "ไม่", english: "not", thai_audio_file: "/a/maj.mp3" }),
	vocabEntry({
		thai: "ไหม",
		english: "question particle",
		thai_audio_file: "/a/mai.mp3",
	}),
	vocabEntry({ thai: "ใหม่", english: "new", thai_audio_file: null }),
];

describe("MinimalPairGameItemSource", () => {
	it("keeps only the group members the learner has cards for", () => {
		const source = new MinimalPairGameItemSource(
			repositoryOf([vocabCard("ไม่"), vocabCard("ไหม")]),
			MAJ_ENTRIES,
			[MAJ_GROUP],
		);

		const [group] = source.eligibleGroups();

		expect(group?.groupKey).toBe("m a j");
		expect(group?.members.map((m) => m.thaiWord)).toEqual(["ไม่", "ไหม"]);
	});

	it("drops a group with only one learned member — one word is not a contrast", () => {
		const source = new MinimalPairGameItemSource(
			repositoryOf([vocabCard("ไม่")]),
			MAJ_ENTRIES,
			[MAJ_GROUP],
		);

		expect(source.eligibleGroups()).toEqual([]);
	});

	it("drops a group whose learned members share a tone pattern", () => {
		const sameTone: ToneMinimalPairGroup = {
			key: "b aː n",
			members: [
				{ thai: "บ้าน", tones: ["falling"] },
				{ thai: "บาน", tones: ["mid"] },
				{ thai: "บ๊าน", tones: ["falling"] },
			],
		};
		const source = new MinimalPairGameItemSource(
			// Both learned words are the falling pair — the mid one is not.
			repositoryOf([vocabCard("บ้าน"), vocabCard("บ๊าน")]),
			[
				vocabEntry({ thai: "บ้าน", english: "house" }),
				vocabEntry({ thai: "บาน", english: "bloom" }),
				vocabEntry({ thai: "บ๊าน", english: "nonsense" }),
			],
			[sameTone],
		);

		expect(source.eligibleGroups()).toEqual([]);
	});

	it("counts any vocab property as 'introduced', not just one", () => {
		const source = new MinimalPairGameItemSource(
			repositoryOf([
				vocabCard("ไม่", "spellingFromAudio"),
				vocabCard("ไหม", "englishToThai"),
			]),
			MAJ_ENTRIES,
			[MAJ_GROUP],
		);

		expect(source.eligibleGroups()).toHaveLength(1);
	});

	it("separates the members that have a recording from those that do not", () => {
		const source = new MinimalPairGameItemSource(
			repositoryOf([vocabCard("ไม่"), vocabCard("ไหม"), vocabCard("ใหม่")]),
			MAJ_ENTRIES,
			[MAJ_GROUP],
		);

		const [group] = source.eligibleGroups();

		expect(group?.members.map((m) => m.thaiWord)).toEqual(["ไม่", "ไหม", "ใหม่"]);
		// ใหม่ has `thai_audio_file: null` — eligible as a distractor for the
		// meaning/tone questions, never as a clip to pick between.
		expect(group?.audibleMembers.map((m) => m.thaiWord)).toEqual(["ไม่", "ไหม"]);
	});

	it("takes tones from the pair group and meaning from the VocabEntry", () => {
		const source = new MinimalPairGameItemSource(
			repositoryOf([vocabCard("ไม่"), vocabCard("ไหม")]),
			MAJ_ENTRIES,
			[MAJ_GROUP],
		);

		const [group] = source.eligibleGroups();

		expect(group?.members[0]).toEqual({
			thaiWord: "ไม่",
			englishMeaning: "not",
			tones: ["falling"],
			audioUrl: "/a/maj.mp3",
		});
	});

	it("ignores a card whose id is not a vocab id, and a group word with no entry", () => {
		const stray = new VocabCard(
			"notavocabid",
			"q",
			"a",
			["a"],
			SrsSchedule.initial(),
			"ไม่",
			"thaiToEnglish",
		);
		const source = new MinimalPairGameItemSource(
			repositoryOf([stray, vocabCard("ไม่"), vocabCard("ไหม")]),
			// ไหม has no entry at all — it cannot supply a meaning or a clip.
			MAJ_ENTRIES.filter((entry) => entry.thai !== "ไหม"),
			[MAJ_GROUP],
		);

		expect(source.eligibleGroups()).toEqual([]);
	});

	it("resolves a duplicated Thai spelling to its best-ranked entry", () => {
		const source = new MinimalPairGameItemSource(
			repositoryOf([vocabCard("ไม่"), vocabCard("ไหม")]),
			[
				vocabEntry({ thai: "ไม่", english: "not", rank: 20 }),
				vocabEntry({ thai: "ไม่", english: "no", rank: 900 }),
				vocabEntry({ thai: "ไหม", english: "question particle" }),
			],
			[MAJ_GROUP],
		);

		const [group] = source.eligibleGroups();

		expect(group?.members[0]?.englishMeaning).toBe("not");
	});
});
