/**
 * What a lesson *serves* — and the schema the in-house decks are written to.
 *
 * The content-source seam: `LessonContent` is a two-arm discriminated union so
 * a lesson can serve either a licensed `.webm` or an in-house deck, one lesson
 * at a time, with the compiler refusing any dispatch that forgets an arm.
 *
 * The deck schema's one non-structural demand is **retrieval**: a deck is
 * invalid unless the learner is asked to attempt something before the answer
 * is shown. A guideline would be honoured by the first deck and forgotten by
 * the twelfth; a schema rule is checked on every deck for free.
 */

import {
	type LessonSequenceEntry,
	lessonEntryById,
	parseLessonId,
} from "./lessonSequence";
import { type Lesson, lessons, specialRules, toneRules } from "./symbols";

// ============================================================================
// The content union
// ============================================================================

export type LessonContent =
	| { readonly kind: "video"; readonly url: string }
	| { readonly kind: "deck"; readonly deckPath: string };

/**
 * Exhaustive dispatch over `LessonContent`. The `never` default is the point:
 * adding a third arm without handling it here is a compile error, which is how
 * every downstream dispatch is kept honest too.
 */
export function describeLessonContent(content: LessonContent): string {
	switch (content.kind) {
		case "video":
			return `video ${content.url}`;
		case "deck":
			return `deck ${content.deckPath}`;
		default: {
			const _never: never = content;
			return _never;
		}
	}
}

// ============================================================================
// Asset paths
// ============================================================================

/** Public root under which every generated lesson asset lives. */
export const LESSON_ASSET_ROOT = "/lessons";

export type DeckPathResult =
	| { readonly ok: true; readonly path: string }
	| { readonly ok: false; readonly error: string };

/**
 * The one place a filesystem/URL path is derived from a lesson id, and so the
 * one place the charset has to hold. Task 1.3 owns the containment check at
 * the generator's write boundary; this owns the charset.
 */
export function deckPathForLesson(
	value: unknown,
	key = "lessonId",
): DeckPathResult {
	const parsed = parseLessonId(value, key);
	if (!parsed.ok) return parsed;
	return { ok: true, path: `${LESSON_ASSET_ROOT}/${parsed.id}/deck.json` };
}

// ============================================================================
// Resolution — three states, and "unresolvable" never reads as "undeclared"
// ============================================================================

/**
 * Lessons whose content is an in-house deck. Empty at the end of task 1.1a:
 * every lesson still serves its video. Task 1.4 adds `lesson-01`, and each
 * later content task adds its own — that addition is the whole strangler.
 */
export const DECK_LESSON_IDS: ReadonlySet<string> = new Set<string>();

export type LessonContentResolution =
	/** Declared, and its content source is known. */
	| { readonly status: "resolved"; readonly content: LessonContent }
	/** Declared, but no content source can be produced — with the reason. */
	| { readonly status: "unresolvable"; readonly reason: string }
	/** No lesson with this id is declared at all. */
	| { readonly status: "undeclared" };

/**
 * The three statuses are distinct values on purpose: a lesson whose video is
 * missing must never be indistinguishable from a lesson that does not exist,
 * because the first is a broken build and the second is an ordinary 404.
 */
export const LESSON_CONTENT_STATUSES = [
	"resolved",
	"unresolvable",
	"undeclared",
] as const;

/**
 * Content for a lesson that is known to be declared, so the only two outcomes
 * left are "resolved" and "unresolvable". Split out from `resolveLessonContent`
 * because the undeclared case is decided by the lookup and this one is not —
 * a lesson whose video went missing must never read as a lesson that does not
 * exist.
 */
export function lessonContentFor(
	entry: LessonSequenceEntry,
	lesson: Lesson | undefined,
): LessonContentResolution {
	if (DECK_LESSON_IDS.has(entry.id)) {
		const path = deckPathForLesson(entry.id);
		if (!path.ok) return { status: "unresolvable", reason: path.error };
		return {
			status: "resolved",
			content: { kind: "deck", deckPath: path.path },
		};
	}
	if (!lesson) {
		return {
			status: "unresolvable",
			reason:
				"lessonId: declared in the sequence but absent from the lessons table",
		};
	}
	if (!lesson.videoUrl) {
		return {
			status: "unresolvable",
			reason: "lessonId: declares neither a deck nor a video url",
		};
	}
	return {
		status: "resolved",
		content: { kind: "video", url: lesson.videoUrl },
	};
}

export function resolveLessonContent(value: unknown): LessonContentResolution {
	const lookup = lessonEntryById(value);
	if (!lookup.ok) return { status: "undeclared" };
	const entry = lookup.entry;
	return lessonContentFor(
		entry,
		lessons.find((lesson) => lesson.number === entry.legacyNumber),
	);
}

// ============================================================================
// The rules block
// ============================================================================

/**
 * A rule a lesson teaches, resolved from the tables that already declare it
 * (`toneRules`, `specialRules`) via the ids the lessons table already lists.
 * Rule slides render from this — they carry no prose of their own, so the
 * slide and the rule cannot drift apart.
 */
export interface LessonRule {
	readonly id: string;
	readonly kind: "tone" | "special";
	readonly title: string;
	readonly text: string;
}

export function lessonRules(legacyNumber: number): readonly LessonRule[] {
	const lesson = lessons.find((candidate) => candidate.number === legacyNumber);
	if (!lesson) return [];

	const tone = lesson.toneRulesIntroduced.flatMap<LessonRule>((id) => {
		const rule = toneRules.find((candidate) => candidate.id === id);
		if (!rule) return [];
		return [
			{
				id: rule.id,
				kind: "tone",
				title: `${rule.consonantClass} class + ${rule.syllableType} syllable = ${rule.resultingTone} tone`,
				text: rule.description,
			},
		];
	});
	const special = lesson.specialRulesIntroduced.flatMap<LessonRule>((id) => {
		const rule = specialRules.find((candidate) => candidate.id === id);
		if (!rule) return [];
		return [
			{
				id: rule.id,
				kind: "special",
				title: rule.title,
				text: rule.description,
			},
		];
	});
	return [...tone, ...special];
}

// ============================================================================
// The deck schema
// ============================================================================

export interface DeckExpositionSlide {
	readonly kind: "exposition";
	readonly id: string;
	readonly heading: string;
	readonly body: readonly string[];
}

/**
 * A prompt the learner attempts. It names the reveal that answers it and
 * carries no answer itself — the attempt is the mechanism, so an answer
 * sitting on the same slide defeats the slide entirely.
 */
export interface DeckRetrievalSlide {
	readonly kind: "retrieval";
	readonly id: string;
	readonly prompt: string;
	readonly revealSlideId: string;
}

export interface DeckRevealSlide {
	readonly kind: "reveal";
	readonly id: string;
	readonly retrievalSlideId: string;
	readonly answers: readonly string[];
}

/** Renders from the lesson's rules block; holds no prose of its own. */
export interface DeckRuleSlide {
	readonly kind: "rule";
	readonly id: string;
	readonly ruleId: string;
}

export type DeckSlide =
	| DeckExpositionSlide
	| DeckRetrievalSlide
	| DeckRevealSlide
	| DeckRuleSlide;

export interface LessonDeck {
	readonly lessonId: string;
	readonly title: string;
	readonly slides: readonly DeckSlide[];
}

export type DeckErrorCode =
	| "malformed"
	| "lesson-id-refused"
	| "duplicate-slide-id"
	| "retrieval-answer-on-same-slide"
	| "dangling-reveal"
	| "reveal-before-retrieval"
	| "missing-retrieval"
	| "unknown-rule"
	| "rule-slide-carries-prose";

export interface DeckValidationError {
	readonly code: DeckErrorCode;
	readonly message: string;
	readonly slideId?: string;
}

export type DeckValidationResult =
	| { readonly ok: true; readonly deck: LessonDeck }
	| { readonly ok: false; readonly errors: readonly DeckValidationError[] };

/** Keys that would put an answer on the retrieval slide itself. */
const ANSWER_KEYS = ["answer", "answers", "reveal", "solution"] as const;
/** Keys that would let a rule slide state a rule differently from the block. */
const PROSE_KEYS = ["heading", "body", "text", "description"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function parseSlide(
	raw: unknown,
	index: number,
	errors: DeckValidationError[],
): DeckSlide | undefined {
	const at = `slides[${index}]`;
	if (!isRecord(raw)) {
		errors.push({ code: "malformed", message: `${at}: not an object` });
		return undefined;
	}
	const id = raw.id;
	if (typeof id !== "string" || id.length === 0) {
		errors.push({ code: "malformed", message: `${at}: missing a string id` });
		return undefined;
	}

	switch (raw.kind) {
		case "exposition": {
			if (typeof raw.heading !== "string" || !isStringArray(raw.body)) {
				errors.push({
					code: "malformed",
					slideId: id,
					message: `${at}: an exposition slide needs a heading and a body of strings`,
				});
				return undefined;
			}
			return { kind: "exposition", id, heading: raw.heading, body: raw.body };
		}
		case "retrieval": {
			if (
				typeof raw.prompt !== "string" ||
				typeof raw.revealSlideId !== "string"
			) {
				errors.push({
					code: "malformed",
					slideId: id,
					message: `${at}: a retrieval slide needs a prompt and a revealSlideId`,
				});
				return undefined;
			}
			const leaked = ANSWER_KEYS.find((key) => key in raw);
			if (leaked) {
				errors.push({
					code: "retrieval-answer-on-same-slide",
					slideId: id,
					message: `${at}: retrieval slide carries "${leaked}"; the answer must live on the reveal slide it names, not beside the prompt`,
				});
				return undefined;
			}
			return {
				kind: "retrieval",
				id,
				prompt: raw.prompt,
				revealSlideId: raw.revealSlideId,
			};
		}
		case "reveal": {
			if (
				typeof raw.retrievalSlideId !== "string" ||
				!isStringArray(raw.answers)
			) {
				errors.push({
					code: "malformed",
					slideId: id,
					message: `${at}: a reveal slide needs a retrievalSlideId and answers`,
				});
				return undefined;
			}
			return {
				kind: "reveal",
				id,
				retrievalSlideId: raw.retrievalSlideId,
				answers: raw.answers,
			};
		}
		case "rule": {
			if (typeof raw.ruleId !== "string") {
				errors.push({
					code: "malformed",
					slideId: id,
					message: `${at}: a rule slide needs a ruleId`,
				});
				return undefined;
			}
			const prose = PROSE_KEYS.find((key) => key in raw);
			if (prose) {
				errors.push({
					code: "rule-slide-carries-prose",
					slideId: id,
					message: `${at}: rule slide carries "${prose}"; a rule slide renders from the lesson's rules block so the two cannot disagree`,
				});
				return undefined;
			}
			return { kind: "rule", id, ruleId: raw.ruleId };
		}
		default:
			errors.push({
				code: "malformed",
				slideId: id,
				message: `${at}: unknown slide kind`,
			});
			return undefined;
	}
}

function checkRetrieval(
	slides: readonly DeckSlide[],
	errors: DeckValidationError[],
): void {
	const retrievalsSeen = new Set<string>();
	let pairs = 0;

	for (const slide of slides) {
		if (slide.kind === "retrieval") {
			retrievalsSeen.add(slide.id);
			continue;
		}
		if (slide.kind !== "reveal") continue;

		const target = slides.find(
			(candidate) =>
				candidate.kind === "retrieval" &&
				candidate.id === slide.retrievalSlideId,
		);
		if (!target) {
			errors.push({
				code: "dangling-reveal",
				slideId: slide.id,
				message: `reveal "${slide.id}" names no retrieval slide that exists`,
			});
			continue;
		}
		if (!retrievalsSeen.has(slide.retrievalSlideId)) {
			errors.push({
				code: "reveal-before-retrieval",
				slideId: slide.id,
				message: `reveal "${slide.id}" comes before the retrieval step it answers; the learner must attempt first`,
			});
			continue;
		}
		pairs += 1;
	}

	if (pairs === 0) {
		errors.push({
			code: "missing-retrieval",
			message:
				"deck has no retrieval step before a reveal: a deck must ask the learner to attempt at least one answer before showing it",
		});
	}
}

export function validateDeck(value: unknown): DeckValidationResult {
	const errors: DeckValidationError[] = [];

	if (!isRecord(value)) {
		return {
			ok: false,
			errors: [{ code: "malformed", message: "deck: not an object" }],
		};
	}
	const lessonId = parseLessonId(value.lessonId, "lessonId");
	if (!lessonId.ok) {
		return {
			ok: false,
			errors: [{ code: "lesson-id-refused", message: lessonId.error }],
		};
	}
	if (typeof value.title !== "string" || value.title.length === 0) {
		errors.push({ code: "malformed", message: "deck: missing a title" });
	}
	if (!Array.isArray(value.slides)) {
		return {
			ok: false,
			errors: [
				...errors,
				{ code: "malformed", message: "deck: slides must be an array" },
			],
		};
	}

	const slides: DeckSlide[] = [];
	const seenIds = new Set<string>();
	value.slides.forEach((raw, index) => {
		const slide = parseSlide(raw, index, errors);
		if (!slide) return;
		if (seenIds.has(slide.id)) {
			errors.push({
				code: "duplicate-slide-id",
				slideId: slide.id,
				message: `slides[${index}]: slide id is already used`,
			});
			return;
		}
		seenIds.add(slide.id);
		slides.push(slide);
	});

	checkRetrieval(slides, errors);

	const entry = lessonEntryById(lessonId.id);
	const rules = entry.ok ? lessonRules(entry.entry.legacyNumber) : [];
	for (const slide of slides) {
		if (slide.kind !== "rule") continue;
		if (!rules.some((rule) => rule.id === slide.ruleId)) {
			errors.push({
				code: "unknown-rule",
				slideId: slide.id,
				message: `rule slide "${slide.id}" names a rule this lesson does not declare`,
			});
		}
	}

	if (errors.length > 0) return { ok: false, errors };
	return {
		ok: true,
		deck: { lessonId: lessonId.id, title: value.title as string, slides },
	};
}

/**
 * The rendering source for a rule slide: the lesson's own rules-block entry.
 * There is no other text on the slide, which is what makes "the lesson applies
 * the rule as it states it" checkable at all.
 */
export function renderRuleSlide(
	deck: LessonDeck,
	slide: DeckRuleSlide,
): LessonRule | undefined {
	const entry = lessonEntryById(deck.lessonId);
	if (!entry.ok) return undefined;
	return lessonRules(entry.entry.legacyNumber).find(
		(rule) => rule.id === slide.ruleId,
	);
}
