import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import vocabularyData from "../../vocabulary/data/vocabulary.json";
import {
	lessonSequence,
	PHASE_THREE_LESSON_IDS,
	reconcileLessonSlots,
} from "./lessonSequence";
import { classifyConsonant } from "./soundType";
import {
	BARE_READING_CLASSES,
	bareReadingClassOf,
	CLUSTER_INVENTORY,
	CLUSTER_SECOND_LETTERS,
	type CorpusEntry,
	clusterFor,
	finalSoundOf,
	IMPLICIT_VOWEL_RULES,
	isBareConsonantWord,
	KNOWN_SOUND_DOUBLING_WORDS,
	LEADING_CONSONANT_RULE,
	O_LEADING_WORDS,
	PROMOTED_SPECIAL_RULES,
	reconcileWithCorpus,
	resolveLeadingConsonant,
	resolveWord,
	SONORANTS,
	VOWEL_LETTERS,
	WORD_RESOLUTION_STATES,
	type WordResolution,
} from "./syllableRules";
import { getConsonant, specialRules, ThaiSymbolClass } from "./symbols";

type Entry = CorpusEntry & { readonly romanization?: string };

const corpus = vocabularyData as unknown as Entry[];

/** ก through ฮ, rebuilt here so the module need not export its own copy. */
const THAI_CONSONANT_BLOCK: readonly string[] = Array.from(
	{ length: 0x0e2e - 0x0e01 + 1 },
	(_, index) => String.fromCodePoint(0x0e01 + index),
).filter((character) => getConsonant(character) !== undefined);

const topTwoThousand = corpus.filter(
	(entry) => typeof entry.rank === "number" && (entry.rank as number) <= 2000,
);

const bareWords = topTwoThousand.filter((entry) =>
	isBareConsonantWord(entry.thai),
);

function resolved(word: string) {
	const resolution = resolveWord(word);
	if (resolution.state !== "resolved")
		throw new Error(`${word} did not resolve: ${JSON.stringify(resolution)}`);
	return resolution;
}

function shapeOf(resolution: ReturnType<typeof resolved>): string {
	return resolution.syllables
		.map(
			(syllable) =>
				`${syllable.leader ? `${syllable.leader}·` : ""}${syllable.initialConsonant}|${syllable.vowel}|${syllable.finalConsonant ?? "-"}`,
		)
		.join(" + ");
}

// ============================================================================
// AC1 — bare-consonant words, resolved by the full set of competing readings
// ============================================================================

/**
 * Measured, not assumed. The point of recording it is that the unwritten-โอะ
 * rule — the only one the source course teaches for these words — accounts for
 * three of the 61 three-consonant ones.
 */
const BARE_DISTRIBUTION: Readonly<Record<string, number>> = {
	"o-as-vowel": 44,
	"implicit-o": 60,
	"initial-cluster": 12,
	"w-as-vowel": 14,
	"polysyllabic-implicit-a": 10,
	"ro-han": 6,
	"bare-final-ro": 3,
};

const THREE_CONSONANT_DISTRIBUTION: Readonly<Record<string, number>> = {
	"o-as-vowel": 35,
	"w-as-vowel": 12,
	"polysyllabic-implicit-a": 7,
	"initial-cluster": 4,
	"implicit-o": 3,
};

function distributionOver(entries: readonly Entry[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const entry of entries) {
		const reading = bareReadingClassOf(resolveWord(entry.thai));
		const key = reading ?? "unresolved";
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return counts;
}

describe("AC1 — the competing readings of a bare-consonant word", () => {
	it("resolves every bare-consonant word in the corpus top 2,000, and the four-way distribution matches the recorded baseline", () => {
		expect(bareWords.length).toBe(149);
		const unresolved = bareWords
			.map((entry) => ({ entry, resolution: resolveWord(entry.thai) }))
			.filter(({ resolution }) => resolution.state !== "resolved")
			.map(({ entry }) => entry.thai);
		expect(unresolved).toEqual([]);
		expect(distributionOver(bareWords)).toEqual(BARE_DISTRIBUTION);

		const threeConsonant = bareWords.filter(
			(entry) => [...entry.thai].length === 3,
		);
		expect(threeConsonant.length).toBe(61);
		expect(distributionOver(threeConsonant)).toEqual(
			THREE_CONSONANT_DISTRIBUTION,
		);
		// The rule the source course teaches for these words is the rarest of
		// them: ของ-shaped words outnumber คน-shaped ones ten to one.
		expect(THREE_CONSONANT_DISTRIBUTION["implicit-o"]).toBeLessThan(
			THREE_CONSONANT_DISTRIBUTION["o-as-vowel"],
		);
	});

	it("reads ของ, ชอบ and ออก with อ as a vowel, not as an implicit โอะ", () => {
		for (const word of ["ของ", "ชอบ", "ออก"]) {
			const reading = resolved(word);
			expect(reading.syllables).toHaveLength(1);
			expect(reading.syllables[0].vowelRule).toBe("o-as-vowel");
			expect(reading.syllables[0].vowel).toBe("-อ");
		}
		expect(shapeOf(resolved("ของ"))).toBe("ข|-อ|ง");
		// ออก is the case the placeholder/vowel split is for: the same letter
		// twice, consonant then vowel.
		expect(shapeOf(resolved("ออก"))).toBe("อ|-อ|ก");
		expect(bareReadingClassOf(resolveWord("ของ"))).toBe("o-as-vowel");
	});

	it("reads รวม with ว as a vowel and ตรง as an initial cluster", () => {
		const ruam = resolved("รวม");
		expect(ruam.syllables[0].vowelRule).toBe("w-as-vowel");
		expect(shapeOf(ruam)).toBe("ร|-ัว|ม");

		const dtrong = resolved("ตรง");
		expect(dtrong.syllables[0].initialConsonant).toBe("ตร");
		expect(dtrong.syllables[0].cluster).toBe("true");
		expect(dtrong.syllables[0].vowelRule).toBe("implicit-o");
		expect(bareReadingClassOf(dtrong)).toBe("initial-cluster");

		// ควร looks like the คว cluster and is not: with no other vowel written,
		// ว is the vowel, which is why it is khuan and not *khwon.
		expect(shapeOf(resolved("ควร"))).toBe("ค|-ัว|ร");
	});

	it("gives every bare word the tone its corpus romanization records, bar the four sound-doubling words", () => {
		const toneByDiacritic: Record<string, string> = {
			"̀": "low",
			"́": "high",
			"̂": "falling",
			"̌": "rising",
		};
		const mismatched: string[] = [];
		let matched = 0;
		for (const entry of bareWords) {
			const reading = resolveWord(entry.thai);
			if (reading.state !== "resolved") continue;
			const expected = (entry.romanization ?? "")
				.split(/[ -]+/)
				.filter(Boolean)
				.map((syllable) => {
					const mark = [...syllable.normalize("NFD")].find(
						(character) => toneByDiacritic[character],
					);
					return mark ? toneByDiacritic[mark] : "mid";
				});
			const actual = reading.syllables.map((syllable) => syllable.tone);
			if (
				expected.length === actual.length &&
				expected.every((tone, index) => tone === actual[index])
			)
				matched += 1;
			else mismatched.push(entry.thai);
		}
		expect(matched).toBe(144);
		// Four need a consonant to serve as both a final and the next initial,
		// which these three lessons do not teach; ตลอดจน is the corpus's own
		// romanization being wrong (*dtlàawt is not a possible Thai syllable).
		expect(mismatched.sort()).toEqual(
			[...KNOWN_SOUND_DOUBLING_WORDS, "ตลอดจน"].sort(),
		);
	});
});

// ============================================================================
// AC2 — the unwritten อะ in a polysyllable
// ============================================================================

describe("AC2 — a polysyllable whose first vowel is not written", () => {
	it("divides ถนน, ขนม, ตลก and สงบ with an implicit อะ on the first syllable", () => {
		for (const word of ["ถนน", "ขนม", "ตลก", "สงบ"]) {
			const reading = resolved(word);
			expect(reading.syllables.length, word).toBe(2);
			expect(reading.syllables[0].vowelRule, word).toBe("implicit-a");
			expect(reading.syllables[0].vowel, word).toBe("-ะ");
			expect(reading.syllables[0].finalConsonant, word).toBeNull();
		}
		expect(shapeOf(resolved("ถนน"))).toBe("ถ|-ะ|- + ถ·น|โ-ะ|น");
	});

	it("divides bare polysyllables exactly as the corpus divides them, where the corpus divides them", () => {
		for (const word of ["ตกลง", "ทดลอง", "รอบคอบ", "มงคล", "อดทน"]) {
			const entry = corpus.find((candidate) => candidate.thai === word);
			const stored = entry?.syllables;
			if (!stored) throw new Error(`${word} is not in the corpus`);
			const reading = resolved(word);
			expect(reading.syllables.length, word).toBe(stored.length);
			expect(
				reading.syllables.map((syllable) => syllable.initialConsonant),
				word,
			).toEqual(stored.map((syllable) => syllable.initialConsonant));
			expect(
				reading.syllables.map((syllable) => syllable.finalConsonant),
				word,
			).toEqual(stored.map((syllable) => syllable.finalConsonant ?? null));
		}
	});

	it("reads the corpus's collapsed analysis of a leading-consonant word as this reading with the leader folded in", () => {
		// The corpus stores ถนน as one syllable, ถ…น, carrying ถ's class and the
		// *second* syllable's tone — it has folded the leader in rather than
		// analysing it. That is the same reading, minus the division.
		for (const word of ["ถนน", "ขนม", "ตลก", "สงบ"]) {
			const entry = corpus.find((candidate) => candidate.thai === word);
			const stored = entry?.syllables?.[0];
			if (!stored) throw new Error(`${word} is not in the corpus`);
			const reading = resolved(word);
			expect(stored.initialConsonant, word).toBe(
				reading.syllables[0].initialConsonant,
			);
			const last = reading.syllables[reading.syllables.length - 1];
			expect(stored.finalConsonant ?? null, word).toBe(last.finalConsonant);
			expect(stored.tone, word).toBe(last.tone);
		}
	});
});

// ============================================================================
// AC3 — the cluster inventory, closed
// ============================================================================

describe("AC3 — the cluster inventory", () => {
	it("is closed: only ร, ล and ว ever appear second, and every pair is classified", () => {
		expect(CLUSTER_SECOND_LETTERS).toEqual(["ร", "ล", "ว"]);
		for (const cluster of CLUSTER_INVENTORY) {
			expect(
				CLUSTER_SECOND_LETTERS,
				`${cluster.pair} ends in a letter that never clusters`,
			).toContain(cluster.pair.slice(-1));
			expect(["true", "false-sound", "silent-second"]).toContain(cluster.kind);
		}
		const pairs = CLUSTER_INVENTORY.map((cluster) => cluster.pair);
		expect(new Set(pairs).size).toBe(pairs.length);
		expect(
			CLUSTER_INVENTORY.filter((cluster) => cluster.kind === "true"),
		).toHaveLength(15);
		expect(
			CLUSTER_INVENTORY.filter((cluster) => cluster.kind !== "true"),
		).toHaveLength(5);
		// Every pair is two consonants: that is the only shape clusterFor is
		// ever asked for, so a longer entry would be declared and unreachable.
		for (const cluster of CLUSTER_INVENTORY) {
			expect([...cluster.pair], cluster.pair).toHaveLength(2);
			expect(clusterFor(cluster.pair), cluster.pair).toBe(cluster);
		}
	});

	it("does not treat a pair outside the inventory as a cluster", () => {
		for (const pair of ["ถน", "สม", "บว", "ขน", "มร"]) {
			expect(clusterFor(pair), pair).toBeUndefined();
		}
		// ถนน would be a single syllable if ถน were a cluster. It is not, so the
		// two consonants land in different syllables.
		expect(resolved("ถนน").syllables).toHaveLength(2);
		expect(resolved("บวก").syllables[0].cluster).toBeUndefined();
	});

	it("resolves a false cluster to its actual sound, not the sum of its parts", () => {
		const thoRo = clusterFor("ทร");
		expect(thoRo?.kind).toBe("false-sound");
		expect(thoRo?.initialSound).toBe("s");
		// ทรง is song, not *throng.
		const song = resolved("ทรง");
		expect(song.syllables[0].initialConsonant).toBe("ทร");
		expect(song.syllables[0].cluster).toBe("false-sound");
		expect(song.syllables[0].tone).toBe("mid");
	});

	it("drops the second consonant for the silent-ร pairs", () => {
		for (const pair of ["จร", "ศร", "สร"]) {
			expect(clusterFor(pair)?.kind, pair).toBe("silent-second");
		}
		expect(clusterFor("จร")?.initialSound).toBe("j");
	});
});

// ============================================================================
// AC4 — leading consonants, one rule with three branches
// ============================================================================

describe("AC4 — the leading-consonant rule", () => {
	it("resolves the ห spelling and the อ spelling through one function", () => {
		const withHo = resolveLeadingConsonant("ห", "ม", "หมอ");
		const withO = resolveLeadingConsonant("อ", "ย", "อย่าง");
		expect(withHo).toEqual({
			leads: true,
			branch: "silent-h",
			leaderPronounced: false,
			effectiveClass: ThaiSymbolClass.High,
		});
		expect(withO).toEqual({
			leads: true,
			branch: "silent-o",
			leaderPronounced: false,
			effectiveClass: ThaiSymbolClass.Mid,
		});
		// Same mechanism: a silent leader handing its class to a sonorant.
		expect(withHo.leads && withHo.leaderPronounced).toBe(false);
		expect(withO.leads && withO.leaderPronounced).toBe(false);
		// And it is the class transfer that produces the tone: ม is low class and
		// could not be written rising on its own.
		expect(resolved("หมอ").syllables[0].consonantClass).toBe(
			ThaiSymbolClass.High,
		);
		expect(resolved("หมอ").syllables[0].tone).toBe("rising");
	});

	it("declares the อ branch closed at exactly four words", () => {
		expect(O_LEADING_WORDS).toHaveLength(4);
		expect([...O_LEADING_WORDS].sort()).toEqual(
			["อย่า", "อยาก", "อย่าง", "อยู่"].sort(),
		);
		const branch = LEADING_CONSONANT_RULE.branches.find(
			(candidate) => candidate.id === "silent-o",
		);
		expect(branch?.closure).toBe("closed");
		expect(branch?.words).toEqual(O_LEADING_WORDS);
		// A word outside the set gets no อ-leading reading.
		expect(resolveLeadingConsonant("อ", "ย", "อยาย")).toEqual({
			leads: false,
			reason: "อ leads in exactly 4 words and อยาย is not one of them",
		});
	});

	it("declares the third branch productive, and it contains สวัสดี at rank 9", () => {
		const branch = LEADING_CONSONANT_RULE.branches.find(
			(candidate) => candidate.id === "unstressed-leader",
		);
		expect(branch?.closure).toBe("productive");
		expect(branch?.leaderPronounced).toBe(true);
		expect(branch?.words).toContain("สวัสดี");
		const sawatdii = corpus.find((entry) => entry.thai === "สวัสดี");
		expect(sawatdii?.rank).toBe(9);
		// The same function, third branch: ส is pronounced and ว still takes its
		// class, which is what makes สวัสดี's second syllable low rather than
		// falling.
		expect(resolveLeadingConsonant("ส", "ว", "สวัสดี")).toEqual({
			leads: true,
			branch: "unstressed-leader",
			leaderPronounced: true,
			effectiveClass: ThaiSymbolClass.High,
		});
		expect(LEADING_CONSONANT_RULE.branches).toHaveLength(3);
	});

	it("declares the same leaders it behaves as, high-class ones included", () => {
		// `leaders` used to be a hand-written list of the nine mid-class
		// consonants, which named none of ส, ถ or ข — the leaders of four of the
		// branch's own six example words, สวัสดี at rank 9 among them. Nothing
		// read the field, so nothing caught it. This binds it to the resolver.
		for (const branch of LEADING_CONSONANT_RULE.branches) {
			for (const word of branch.words) {
				const leader = [...word][0];
				expect(branch.leaders, `${word} is led by ${leader}`).toContain(leader);
			}
			for (const leader of branch.leaders) {
				const resolution = resolveLeadingConsonant(
					leader,
					"ย",
					branch.words[0],
				);
				expect(resolution.leads, `${leader} should lead`).toBe(true);
			}
		}
		const unstressed = LEADING_CONSONANT_RULE.branches.find(
			(candidate) => candidate.id === "unstressed-leader",
		);
		expect(unstressed?.leaders).toContain("ส");
		expect(unstressed?.leaders).toContain("ถ");
		expect(unstressed?.leaders).toContain("ข");
		// ห and อ are held out: each has its own branch, and the resolver routes
		// them there unconditionally, so neither is ever an unstressed leader.
		expect(unstressed?.leaders).not.toContain("ห");
		expect(unstressed?.leaders).not.toContain("อ");
		// And no low-class consonant is declared as a leader anywhere.
		for (const branch of LEADING_CONSONANT_RULE.branches) {
			for (const leader of branch.leaders) {
				expect(getConsonant(leader)?.classType, leader).not.toBe(
					ThaiSymbolClass.Low,
				);
			}
		}
	});

	it("refuses to lead where there is no class to pass on", () => {
		// น is low class: it has nothing a sonorant does not already have.
		expect(resolveLeadingConsonant("น", "ค", "นคร").leads).toBe(false);
		expect(resolveLeadingConsonant("ส", "ก", "สกล").leads).toBe(false);
		expect(resolved("นคร").syllables[1].leader).toBeUndefined();
		expect(resolved("นคร").syllables[1].tone).toBe("mid");
	});
});

// ============================================================================
// AC5 — reconciliation against the corpus
// ============================================================================

/**
 * Recorded, not asserted to be zero. See the task's architectural decision:
 * these rules have real exceptions and the corpus's stored analysis has real
 * defects — it drops a letter outright in 118 of the 307 words these rules
 * reach — so a zero here would only be reachable by bending one of the two.
 * The number moving is the signal.
 */
const CORPUS_BASELINE = {
	considered: 5454,
	resolved: 307,
	unresolvable: 1,
	unanalysed: 5146,
	agreements: 95,
	disagreements: 212,
	uncompared: 0,
};

describe("AC5 — the rules against vocabulary.json", () => {
	it("reports a disagreement count that matches the recorded baseline", () => {
		const report = reconcileWithCorpus(corpus);
		expect({
			considered: report.considered,
			resolved: report.resolved,
			unresolvable: report.unresolvable,
			unanalysed: report.unanalysed,
			agreements: report.agreements,
			disagreements: report.disagreements.length,
			uncompared: report.uncompared,
		}).toEqual(CORPUS_BASELINE);
		expect(report.resolved + report.unresolvable + report.unanalysed).toBe(
			report.considered,
		);
		// Every word the rules reached is accounted for exactly once: agreed,
		// disagreed, or had no stored analysis to compare against. Without this
		// a word could fall out of the reconciliation silently.
		expect(
			report.agreements + report.disagreements.length + report.uncompared,
		).toBe(report.resolved);
	});

	it("reports every disagreement with the word and both readings", () => {
		const report = reconcileWithCorpus(corpus);
		for (const disagreement of report.disagreements) {
			expect(disagreement.word).not.toBe("");
			expect(disagreement.rules).not.toBe("");
			expect(disagreement.corpus).not.toBe("");
			expect(disagreement.rules).not.toBe(disagreement.corpus);
		}
		const khaawng = report.disagreements.find(
			(disagreement) => disagreement.word === "ของ",
		);
		// The corpus drops the อ entirely and records no vowel at all; the rules
		// read it as the vowel. One of the two is wrong about rank 17, and it is
		// not the one whose analysis still contains every letter of the word.
		expect(khaawng?.rules).toBe("ข|-อ|ง");
		expect(khaawng?.corpus).toBe("ข|-|ง");
		expect(khaawng?.kind).toBe("dropped-letter");
		expect(khaawng?.rank).toBe(17);
		// Both kinds of defect are present, not just the cheap one.
		expect(
			new Set(report.disagreements.map((disagreement) => disagreement.kind)),
		).toEqual(new Set(["syllable-count", "syllable-shape", "dropped-letter"]));
	});
});

// ============================================================================
// AC6 — the letters that act as vowels
// ============================================================================

describe("AC6 — อ and ว declared as vowels", () => {
	it("declares both letters with the condition under which they are vowels", () => {
		expect(VOWEL_LETTERS.map((entry) => entry.letter)).toEqual(["อ", "ว"]);
		for (const entry of VOWEL_LETTERS) {
			expect(entry.condition.length, entry.letter).toBeGreaterThan(20);
			expect(entry.stillAConsonant.length, entry.letter).toBeGreaterThan(20);
			expect(["short", "long"]).toContain(entry.length);
		}
		expect(VOWEL_LETTERS[0].vowel).toBe("-อ");
		expect(VOWEL_LETTERS[1].vowel).toBe("-ัว");
	});

	it("keeps อ a consonant at the start of a word and a vowel after that", () => {
		// ออก: the first อ is the placeholder consonant, the second is the vowel.
		const aawk = resolved("ออก");
		expect(aawk.syllables[0].initialConsonant).toBe("อ");
		expect(aawk.syllables[0].vowel).toBe("-อ");
		expect(aawk.syllables[0].consonantClass).toBe(ThaiSymbolClass.Mid);
		expect(aawk.syllables[0].tone).toBe("low");
		// อก is อ + an unwritten โอะ + ก: nothing follows for อ to be a vowel of.
		expect(shapeOf(resolved("อก"))).toBe("อ|โ-ะ|ก");
	});

	it("declares the four ways a vowel goes unwritten", () => {
		expect(IMPLICIT_VOWEL_RULES.map((rule) => rule.id)).toEqual([
			"implicit-o",
			"implicit-a",
			"bare-final-ro",
			"ro-han",
		]);
		// ร หัน is a vowel, not a doubled consonant: ธรรม is tham.
		expect(shapeOf(resolved("กรรม"))).toBe("ก|รร|ม");
		expect(resolved("กรรม").syllables[0].tone).toBe("mid");
		// A bare final ร reads -aawn, not -on.
		expect(shapeOf(resolved("พร"))).toBe("พ|-อ|ร");
	});
});

describe("CONTEXT.md rule 2 — the original stays reachable", () => {
	it("names only specialRules entries that exist, and covers every rule this module promotes", () => {
		const declared = new Set(specialRules.map((rule) => rule.id));
		for (const id of Object.keys(PROMOTED_SPECIAL_RULES)) {
			expect(declared.has(id), `${id} is not a specialRules entry`).toBe(true);
		}
		// Every per-declaration link resolves to one of the promoted entries, so
		// a typo in one of these strings cannot go unnoticed.
		const links = [
			...VOWEL_LETTERS.map((entry) => entry.extendsSpecialRule),
			...IMPLICIT_VOWEL_RULES.map((rule) => rule.extendsSpecialRule),
			...LEADING_CONSONANT_RULE.branches.map(
				(branch) => branch.extendsSpecialRule,
			),
		].filter((id): id is string => id !== undefined);
		for (const id of links) {
			expect(
				PROMOTED_SPECIAL_RULES[id],
				`${id} promotes nothing`,
			).toBeDefined();
			expect(declared.has(id), `${id} is not a specialRules entry`).toBe(true);
		}
		// The cluster inventory is the one family with no per-entry link — all
		// twenty pairs promote the same rule — so it is covered by the record
		// instead of being the family that quietly has none.
		expect(PROMOTED_SPECIAL_RULES["consonant-clusters"]).toBe(
			"CLUSTER_INVENTORY",
		);
	});

	it("names every shipped specialRules entry these three lessons supersede", () => {
		// The coverage direction the first pass missed: every link resolved, but
		// nothing checked that an entry which already ships was linked at all.
		// tho-ro-s-sound, silent-ro-clusters and ror-han each state, in
		// symbols.ts, a fact one of these rules now owns.
		for (const id of [
			"unwritten-vowels",
			"ror-han",
			"consonant-clusters",
			"tho-ro-s-sound",
			"silent-ro-clusters",
			"hor-nam",
			"silent-o-before-yo",
			"o-ang-dual-role",
		]) {
			expect(
				PROMOTED_SPECIAL_RULES[id],
				`${id} ships in symbols.ts and nothing here claims it`,
			).toBeDefined();
		}
		// The three cluster entries are the three ClusterKinds, one each.
		expect(
			Object.entries(PROMOTED_SPECIAL_RULES).filter(
				([, declaration]) => declaration === "CLUSTER_INVENTORY",
			),
		).toHaveLength(3);
	});

	it("takes its sonorants from soundType.ts's classification, not a list of its own", () => {
		const derived = THAI_CONSONANT_BLOCK.filter((character) => {
			const consonant = getConsonant(character);
			if (!consonant) return false;
			const classification = classifyConsonant({
				character,
				initialSound: consonant.initialSound,
				isAspirated: consonant.isAspirated,
			});
			return (
				classification.state === "classified" &&
				classification.soundType === "sonorant"
			);
		});
		expect(SONORANTS).toEqual(derived);
		expect(SONORANTS).toHaveLength(10);
		// The count soundType.test.ts asserts independently, from the other side.
		expect(derived).toEqual(["ง", "ญ", "ณ", "น", "ม", "ย", "ร", "ล", "ว", "ฬ"]);
	});

	it("reconciles its final sounds with symbols.ts, and records where the two disagree", () => {
		// Mirrors the module's own stop set; a final that is a stop makes the
		// syllable dead, which is the only thing these rules read finalSoundOf for.
		const stops = new Set(["k", "t", "p"]);
		const disagreements: string[] = [];
		for (const character of THAI_CONSONANT_BLOCK) {
			const prose = getConsonant(character)?.finalSound ?? "";
			const usableAsFinal = !/not used as final|acts as vowel/.test(prose);
			const mine = finalSoundOf(character);
			if (usableAsFinal !== (mine !== undefined)) {
				disagreements.push(character);
				continue;
			}
			if (mine !== undefined) {
				expect(stops.has(mine), `${character} live/dead`).toBe(
					/-stop/.test(prose),
				);
			}
		}
		// Recorded, not zero (the AC5 discipline, applied to the second source).
		// symbols.ts gives ผ and ฝ stop finals and ฃ and ฅ K-stops; no Thai
		// syllable is closed by any of the four, so these rules give them no
		// final reading. symbols.ts answers a flashcard question ("what would
		// this sound like as a final?") and is not wrong for its own purpose,
		// which is why this is recorded here rather than repaired there.
		expect(disagreements).toEqual(["ฃ", "ฅ", "ผ", "ฝ"]);
	});
});

// ============================================================================
// AC7 — three states
// ============================================================================

describe("AC7 — a word is in exactly one of three states", () => {
	it("resolves a word the rules reach", () => {
		const resolution: WordResolution = resolveWord("คน");
		expect(resolution.state).toBe("resolved");
		expect(
			resolution.state === "resolved" && resolution.syllables,
		).toHaveLength(1);
	});

	it("reports an unresolvable word with the rule that ran out, and never as unanalysed", () => {
		// หลอกลวง has two readings that survive the declared preference order.
		const resolution = resolveWord("หลอกลวง");
		expect(resolution.state).toBe("unresolvable");
		expect(resolution.state).not.toBe("unanalysed");
		if (resolution.state !== "unresolvable") throw new Error("unreachable");
		expect(resolution.ranOutAt).toBe("preference-order");
		expect(resolution.reason).toContain("two readings survive");
	});

	it("reports a word these rules do not reach as unanalysed, with the reason", () => {
		const resolution = resolveWord("ที่");
		expect(resolution.state).toBe("unanalysed");
		expect(resolution.state).not.toBe("unresolvable");
		if (resolution.state !== "unanalysed") throw new Error("unreachable");
		expect(resolution.reason).toContain("writes its vowels");
		expect(new Set(WORD_RESOLUTION_STATES).size).toBe(3);
		expect(new Set(BARE_READING_CLASSES).size).toBe(
			BARE_READING_CLASSES.length,
		);
	});
});

// ============================================================================
// AC8 — a declared slot for every lesson this phase produces
// ============================================================================

const CONTENT_LESSONS_DIR = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	"..",
	"content",
	"lessons",
);

function authoredLessonIds(): string[] {
	return readdirSync(CONTENT_LESSONS_DIR)
		.filter((name) => name.endsWith(".md"))
		.map((name) => name.replace(/\.md$/, ""));
}

describe("AC8 — every phase-3 lesson has a declared sequence slot", () => {
	it("declares a slot for all nine, before their content exists", () => {
		const declared = new Set(lessonSequence.map((entry) => entry.id));
		for (const id of PHASE_THREE_LESSON_IDS) {
			expect(declared.has(id), `${id} has no declared sequence slot`).toBe(
				true,
			);
		}
		expect(PHASE_THREE_LESSON_IDS).toHaveLength(9);
		// The three promoted lessons are the ones that had no slot before.
		for (const id of [
			"lesson-unwritten-vowels",
			"lesson-clusters",
			"lesson-leading-consonants",
		]) {
			expect(PHASE_THREE_LESSON_IDS).toContain(id);
		}
		expect(new Set(lessonSequence.map((entry) => entry.id)).size).toBe(
			lessonSequence.length,
		);
	});

	it("reconciles slots and content in both directions, and reports each gap", () => {
		const authored = authoredLessonIds();
		const report = reconcileLessonSlots(authored);
		expect(report.filled.length + report.unfilled.length).toBe(
			lessonSequence.length,
		);
		// Every slot phase 3 declared is still waiting for its content: tasks 3.2
		// and 3.3 fill them.
		for (const id of [
			"lesson-unwritten-vowels",
			"lesson-clusters",
			"lesson-leading-consonants",
		]) {
			expect(report.unfilled, `${id} should be an unfilled slot`).toContain(id);
		}
		// And the one lesson with content and no slot is reported rather than
		// silently unreachable: lesson-sound-buckets shipped a deck in phase 2
		// with no row in the legacy lessons table to take a position from.
		expect(report.orphaned).toEqual(["lesson-sound-buckets"]);
		for (const id of report.filled) {
			expect(authored).toContain(id);
		}
	});
});
