import { describe, expect, it } from "vitest";
import { migrateState } from "../../../infrastructure/persistence/Storage";
import { validateLearnerState } from "../../../infrastructure/persistence/Validation";
import type { LearnerState } from "../../shared/types";
import {
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
import { lessons, specialRules } from "./symbols";

const FIRST_ID = lessonSequence[0].id;

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
			path: `/lessons/${FIRST_ID}/deck.json`,
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

	it("resolves a declared lesson to an arm", () => {
		const result = resolveLessonContent(FIRST_ID);
		expect(result.status).toBe("resolved");
		if (result.status !== "resolved") return;
		expect(result.content.kind).toBe("video");
	});

	it("reports a declared lesson absent from the lessons table as unresolvable, with a reason", () => {
		const result = lessonContentFor(lessonSequence[0], undefined);
		expect(result.status).toBe("unresolvable");
		if (result.status !== "unresolvable") return;
		expect(result.reason.length).toBeGreaterThan(0);
	});

	it("reports a declared lesson with no content source as unresolvable, never as undeclared", () => {
		const lesson = lessons.find(
			(candidate) => candidate.number === lessonSequence[0].legacyNumber,
		);
		expect(lesson).toBeDefined();
		if (!lesson) return;
		const result = lessonContentFor(lessonSequence[0], {
			...lesson,
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

	it("loads a pre-change thai-srs-state fixture and re-serialises byte-identically", () => {
		const parsed = JSON.parse(FIXTURE) as LearnerState;
		expect(validateLearnerState(parsed)).toBe(true);
		const migrated = migrateState(parsed, "2026-01-01T00:00:00.000Z");
		expect(JSON.stringify(migrated)).toBe(FIXTURE);
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
