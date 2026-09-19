import { describe, expect, it } from "vitest";
import { migrateState } from "../../../infrastructure/persistence/Storage";
import { validateLearnerState } from "../../../infrastructure/persistence/Validation";
import type { LearnerState } from "../../shared/types";
import {
	DECK_LESSON_IDS,
	type DeckRuleSlide,
	deckPathForLesson,
	describeLessonContent,
	LESSON_CONTENT_STATUSES,
	type LessonContent,
	lessonContentFor,
	lessonRules,
	renderRuleSlide,
	resolveLessonContent,
	validateDeck,
} from "./lessonContent";
import { lessonSequence } from "./lessonSequence";
import { specialRules } from "./symbols";

const FIRST_ID = lessonSequence[0].id;
// Task 4.3 closed the strangler: every declared lesson is on the deck arm,
// so no sequence entry exercises the video-resolution path any more. The
// path itself still exists in `lessonContentFor` (phase 6 owns deleting it),
// so the tests about it run against a synthetic entry and row instead of a
// declared lesson.
const SECOND_ENTRY = {
	id: "lesson-99",
	position: 99,
	legacyNumber: 99,
	required: true,
} as const;
const SECOND_ROW = {
	number: 99,
	title: "A synthetic video lesson",
	focus: "exercises the video arm",
	consonants: [],
	vowels: [],
	toneMarks: [],
	toneRulesIntroduced: [],
	specialRulesIntroduced: [],
	videoUrl: "/thai-script/videos/synthetic.webm",
};

function deck(slides: unknown[], lessonId: string = FIRST_ID) {
	return { lessonId, title: "A lesson", slides };
}

const RETRIEVAL = {
	kind: "retrieval",
	id: "try-1",
	prompt: "Which sound does this letter make?",
	revealSlideId: "show-1",
};
const REVEAL = {
	kind: "reveal",
	id: "show-1",
	retrievalSlideId: "try-1",
	answers: ["m"],
};

describe("lesson id charset", () => {
	const malformed: [string, unknown][] = [
		["uppercase", "Lesson-01"],
		["path traversal", "../../etc/passwd"],
		["absolute path", "/etc/passwd"],
		["underscore", "lesson_01"],
		["empty", ""],
		["too long", "a".repeat(65)],
		["not a string", 7],
		["null", null],
	];

	for (const [label, value] of malformed) {
		it(`refuses ${label} where a path derives from it`, () => {
			const result = deckPathForLesson(value);
			expect(result.ok).toBe(false);
		});

		it(`refuses ${label} where a lookup derives from it`, () => {
			expect(resolveLessonContent(value).status).toBe("undeclared");
		});
	}

	it("names the offending key without echoing the value", () => {
		const value = "../../etc/passwd";
		const result = deckPathForLesson(value, "lessonId");
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain("lessonId");
		expect(result.error).not.toContain(value);
		expect(result.error).not.toContain("passwd");
	});

	it("derives a path under the assets root for a well-formed id", () => {
		const result = deckPathForLesson(FIRST_ID);
		expect(result).toEqual({
			ok: true,
			path: `/thai-script/lessons/${FIRST_ID}/deck.json`,
		});
	});
});

describe("the LessonContent union", () => {
	it("dispatches over both arms", () => {
		const video: LessonContent = { kind: "video", url: "/v.webm" };
		const built: LessonContent = {
			kind: "deck",
			deckPath: "/lessons/x/deck.json",
		};
		expect(describeLessonContent(video)).toBe("video /v.webm");
		expect(describeLessonContent(built)).toBe("deck /lessons/x/deck.json");
	});
});

describe("content resolution states", () => {
	it("has three distinct states", () => {
		expect(new Set(LESSON_CONTENT_STATUSES).size).toBe(3);
		expect(LESSON_CONTENT_STATUSES).toEqual([
			"resolved",
			"unresolvable",
			"undeclared",
		]);
	});

	it("still resolves the video arm for an entry off the deck set, though no declared lesson is", () => {
		expect(DECK_LESSON_IDS.has(SECOND_ENTRY.id)).toBe(false);
		const result = lessonContentFor(SECOND_ENTRY, SECOND_ROW);
		expect(result.status).toBe("resolved");
		if (result.status !== "resolved") return;
		expect(result.content.kind).toBe("video");
		// The closure itself: every *declared* lesson is on the deck arm now.
		for (const entry of lessonSequence) {
			expect(DECK_LESSON_IDS.has(entry.id), entry.id).toBe(true);
		}
	});

	it("resolves lesson-01 to the deck arm, now that task 1.4 has wired it in", () => {
		const result = resolveLessonContent(FIRST_ID);
		expect(result.status).toBe("resolved");
		if (result.status !== "resolved") return;
		expect(result.content.kind).toBe("deck");
	});

	it("reports a declared lesson absent from the lessons table as unresolvable, with a reason", () => {
		const result = lessonContentFor(SECOND_ENTRY, undefined);
		expect(result.status).toBe("unresolvable");
		if (result.status !== "unresolvable") return;
		expect(result.reason.length).toBeGreaterThan(0);
	});

	it("reports a declared lesson with no content source as unresolvable, never as undeclared", () => {
		const result = lessonContentFor(SECOND_ENTRY, {
			...SECOND_ROW,
			videoUrl: undefined,
		});
		expect(result.status).toBe("unresolvable");
		expect(result.status).not.toBe("undeclared");
	});

	it("reports an id no lesson declares as undeclared", () => {
		const declaredIds = new Set(lessonSequence.map((entry) => entry.id));
		expect(declaredIds.has("lesson-99")).toBe(false);
		expect(resolveLessonContent("lesson-99")).toEqual({ status: "undeclared" });
	});
});

describe("a reading question keeps its word on screen", () => {
	// A reading exercise asks about one particular word, so the word has to
	// survive onto the retrieval slide that asks and the reveal slide that
	// answers. Until these carried `thai`, converting the course's ungated
	// reading pairs into real retrievals would have asked the learner to
	// decode something that was not on the screen.
	it("carries thai through a retrieval and its reveal", () => {
		const result = validateDeck(
			deck([
				{
					kind: "retrieval",
					id: "read-it",
					prompt: "Read this one.",
					revealSlideId: "read-it-answer",
					thai: "กฎหมาย",
				},
				{
					kind: "reveal",
					id: "read-it-answer",
					retrievalSlideId: "read-it",
					answers: ["gòt-măai — a law."],
					thai: "กฎหมาย",
				},
			]),
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const [ask, tell] = result.deck.slides;
		expect(ask.kind === "retrieval" && ask.thai).toBe("กฎหมาย");
		expect(tell.kind === "reveal" && tell.thai).toBe("กฎหมาย");
	});

	it("still refuses a retrieval that carries its own answer", () => {
		// The reason a retrieval is a retrieval. Adding `thai` must not have
		// opened a door beside it.
		const result = validateDeck(
			deck([
				{
					kind: "retrieval",
					id: "read-it",
					prompt: "Read this one.",
					revealSlideId: "read-it-answer",
					thai: "กฎหมาย",
					answers: ["gòt-măai"],
				},
				{
					kind: "reveal",
					id: "read-it-answer",
					retrievalSlideId: "read-it",
					answers: ["gòt-măai"],
				},
			]),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((e) => e.code)).toContain(
			"retrieval-answer-on-same-slide",
		);
	});

	it("leaves thai off when the slide does not read anything", () => {
		const result = validateDeck(deck([RETRIEVAL, REVEAL]));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const [ask] = result.deck.slides;
		expect(ask.kind === "retrieval" && ask.thai).toBeUndefined();
	});
});

describe("a deck's stated length", () => {
	const WITH_SLIDES = [RETRIEVAL, REVEAL];

	it("carries the timing block through when the deck states one", () => {
		const result = validateDeck({
			...deck(WITH_SLIDES),
			timing: {
				spokenSeconds: 2057,
				practiceSeconds: 400,
				estimatedMinutes: 41,
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.deck.timing).toEqual({
			spokenSeconds: 2057,
			practiceSeconds: 400,
			estimatedMinutes: 41,
		});
	});

	it("accepts a deck that states no timing, and reports none", () => {
		const result = validateDeck(deck(WITH_SLIDES));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.deck.timing).toBeUndefined();
	});

	it("drops a malformed timing block rather than refusing the deck", () => {
		// A deck is still perfectly playable without a length, so a broken
		// timing block must not cost the learner the lesson. It is dropped,
		// and the UI then says nothing rather than something wrong.
		for (const timing of [
			{ spokenSeconds: 10, practiceSeconds: 5 },
			{ spokenSeconds: "ten", practiceSeconds: 5, estimatedMinutes: 1 },
			{ spokenSeconds: -1, practiceSeconds: 5, estimatedMinutes: 1 },
			{
				spokenSeconds: Number.NaN,
				practiceSeconds: 5,
				estimatedMinutes: 1,
			},
			"41 minutes",
			null,
		]) {
			const result = validateDeck({ ...deck(WITH_SLIDES), timing });
			expect(result.ok).toBe(true);
			if (!result.ok) continue;
			expect(result.deck.timing).toBeUndefined();
		}
	});
});

describe("the deck schema's retrieval requirement", () => {
	it("accepts a deck whose retrieval step precedes its reveal", () => {
		const result = validateDeck(
			deck([
				{
					kind: "exposition",
					id: "intro",
					heading: "Two letters",
					body: ["ม"],
				},
				RETRIEVAL,
				REVEAL,
			]),
		);
		expect(result.ok).toBe(true);
	});

	it("refuses a deck of pure exposition, naming the missing step", () => {
		const result = validateDeck(
			deck([
				{
					kind: "exposition",
					id: "intro",
					heading: "Two letters",
					body: ["ม"],
				},
			]),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((error) => error.code)).toContain(
			"missing-retrieval",
		);
		expect(
			result.errors.find((error) => error.code === "missing-retrieval")
				?.message,
		).toMatch(/retrieval step/);
	});

	it("refuses a reveal with no preceding retrieval step", () => {
		const result = validateDeck(deck([REVEAL, RETRIEVAL]));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((error) => error.code)).toContain(
			"reveal-before-retrieval",
		);
	});

	it("refuses a retrieval slide that carries its own answer", () => {
		const result = validateDeck(
			deck([{ ...RETRIEVAL, answers: ["m"] }, REVEAL]),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((error) => error.code)).toContain(
			"retrieval-answer-on-same-slide",
		);
	});

	it("refuses a reveal naming a retrieval slide that does not exist", () => {
		const result = validateDeck(
			deck([RETRIEVAL, { ...REVEAL, retrievalSlideId: "nowhere" }]),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((error) => error.code)).toContain(
			"dangling-reveal",
		);
	});

	it("refuses a deck whose lesson id is outside the charset", () => {
		const result = validateDeck(deck([RETRIEVAL, REVEAL], "../secrets"));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors[0].code).toBe("lesson-id-refused");
		expect(result.errors[0].message).not.toContain("secrets");
	});
});

describe("rule slides render from the lesson's rules block", () => {
	const lessonWithRule = lessonSequence.find(
		(entry) => lessonRules(entry.legacyNumber).length > 0,
	);

	it("resolves a lesson's rules from the tables that already declare them", () => {
		expect(lessonWithRule).toBeDefined();
		const rules = lessonRules(lessonWithRule?.legacyNumber ?? 0);
		expect(rules.length).toBeGreaterThan(0);
		for (const rule of rules) {
			expect(rule.title.length).toBeGreaterThan(0);
			expect(rule.text.length).toBeGreaterThan(0);
		}
	});

	it("renders a rule slide from the block entry, not from slide prose", () => {
		const entry = lessonWithRule;
		expect(entry).toBeDefined();
		if (!entry) return;
		const rule = lessonRules(entry.legacyNumber)[0];
		const result = validateDeck(
			deck(
				[RETRIEVAL, REVEAL, { kind: "rule", id: "rule-1", ruleId: rule.id }],
				entry.id,
			),
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const slide = result.deck.slides.find(
			(candidate): candidate is DeckRuleSlide => candidate.kind === "rule",
		);
		expect(slide).toBeDefined();
		if (!slide) return;
		expect(renderRuleSlide(result.deck, slide)).toEqual(rule);
		const declared = specialRules.find((candidate) => candidate.id === rule.id);
		if (declared) expect(rule.text).toBe(declared.description);
	});

	it("refuses a rule slide that states the rule in its own prose", () => {
		const entry = lessonWithRule;
		if (!entry) return;
		const rule = lessonRules(entry.legacyNumber)[0];
		const result = validateDeck(
			deck(
				[
					RETRIEVAL,
					REVEAL,
					{ kind: "rule", id: "rule-1", ruleId: rule.id, text: "a paraphrase" },
				],
				entry.id,
			),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((error) => error.code)).toContain(
			"rule-slide-carries-prose",
		);
	});

	it("refuses a rule slide naming a rule the lesson does not teach", () => {
		const result = validateDeck(
			deck([
				RETRIEVAL,
				REVEAL,
				{ kind: "rule", id: "rule-1", ruleId: "not-a-rule" },
			]),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors.map((error) => error.code)).toContain("unknown-rule");
	});
});

describe("persisted state is untouched by this task", () => {
	// Written by the app before this task ran: `completedLessons` is number[],
	// `currentLesson` is a number, and every script card carries `lessonNumber`.
	const FIXTURE =
		'{"completedLessons":[1,2,3],"currentLesson":4,"cards":{"sym-m-sound":{"id":"sym-m-sound","question":"What sound does ม make?","correctAnswer":"m","choices":["m","n","ng","y"],"srs":{"easeFactor":2.5,"interval":10,"repetitions":0,"learningStep":1,"nextReviewDate":"2026-01-01T00:00:00.000Z","lastReviewDate":null,"lapseCount":0},"symbolCharacter":"ม","property":"sound","lessonNumber":1}},"vocabCards":{},"grammarCards":{},"sentenceCards":{},"sessionHistory":[],"achievements":["first-lesson"]}';

	it("loads a pre-change thai-srs-state fixture and converts it once", () => {
		const parsed = JSON.parse(FIXTURE) as LearnerState;
		expect(validateLearnerState(parsed)).toBe(true);
		const migrated = migrateState(parsed, "2026-01-01T00:00:00.000Z");
		// This used to assert the bytes came back unchanged, which held only
		// while legacy number and position were the same integer. Inserting
		// `lesson-loops` at the front ended that: the fixture now moves, and
		// what matters is that it moves exactly once.
		const once = JSON.stringify(migrated);
		expect(once).not.toBe(FIXTURE);
		expect(
			JSON.stringify(migrateState(migrated, "2026-01-01T00:00:00.000Z")),
		).toBe(once);
		expect(validateLearnerState(migrated)).toBe(true);
	});

	it("still keys lessons by number in every persisted store", () => {
		const parsed = JSON.parse(FIXTURE) as LearnerState;
		expect(parsed.completedLessons.every((n) => typeof n === "number")).toBe(
			true,
		);
		expect(typeof parsed.currentLesson).toBe("number");
		const card = parsed.cards["sym-m-sound"];
		expect(typeof card.lessonNumber).toBe("number");
	});
});
