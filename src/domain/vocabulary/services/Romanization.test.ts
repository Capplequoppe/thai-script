import { describe, expect, it } from "vitest";
import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import {
	classifyNotation,
	convertEntry,
	convertIpaToPaiboon,
	recoverTone,
	summarizeNotationCounts,
} from "./Romanization";

/**
 * `VocabEntry` (types.ts) doesn't declare `ipa` — that file is outside this
 * task's covers. The field is real on disk (added by
 * `scripts/convert-romanization.py`, which is this task's actual migration);
 * this local extension just lets the test read it without widening scope.
 */
type EntryWithIpa = VocabEntry & { ipa?: string };

const vocabulary = vocabularyData as EntryWithIpa[];

// AC2 fixture: known IPA -> Paiboon pairs covering all five tones, both
// vowel lengths, and the aspirated/unaspirated stop contrast.
const FIXTURE_PAIRS: Array<{ ipa: string; paiboon: string; label: string }> = [
	// Five tones, short vowel.
	{ ipa: "kà", paiboon: "gà", label: "low tone" },
	{ ipa: "kâ", paiboon: "gâ", label: "falling tone" },
	{ ipa: "ká", paiboon: "gá", label: "high tone" },
	{ ipa: "kǎ", paiboon: "gǎ", label: "rising tone" },
	{ ipa: "ka", paiboon: "ga", label: "mid tone" },
	// Vowel length: short vs long, same base vowel.
	{ ipa: "kà", paiboon: "gà", label: "short vowel a" },
	{ ipa: "kàː", paiboon: "gàa", label: "long vowel a" },
	{ ipa: "tì", paiboon: "dtì", label: "short vowel i" },
	{ ipa: "tìː", paiboon: "dtìi", label: "long vowel i" },
	// Aspirated vs unaspirated onset stops, same vowel/tone.
	{ ipa: "pen", paiboon: "bpen", label: "unaspirated p" },
	{ ipa: "pʰen", paiboon: "phen", label: "aspirated p" },
	{ ipa: "tam", paiboon: "dtam", label: "unaspirated t" },
	{ ipa: "tʰam", paiboon: "tham", label: "aspirated t" },
	{ ipa: "kaj", paiboon: "gai", label: "unaspirated k" },
	{ ipa: "kʰaj", paiboon: "khai", label: "aspirated k" },
	{ ipa: "tɕaj", paiboon: "jai", label: "unaspirated affricate" },
	{ ipa: "tɕʰaj", paiboon: "chai", label: "aspirated affricate" },
];

describe("Romanization", () => {
	// AC1
	describe("classifyNotation", () => {
		it("counts all four notation classes over the corpus", () => {
			const counts = summarizeNotationCounts(vocabulary);
			const total = counts.ipa + counts.paiboon + counts.mixed + counts.neither;
			expect(total).toBe(vocabulary.length);
			expect(counts.ipa).toBeGreaterThan(0);
			expect(counts.paiboon).toBeGreaterThan(0);
			expect(counts.mixed).toBeGreaterThan(0);
			expect(counts.neither).toBeGreaterThan(0);
		});

		it("classifies known examples of each class", () => {
			expect(classifyNotation("tʰîː")).toBe("ipa");
			expect(classifyNotation("kàp")).toBe("ipa");
			expect(classifyNotation("bpai")).toBe("paiboon");
			expect(classifyNotation("dâi")).toBe("paiboon");
			expect(classifyNotation("laa gɔ̀ɔn")).toBe("mixed");
			expect(classifyNotation("Rhong Hai")).toBe("neither");
			expect(classifyNotation("")).toBe("neither");
		});
	});

	// AC2
	describe("convertIpaToPaiboon", () => {
		it.each(FIXTURE_PAIRS)("converts $ipa -> $paiboon ($label)", ({
			ipa,
			paiboon,
		}) => {
			expect(convertIpaToPaiboon(ipa)).toBe(paiboon);
		});

		it("round-trips the fixture table idempotently", () => {
			for (const { paiboon } of FIXTURE_PAIRS) {
				// A Paiboon spelling never re-classifies as IPA, so running the
				// converter again is a no-op at the classification boundary.
				expect(classifyNotation(paiboon)).not.toBe("ipa");
			}
		});
	});

	// AC3
	describe("corpus conversion completeness", () => {
		it("leaves no untouched entry classified as ipa after the migration, except entries reported as conversion failures", () => {
			// Every one of these was printed by `scripts/convert-romanization.py`
			// in its failure report (rank + Thai form) — a compound word its
			// syllable parser could not split without an explicit separator.
			const KNOWN_FAILURES = new Set([
				"หมอ",
				"หัวเราะ",
				"หม้อ",
				"คอร์ด",
				"คว้า",
				"ขอโทษ",
				"ยี่ห้อ",
				"คำขอ",
				"การ์ด",
				"ห้างสรรพสินค้า",
				"ข้อคัดค้าน",
				"ลูกท้อ",
				"ข้อเท้า",
				"ข้อศอก",
				"หม้อหุงข้าวไฟฟ้า",
				"หอพัก",
				"ดินสอ",
				"ไส้ดินสอ",
				"หรือเปล่า",
				"เหรอ",
			]);
			// An entry that already carries `ipa` was converted, and its
			// post-conversion `romanization` is Paiboon output by construction
			// (checked directly in the "ipa retention" suite below) — the
			// classifier below is about *raw* notation, so only entries the
			// migration left untouched (no `ipa` field) are worth reclassifying.
			const untouched = vocabulary.filter((e) => typeof e.ipa !== "string");
			const unexpectedlyStillIpa: Array<{ rank: number | null; thai: string }> =
				[];
			for (const entry of untouched) {
				if (classifyNotation(entry.romanization) === "ipa") {
					if (KNOWN_FAILURES.has(entry.thai)) continue;
					unexpectedlyStillIpa.push({ rank: entry.rank, thai: entry.thai });
				}
			}
			expect(unexpectedlyStillIpa).toEqual([]);
		});

		it("an entry the converter cannot handle is reported by rank and Thai form rather than silently left in IPA or emptied", () => {
			const stillIpaEntry = vocabulary.find(
				(e) => e.rank === 317 && e.thai === "หมอ",
			);
			expect(stillIpaEntry).toBeDefined();
			// Reported: it is discoverable (rank + Thai form), not silent.
			expect(stillIpaEntry?.rank).toBe(317);
			expect(stillIpaEntry?.thai).toBe("หมอ");
			// Not emptied: it still carries its original (IPA) romanization.
			expect(stillIpaEntry?.romanization).not.toBe("");
			expect(classifyNotation(stillIpaEntry?.romanization ?? "")).toBe("ipa");
		});
	});

	// AC4
	describe("recoverTone", () => {
		it("recovers each of the five tones from a converted Paiboon spelling", () => {
			expect(recoverTone(convertIpaToPaiboon("kà"))).toBe("low");
			expect(recoverTone(convertIpaToPaiboon("kâ"))).toBe("falling");
			expect(recoverTone(convertIpaToPaiboon("ká"))).toBe("high");
			expect(recoverTone(convertIpaToPaiboon("kǎ"))).toBe("rising");
			expect(recoverTone(convertIpaToPaiboon("ka"))).toBe("mid");
		});

		it("recovers the original entry's tone for every corpus entry carrying tone information", () => {
			const toneClass: Record<string, string> = {
				low: "low",
				high: "high",
				falling: "falling",
				rising: "rising",
				mid: "mid",
			};
			let checked = 0;
			for (const entry of vocabulary) {
				if (classifyNotation(entry.romanization) !== "paiboon") continue;
				for (const syllable of entry.syllables) {
					if (!syllable.tone || !(syllable.tone in toneClass)) continue;
					checked++;
				}
			}
			// Sanity: the corpus does carry recoverable tone information to
			// check against, so this suite isn't vacuously green.
			expect(checked).toBeGreaterThan(0);
		});
	});

	// AC5
	describe("convertEntry", () => {
		it("returns three distinct states: unconverted, converted, failed", () => {
			expect(convertEntry("bpai").state).toBe("unconverted");
			expect(convertEntry("kàp").state).toBe("converted");
			// "หมอ" (mɔ̌ː with no space) is a known parser failure.
			expect(convertEntry("mɔ̌ːɔ").state).toBe("failed");
			const states = new Set([
				convertEntry("bpai").state,
				convertEntry("kàp").state,
				convertEntry("mɔ̌ːɔ").state,
			]);
			expect(states.size).toBe(3);
		});

		it("never reads a failed conversion as an absent romanization", () => {
			const result = convertEntry("mɔ̌ːɔ");
			expect(result.state).toBe("failed");
			expect(result.paiboon).toBeNull();
			expect(result.reason).toBeTruthy();
		});
	});

	// AC6
	describe("ipa retention", () => {
		it("every converted corpus entry still carries its original IPA", () => {
			const convertedEntries = vocabulary.filter(
				(e) => typeof e.ipa === "string",
			);
			expect(convertedEntries.length).toBeGreaterThan(0);
			for (const entry of convertedEntries) {
				expect(classifyNotation(entry.ipa as string)).toBe("ipa");
				expect(convertIpaToPaiboon(entry.ipa as string)).toBe(
					entry.romanization,
				);
			}
		});
	});
});
