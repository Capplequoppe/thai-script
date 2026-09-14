import { describe, expect, it } from "vitest";
import { checkOriginality } from "../../script/data/originality";
import { CHARACTERS, registerViolations } from "../data/characters";
import { assignRoom } from "../data/rooms";
import vocabulary from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import {
	COVERAGE_FLOOR,
	composeVocabMnemonic,
	coverageReport,
	KNOWN_CORPUS_MNEMONIC_OVERLAPS,
	mnemonicStateFor,
	ROOM_ANCHORS,
	reviewStaging,
	roomForVocabCardId,
	roomForWord,
	UNSUITABLE_FOR_MNEMONIC,
	VOCAB_MNEMONICS,
	type VocabMnemonic,
	validateVocabMnemonic,
} from "./VocabMnemonic";

const entries = vocabulary as unknown as VocabEntry[];

/** The corpus entry a record was drawn from — matched on rank, which is unique per entry. */
function corpusEntryFor(record: VocabMnemonic): VocabEntry {
	const entry = entries.find((e) => e.rank === record.rank);
	if (!entry) throw new Error(`no corpus entry at rank ${record.rank}`);
	return entry;
}

// ---------------------------------------------------------------------------
// AC2 — every mnemonic is staged in the room its word belongs to
// ---------------------------------------------------------------------------

describe("room staging", () => {
	it("stages every mnemonic in the room its word's class assigns", () => {
		const mismatches: string[] = [];
		for (const record of VOCAB_MNEMONICS) {
			const entry = corpusEntryFor(record);
			expect(entry.thai, `rank ${record.rank}`).toBe(record.thai);
			const assignment = assignRoom(entry.word_class);
			if (assignment.state !== "assigned") {
				mismatches.push(`${record.thai}: corpus class is ${assignment.state}`);
			} else if (assignment.room !== record.room) {
				mismatches.push(
					`${record.thai}: staged in ${record.room}, belongs in ${assignment.room}`,
				);
			}
		}
		expect(mismatches, mismatches.join("; ")).toEqual([]);
	});

	it("fails a mnemonic whose scene contradicts the room it declares", () => {
		const record = VOCAB_MNEMONICS[0];
		const contradicting = { ...record, room: "things" as const };

		const result = validateVocabMnemonic(contradicting);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.invalid.join(" ")).toContain(ROOM_ANCHORS.connectors);
		expect(result.missing.join(" ")).toContain(ROOM_ANCHORS.things);
	});
});

// ---------------------------------------------------------------------------
// AC3 — every mnemonic validates against the scene-grammar schema
// ---------------------------------------------------------------------------

describe("scene-grammar conformance", () => {
	it("validates every staged mnemonic", () => {
		const failures: string[] = [];
		for (const record of VOCAB_MNEMONICS) {
			const result = validateVocabMnemonic(record);
			if (!result.ok) {
				failures.push(
					`${record.thai}: missing ${result.missing.join(",")} invalid ${result.invalid.join(",")}`,
				);
			}
		}
		expect(failures, failures.join("; ")).toEqual([]);
	});

	it("fails a mnemonic missing its sound binding, naming the field", () => {
		const result = validateVocabMnemonic({
			...VOCAB_MNEMONICS[0],
			soundCue: "   ",
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.missing).toContain("soundCue");
	});

	it("fails a mnemonic declaring a character its scene never stages", () => {
		const record = VOCAB_MNEMONICS.find(
			(m) => !m.characters.includes("chan"),
		) as VocabMnemonic;

		const result = validateVocabMnemonic({
			...record,
			characters: [...record.characters, "chan"],
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.invalid.join(" ")).toContain("chan");
	});

	// AC1's other half: the register is declared on the character, and the
	// prose is held to it. `characters.test.ts` owns the declaration.
	it("keeps every mnemonic consistent with its cast's declared register", () => {
		const violations: string[] = [];
		for (const record of VOCAB_MNEMONICS) {
			for (const violation of registerViolations(
				composeVocabMnemonic(record),
				record.characters,
			)) {
				violations.push(`${record.thai}: ${violation}`);
			}
		}
		expect(violations, violations.join("; ")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// AC7 — the declared coverage floor
// ---------------------------------------------------------------------------

describe("coverage floor", () => {
	it("meets the declared floor over the declared rank window", () => {
		const report = coverageReport();

		expect(report.missing, JSON.stringify(report.missing)).toEqual([]);
		expect(report.staged).toBe(COVERAGE_FLOOR.staged);
		expect(report.unsuitable).toBe(COVERAGE_FLOOR.unsuitable);
		expect(report.ok).toBe(true);
		expect(COVERAGE_FLOOR.staged + COVERAGE_FLOOR.unsuitable).toBe(
			COVERAGE_FLOOR.rankTo - COVERAGE_FLOOR.rankFrom + 1,
		);
	});

	it("fails a run one word short", () => {
		// A corpus identical to the real window except for one extra ranked
		// entry nothing has staged: the floor has to see it.
		const window = entries.filter(
			(e) =>
				e.rank !== null &&
				e.rank >= COVERAGE_FLOOR.rankFrom &&
				e.rank <= COVERAGE_FLOOR.rankTo,
		);
		const short = window.filter((e) => e.rank !== VOCAB_MNEMONICS[0].rank);

		const report = coverageReport([
			...short,
			{ thai: "ยังไม่ได้ทำ", rank: VOCAB_MNEMONICS[0].rank },
		]);

		expect(report.ok).toBe(false);
		expect(report.staged).toBe(COVERAGE_FLOOR.staged - 1);
		expect(report.missing).toEqual([
			{ thai: "ยังไม่ได้ทำ", rank: VOCAB_MNEMONICS[0].rank },
		]);
	});
});

// ---------------------------------------------------------------------------
// AC6 — three states, and unsuitable never reads as missing
// ---------------------------------------------------------------------------

describe("per-word mnemonic state", () => {
	it("reports a staged word as having a mnemonic", () => {
		const record = VOCAB_MNEMONICS[0];

		const state = mnemonicStateFor(record);

		expect(state.state).toBe("has-mnemonic");
		if (state.state !== "has-mnemonic") return;
		expect(state.mnemonic.thai).toBe(record.thai);
	});

	it("reports an unstaged word as none-yet, carrying no reason", () => {
		const unstaged = entries.find(
			(e) => e.rank !== null && mnemonicStateFor(e).state === "none-yet",
		) as VocabEntry;

		const state = mnemonicStateFor(unstaged);

		expect(state).toEqual({ state: "none-yet" });
	});

	it("reports an unsuitable word as unsuitable with its reason, never as missing", () => {
		const unsuitable = UNSUITABLE_FOR_MNEMONIC[0];

		const state = mnemonicStateFor(unsuitable);

		expect(state.state).toBe("unsuitable");
		if (state.state !== "unsuitable") return;
		expect(state.reason).toBe(unsuitable.reason);
	});

	it("distinguishes two corpus entries of the same spelling", () => {
		// ขอบคุณ is ranked twice; 26 is staged and 27 is recorded unsuitable.
		expect(mnemonicStateFor({ thai: "ขอบคุณ", rank: 26 }).state).toBe(
			"has-mnemonic",
		);
		expect(mnemonicStateFor({ thai: "ขอบคุณ", rank: 27 }).state).toBe(
			"unsuitable",
		);
	});
});

// ---------------------------------------------------------------------------
// Restaging — a revised class surfaces, never silently mismatches
// ---------------------------------------------------------------------------

describe("restaging", () => {
	it("reports a record still staged where its class puts it", () => {
		const record = VOCAB_MNEMONICS[0];
		const entry = corpusEntryFor(record);

		expect(reviewStaging(record, entry.word_class)).toEqual({
			state: "staged",
			room: record.room,
		});
	});

	it("surfaces a record whose word changed class as needing restaging", () => {
		const record = VOCAB_MNEMONICS.find(
			(m) => m.room !== "things",
		) as VocabMnemonic;

		const review = reviewStaging(record, "n");

		expect(review).toEqual({
			state: "needs-restaging",
			stagedIn: record.room,
			belongsIn: "things",
		});
	});

	it("reports a record whose word lost its class as unroomed, with a reason", () => {
		const review = reviewStaging(VOCAB_MNEMONICS[0], "");

		expect(review.state).toBe("unroomed");
		if (review.state !== "unroomed") return;
		expect(review.reason).not.toBe("");
	});
});

// ---------------------------------------------------------------------------
// Room lookup — what the review UI reads
// ---------------------------------------------------------------------------

describe("room lookup", () => {
	it("reads the room off a vocabulary card id for a word of any property", () => {
		expect(roomForVocabCardId("vocab:ผม:englishToThai")).toBe(
			"people-and-pronouns",
		);
		expect(roomForVocabCardId("vocab:ผม:spellingFromAudio")).toBe(
			"people-and-pronouns",
		);
	});

	it("has no room for an unknown word or a non-vocabulary card", () => {
		expect(roomForWord("ไม่มีคำนี้ในคลัง")).toBeNull();
		expect(roomForVocabCardId("ม:class")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// AC5 — the shared originality gate, over the staged records AND the 277
// mnemonics that already shipped in the corpus, which were written before the
// constraint existed and had never been checked.
// ---------------------------------------------------------------------------

describe("originality", () => {
	it("clears the shared gate on every staged mnemonic", async () => {
		const failures: string[] = [];
		for (const record of VOCAB_MNEMONICS) {
			const result = await checkOriginality(composeVocabMnemonic(record));
			if (result.status === "cleared") {
				// Zero windows would be a vacuous clearance on a too-short scene.
				expect(result.ngramsChecked, record.thai).toBeGreaterThan(0);
			} else if (result.status === "overlapping") {
				failures.push(`${record.thai} reuses "${result.overlap.ngram}"`);
			} else {
				failures.push(`${record.thai} not checked: ${result.reason}`);
			}
		}
		expect(failures, failures.join("; ")).toEqual([]);
	});

	it("clears the shared gate on every mnemonic already in the corpus, bar the declared overlaps", async () => {
		const shipped = entries.filter(
			(e) => e.mnemonic !== null && e.mnemonic.trim() !== "",
		);
		expect(shipped.length).toBeGreaterThan(200);

		const failures: string[] = [];
		const overlapping: { thai: string; ngram: string }[] = [];
		for (const entry of shipped) {
			const result = await checkOriginality(entry.mnemonic as string);
			if (result.status === "overlapping") {
				overlapping.push({ thai: entry.thai, ngram: result.overlap.ngram });
			} else if (result.status === "not-checked") {
				failures.push(`${entry.thai} not checked: ${result.reason}`);
			}
		}

		expect(failures, failures.join("; ")).toEqual([]);
		// Exact in both directions: a fourth overlap fails, and so does a
		// rewrite that leaves a stale entry on the declared list.
		expect(overlapping).toEqual(
			KNOWN_CORPUS_MNEMONIC_OVERLAPS.map(({ thai, ngram }) => ({
				thai,
				ngram,
			})),
		);
	});

	it("still catches a planted overlap", async () => {
		// The canary from originality.test.ts: a phrase proven verbatim in the
		// licensed set. An empty corpus clears everything above and fails here.
		const result = await checkOriginality(
			"Lesson Notes: Thai Alphabet Made Easy",
		);

		expect(result.status).toBe("overlapping");
	});
});

// ---------------------------------------------------------------------------
// The cast moves between rooms — it is not native to one
// ---------------------------------------------------------------------------

describe("cast", () => {
	it("stages each character in more than one room", () => {
		for (const character of CHARACTERS) {
			const rooms = new Set(
				VOCAB_MNEMONICS.filter((m) => m.characters.includes(character.id)).map(
					(m) => m.room,
				),
			);
			expect(rooms.size, character.name).toBeGreaterThan(1);
		}
	});

	it("brings each character back often enough to be recurring", () => {
		for (const character of CHARACTERS) {
			const appearances = VOCAB_MNEMONICS.filter((m) =>
				m.characters.includes(character.id),
			).length;
			expect(appearances, character.name).toBeGreaterThanOrEqual(15);
		}
	});
});
