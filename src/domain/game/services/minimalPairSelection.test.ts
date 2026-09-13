import { describe, expect, it } from "vitest";
import type {
	AudibleMinimalPairOption,
	MinimalPairChallengeDirection,
	MinimalPairGameItem,
	MinimalPairOption,
	RandomSource,
} from "../types";
import type { EligibleMinimalPairGroup } from "./MinimalPairGameItemSource";
import { selectMinimalPairRound } from "./minimalPairSelection";

function option(
	thaiWord: string,
	englishMeaning: string,
	tones: string[],
	audioUrl?: string,
): MinimalPairOption {
	return { thaiWord, englishMeaning, tones, audioUrl };
}

function groupOf(
	key: string,
	members: readonly MinimalPairOption[],
): EligibleMinimalPairGroup {
	return {
		groupKey: key,
		members,
		audibleMembers: members.filter(
			(member): member is AudibleMinimalPairOption =>
				member.audioUrl !== undefined,
		),
	};
}

/** All three recorded — every direction is available. */
const FULLY_RECORDED = groupOf("m a j", [
	option("ไม่", "not", ["falling"], "/a/maj.mp3"),
	option("ไหม", "question particle", ["rising"], "/a/mai.mp3"),
	option("ใหม่", "new", ["low"], "/a/mai2.mp3"),
]);

/** Only the target is recorded — the two clip-answer directions are out. */
const PART_RECORDED = groupOf("s iː", [
	option("สี", "color", ["rising"], "/a/sii.mp3"),
	option("สี่", "four", ["low"]),
]);

/** A source of randomness that walks a fixed script, then repeats it. */
function scripted(values: readonly number[]): RandomSource {
	let index = 0;
	return () => values[index++ % values.length] as number;
}

/** Every direction this group produces across many draws. */
function directionsOver(
	group: EligibleMinimalPairGroup,
	draws: number,
): Set<MinimalPairChallengeDirection> {
	const seen = new Set<MinimalPairChallengeDirection>();
	for (let seed = 0; seed < draws; seed++) {
		for (const item of selectMinimalPairRound(
			[group],
			10,
			scripted([(seed % 97) / 97, ((seed * 7) % 89) / 89]),
		)) {
			seen.add(item.challengeDirection);
		}
	}
	return seen;
}

function isMinimalPair(item: {
	kind: string;
}): asserts item is MinimalPairGameItem {
	if (item.kind !== "minimalPair") throw new Error("expected a pair item");
}

describe("selectMinimalPairRound", () => {
	it("asks one question per recorded member of a group", () => {
		const items = selectMinimalPairRound([FULLY_RECORDED], 10, () => 0);

		expect(items).toHaveLength(3);
		expect(new Set(items.map((item) => item.thaiWord))).toEqual(
			new Set(["ไม่", "ไหม", "ใหม่"]),
		);
	});

	it("never targets a member with no recording", () => {
		const items = selectMinimalPairRound([PART_RECORDED], 10, () => 0);

		expect(items.map((item) => item.thaiWord)).toEqual(["สี"]);
	});

	it("caps the round at the requested count", () => {
		expect(selectMinimalPairRound([FULLY_RECORDED], 2, () => 0)).toHaveLength(
			2,
		);
		expect(selectMinimalPairRound([FULLY_RECORDED], 0, () => 0)).toEqual([]);
	});

	it("produces no items for a group whose only contrast is itself", () => {
		// One recorded word, and its only group-mate shares its meaning — so
		// there is no honest wrong answer to offer.
		const noContrast = groupOf("kʰ aː w", [
			option("ข้าว", "rice", ["falling"], "/a/khaao.mp3"),
			option("เข้า", "rice", ["falling"], "/a/khao.mp3"),
		]);

		expect(selectMinimalPairRound([noContrast], 10, () => 0)).toEqual([]);
	});

	it("offers all four directions when every member is recorded", () => {
		expect(directionsOver(FULLY_RECORDED, 60)).toEqual(
			new Set([
				"toneFromAudio",
				"meaningFromAudio",
				"audioFromMeaning",
				"audioFromTone",
			]),
		);
	});

	it("offers only the two audio-prompt directions when distractors have no clip", () => {
		expect(directionsOver(PART_RECORDED, 60)).toEqual(
			new Set(["toneFromAudio", "meaningFromAudio"]),
		);
	});

	it("gives every option a clip whenever the answer is a clip", () => {
		for (let seed = 0; seed < 60; seed++) {
			const items = selectMinimalPairRound(
				[FULLY_RECORDED],
				10,
				scripted([(seed % 97) / 97, ((seed * 13) % 89) / 89]),
			);
			for (const item of items) {
				if (
					item.challengeDirection !== "audioFromMeaning" &&
					item.challengeDirection !== "audioFromTone"
				) {
					continue;
				}
				for (const chosen of item.options) {
					expect(chosen.audioUrl).toBeTruthy();
				}
			}
		}
	});

	it("always includes the target among the options", () => {
		for (let seed = 0; seed < 40; seed++) {
			for (const item of selectMinimalPairRound(
				[FULLY_RECORDED, PART_RECORDED],
				10,
				scripted([(seed % 97) / 97, ((seed * 3) % 71) / 71]),
			)) {
				expect(item.options.some((o) => o.thaiWord === item.thaiWord)).toBe(
					true,
				);
			}
		}
	});

	it("keeps options pairwise distinct in word, tone pattern and meaning", () => {
		// A group deliberately seeded with a same-tone word and a same-gloss
		// word beside the real contrast: both must be refused as distractors,
		// or the question would have two right answers in some direction.
		const messy = groupOf("r i a n", [
			option("เรียน", "learn", ["mid"], "/a/rian.mp3"),
			option("เหรียญ", "coin", ["rising"], "/a/rian2.mp3"),
			option("เรียน", "study", ["mid"], "/a/rian3.mp3"),
			option("เรียญ", "coin", ["low"], "/a/rian4.mp3"),
		]);

		for (let seed = 0; seed < 60; seed++) {
			for (const item of selectMinimalPairRound(
				[messy],
				10,
				scripted([(seed % 97) / 97, ((seed * 11) % 83) / 83]),
			)) {
				const words = item.options.map((o) => o.thaiWord);
				const tones = item.options.map((o) => o.tones.join("-"));
				const meanings = item.options.map((o) => o.englishMeaning);
				expect(new Set(words).size).toBe(words.length);
				expect(new Set(tones).size).toBe(tones.length);
				expect(new Set(meanings).size).toBe(meanings.length);
			}
		}
	});

	it("never offers more than four options", () => {
		const wide = groupOf("k aː n", [
			option("กาน", "a", ["mid"], "/a/1.mp3"),
			option("ก่าน", "b", ["low"], "/a/2.mp3"),
			option("ก้าน", "c", ["falling"], "/a/3.mp3"),
			option("ก๊าน", "d", ["high"], "/a/4.mp3"),
			option("ก๋าน", "e", ["rising"], "/a/5.mp3"),
		]);

		for (let seed = 0; seed < 40; seed++) {
			for (const item of selectMinimalPairRound(
				[wide],
				10,
				scripted([(seed % 97) / 97, ((seed * 5) % 61) / 61]),
			)) {
				expect(item.options.length).toBeLessThanOrEqual(4);
				expect(item.options.length).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it("carries the group key and the target's own content onto the item", () => {
		const [item] = selectMinimalPairRound([PART_RECORDED], 1, () => 0);
		if (!item) throw new Error("expected an item");
		isMinimalPair(item);

		expect(item.kind).toBe("minimalPair");
		expect(item.groupKey).toBe("s iː");
		expect(item.thaiWord).toBe("สี");
		expect(item.englishMeaning).toBe("color");
		expect(item.tones).toEqual(["rising"]);
		expect(item.audioUrl).toBe("/a/sii.mp3");
	});

	it("draws from several groups at once", () => {
		const items = selectMinimalPairRound(
			[FULLY_RECORDED, PART_RECORDED],
			10,
			() => 0,
		);

		expect(new Set(items.map((item) => item.groupKey))).toEqual(
			new Set(["m a j", "s iː"]),
		);
	});
});
