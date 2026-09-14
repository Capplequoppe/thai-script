import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DISTRICTS } from "../../script/data/sceneGrammar";
import type { VocabProperty } from "../types";
import {
	assignRoom,
	isKnownWordClass,
	KNOWN_WORD_CLASSES,
	NOUN_SUBDISTRICTS,
	ROOMS,
	ROOMS_AND_DISTRICTS_ARE_DISJOINT,
	reportNounSubdistrictOverflows,
	roomExposureFor,
	roomForWordClass,
} from "./rooms";

const VOCAB_PATH = join(import.meta.dirname, "vocabulary.json");

interface RawVocabEntry {
	word_class: string;
}

function loadCorpusWordClasses(): Set<string> {
	const raw = JSON.parse(readFileSync(VOCAB_PATH, "utf8")) as RawVocabEntry[];
	return new Set(raw.map((entry) => entry.word_class).filter((c) => c !== ""));
}

const ALL_VOCAB_PROPERTIES: VocabProperty[] = [
	"thaiToEnglish",
	"englishToThai",
	"audioRecognition",
	"toneIdentification",
	"spelling",
	"spellingFromAudio",
];

// AC1 -----------------------------------------------------------------------

describe("AC1: every corpus word class maps to exactly one room", () => {
	it("maps every non-empty word_class value found in the corpus to a room", () => {
		const corpusClasses = loadCorpusWordClasses();
		expect(corpusClasses.size).toBeGreaterThan(0);
		for (const wordClass of corpusClasses) {
			expect(
				isKnownWordClass(wordClass),
				`corpus word_class "${wordClass}" is not in KNOWN_WORD_CLASSES`,
			).toBe(true);
		}
	});

	it("declares no more and no fewer word classes than the corpus carries", () => {
		const corpusClasses = loadCorpusWordClasses();
		expect(new Set(KNOWN_WORD_CLASSES)).toEqual(corpusClasses);
	});

	it("maps every known word class to exactly one room, total in both directions", () => {
		for (const wordClass of KNOWN_WORD_CLASSES) {
			const room = roomForWordClass(wordClass);
			expect(ROOMS).toContain(room);
		}
	});

	it("every room has at least one word class mapping to it", () => {
		const reached = new Set(KNOWN_WORD_CLASSES.map(roomForWordClass));
		for (const room of ROOMS) {
			expect(reached.has(room), `no word class maps to room "${room}"`).toBe(
				true,
			);
		}
	});

	it("maps verbs and adjectives to the same room", () => {
		expect(roomForWordClass("v")).toBe(roomForWordClass("adj"));
	});

	it("gives classifiers and particles their own rooms, not folded into connectors", () => {
		const connectorsRoom = roomForWordClass("conj");
		expect(roomForWordClass("clf")).not.toBe(connectorsRoom);
		expect(roomForWordClass("part")).not.toBe(connectorsRoom);
		expect(roomForWordClass("clf")).not.toBe(roomForWordClass("part"));
	});
});

// AC2 -------------------------------------------------------------------

describe("AC2: rooms and scene-grammar districts are disjoint vocabularies", () => {
	it("shares no name between ROOMS and DISTRICTS", () => {
		expect(ROOMS_AND_DISTRICTS_ARE_DISJOINT).toBe(true);
		const roomSet = new Set<string>(ROOMS);
		for (const district of DISTRICTS) {
			expect(roomSet.has(district)).toBe(false);
		}
	});
});

// AC3 -------------------------------------------------------------------

describe("AC3: noun sub-districts declare a bounded capacity each", () => {
	it("declares at least one sub-district, each with a positive capacity", () => {
		expect(NOUN_SUBDISTRICTS.length).toBeGreaterThan(0);
		for (const subdistrict of NOUN_SUBDISTRICTS) {
			expect(subdistrict.capacity).toBeGreaterThan(0);
		}
	});

	it("reports a sub-district pushed past its declared capacity", () => {
		const first = NOUN_SUBDISTRICTS[0];
		const overflows = reportNounSubdistrictOverflows({
			[first.name]: first.capacity + 1,
		});
		expect(overflows).toEqual([
			{
				subdistrict: first.name,
				capacity: first.capacity,
				count: first.capacity + 1,
			},
		]);
	});

	it("does not report a sub-district at or under its declared capacity", () => {
		const first = NOUN_SUBDISTRICTS[0];
		const overflows = reportNounSubdistrictOverflows({
			[first.name]: first.capacity,
		});
		expect(overflows).toEqual([]);
	});
});

// AC4 -------------------------------------------------------------------

describe("AC4: the room is never exposed before the learner has acted", () => {
	it.each(
		ALL_VOCAB_PROPERTIES,
	)("for %s: hidden before acting, obtainable on request, present after reveal", (property) => {
		const before = roomExposureFor(property, {
			revealed: false,
			hintRequested: false,
		});
		expect(before.visible).toBe(false);

		const onRequest = roomExposureFor(property, {
			revealed: false,
			hintRequested: true,
		});
		expect(onRequest.visible).toBe(true);
		if (onRequest.visible) {
			expect(onRequest.via).toBe("hint");
		}

		const afterReveal = roomExposureFor(property, {
			revealed: true,
			hintRequested: false,
		});
		expect(afterReveal.visible).toBe(true);
		if (afterReveal.visible) {
			expect(afterReveal.via).toBe("reveal");
		}
	});

	it("records a room requested as a hint distinctly from unaided recall", () => {
		const askedThenRevealed = roomExposureFor("thaiToEnglish", {
			revealed: true,
			hintRequested: true,
		});
		const recalledUnaided = roomExposureFor("thaiToEnglish", {
			revealed: true,
			hintRequested: false,
		});
		expect(askedThenRevealed.hintUsed).toBe(true);
		expect(recalledUnaided.hintUsed).toBe(false);
	});
});

// AC5 -------------------------------------------------------------------

describe("AC5: a word is in exactly one of three room-assignment states", () => {
	it("assigns a known word class to its room", () => {
		const result = assignRoom("n");
		expect(result).toEqual({ state: "assigned", room: "things" });
	});

	it("reports an unrecognised, non-empty word class as unassignable with a reason", () => {
		const result = assignRoom("xyz");
		expect(result.state).toBe("unassignable");
		if (result.state === "unassignable") {
			expect(result.reason.length).toBeGreaterThan(0);
		}
	});

	it("reports an empty word class as unclassified, never as unassignable", () => {
		const result = assignRoom("");
		expect(result).toEqual({ state: "unclassified" });
	});

	it("produces three distinct state values", () => {
		const states = new Set(
			[assignRoom("n"), assignRoom("xyz"), assignRoom("")].map((r) => r.state),
		);
		expect(states).toEqual(
			new Set(["assigned", "unassignable", "unclassified"]),
		);
	});
});
