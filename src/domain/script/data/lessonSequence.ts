/**
 * The declared lesson sequence: the one place lesson identity and lesson
 * ordering are written down.
 *
 * A lesson is identified by a stable `id`, ordered by array position, and
 * joined to the `symbols.ts` tables through `legacyNumber` — the integer the
 * five persisted stores keyed on before task 1.1b's migration, and the value
 * `sym.lesson` still carries. Persisted stores hold *positions*; every join
 * against the legacy space routes through this table.
 *
 * Task 4.3 closed the sequence: the fourteen video lessons that remained
 * (legacy 12-25) are replaced by three in-house lessons (12-14) and the
 * retired numbers below, the three promoted lessons and the consolidated
 * tone-mark lesson take their teaching positions, and Thai numerals become an
 * optional track at the end. Ordering is read from `lessonSequence` and from
 * nowhere else; the lesson *counts* are derived from it, never written as
 * literals.
 */

/**
 * Lesson ids double as a path segment under `public/lessons/` and as a lookup
 * key, so the charset is closed rather than merely conventional.
 */
export const LESSON_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

export interface LessonSequenceEntry {
	/** Stable identity. Survives resequencing; never reused for another lesson. */
	readonly id: string;
	/** 1-based place in the course. Derived from declaration order. */
	readonly position: number;
	/**
	 * The integer `symbols.ts` files this lesson's rows and symbols under
	 * (CONTEXT.md Rule 1). Unique forever: a retired number is never reused,
	 * because persisted cards written under the old numbering still carry it.
	 */
	readonly legacyNumber: number;
	/**
	 * Whether completing this lesson is part of completing the course.
	 * `false` marks an optional track — taught, reachable, but a learner who
	 * declines it has not left the course incomplete (task 4.3 AC4).
	 */
	readonly required: boolean;
}

/**
 * Declaration order is the course order. Positions are assigned from it.
 *
 * The ordering constraints this declaration satisfies, in one place so a
 * resequence can check itself against them:
 * - `lesson-loops` is first: it teaches stroke order and the naming
 *   pattern, which `lesson-01` spends immediately and every lesson after
 *   relies on;
 * - lessons 12-14 teach every consonant and written vowel not taught by the
 *   opening and middle bands, so everything after them may use any symbol;
 * - `lesson-tone-marks` comes after every spelling-based tone rule
 *   (`toneRules`, lessons 2-13) and before `lesson-clusters` and
 *   `lesson-leading-consonants`, whose decks print marked words;
 * - `lesson-unwritten-vowels` comes after lesson-14, whose letters (ฎ, ฏ)
 *   appear in its examples;
 * - `lesson-numerals` is last: `startLesson` requires every earlier position
 *   complete, so an optional track anywhere else would block the course.
 */
const DECLARED: readonly Omit<LessonSequenceEntry, "position">[] = [
	// Before lesson 1 because it teaches the two systems every letter
	// obeys — stroke order and the naming pattern — and `lesson-01` spends
	// both on its first two slides. It teaches no symbol of its own.
	{ id: "lesson-loops", legacyNumber: 31, required: true },
	{ id: "lesson-01", legacyNumber: 1, required: true },
	{ id: "lesson-02", legacyNumber: 2, required: true },
	{ id: "lesson-03", legacyNumber: 3, required: true },
	{ id: "lesson-04", legacyNumber: 4, required: true },
	{ id: "lesson-05", legacyNumber: 5, required: true },
	{ id: "lesson-06", legacyNumber: 6, required: true },
	{ id: "lesson-07", legacyNumber: 7, required: true },
	{ id: "lesson-08", legacyNumber: 8, required: true },
	{ id: "lesson-09", legacyNumber: 9, required: true },
	{ id: "lesson-10", legacyNumber: 10, required: true },
	{ id: "lesson-11", legacyNumber: 11, required: true },
	{ id: "lesson-12", legacyNumber: 12, required: true },
	{ id: "lesson-13", legacyNumber: 13, required: true },
	{ id: "lesson-14", legacyNumber: 14, required: true },
	{ id: "lesson-unwritten-vowels", legacyNumber: 26, required: true },
	{ id: "lesson-tone-marks", legacyNumber: 29, required: true },
	{ id: "lesson-clusters", legacyNumber: 27, required: true },
	{ id: "lesson-leading-consonants", legacyNumber: 28, required: true },
	{ id: "lesson-numerals", legacyNumber: 30, required: false },
];

export const lessonSequence: readonly LessonSequenceEntry[] = Object.freeze(
	DECLARED.map((entry, index) =>
		Object.freeze({ ...entry, position: index + 1 }),
	),
);

/**
 * The legacy numbers this resequence retired, each mapped to the lesson that
 * absorbed the bulk of its material. Persisted stores written under the old
 * numbering still carry these values, and `migrateLessonIdentity`
 * (`Storage.ts`) currently *refuses* a state that references an undeclared
 * number — the epoch-marked migration its own NOTE calls for must consume
 * this map before the resequence reaches a learner's browser. Declared here
 * so that migration reads the mapping off the resequence that caused it.
 */
export const RETIRED_LESSONS: readonly {
	readonly legacyNumber: number;
	readonly absorbedBy: string;
}[] = Object.freeze([
	{ legacyNumber: 15, absorbedBy: "lesson-12" }, // ห; -ัว/-ัวะ moved to lesson-14
	{ legacyNumber: 16, absorbedBy: "lesson-13" }, // ภ ธ ณ ญ, ำ
	{ legacyNumber: 17, absorbedBy: "lesson-tone-marks" }, // ่ ้
	{ legacyNumber: 18, absorbedBy: "lesson-tone-marks" }, // ๊ ๋
	{ legacyNumber: 19, absorbedBy: "lesson-14" }, // ถ moved to lesson-12; ฐ ฎ ฏ
	{ legacyNumber: 20, absorbedBy: "lesson-14" }, // ฑ ฒ
	{ legacyNumber: 21, absorbedBy: "lesson-14" }, // ฬ ฆ
	{ legacyNumber: 22, absorbedBy: "lesson-14" }, // ฃ ฅ ฌ, ฤ ฤๅ ฦ ฦๅ
	{ legacyNumber: 23, absorbedBy: "lesson-numerals" }, // ๑ ๒ ๓
	{ legacyNumber: 24, absorbedBy: "lesson-numerals" }, // ๔ ๕ ๖
	{ legacyNumber: 25, absorbedBy: "lesson-numerals" }, // ๗ ๘ ๙ ๐
]);

/**
 * The number of lessons a learner must complete for the course to be
 * complete — the required lessons, not the declared entries. The completion
 * consumers (`AchievementService`'s `completedLessons.length >= lessonCount`
 * and the badge copy built from the same value) read this, which is what
 * keeps an optional track from silently holding the course open (AC4).
 * Navigation walks `lessonSequence` itself and shows every entry.
 */
export const lessonCount = lessonSequence.filter(
	(entry) => entry.required,
).length;

// ============================================================================
// The numerals track (AC4)
// ============================================================================

/**
 * The three states the optional numerals track can be in for a learner, as
 * three distinct values. "skipped" is a first-class state, not an absence:
 * the learner finished every required lesson and the course closed without
 * the track, which is a different fact from not having reached it yet.
 */
export type NumeralsTrackState = "not-started" | "completed" | "skipped";

/**
 * Resolves the numerals track's state from the learner's completed positions.
 *
 * - "completed": the numerals lesson itself was completed.
 * - "skipped": every required lesson is complete and the numerals lesson is
 *   not — the learner reached the end of the course and moved past the track.
 *   Starting the track later flips this to "completed"; nothing is lost.
 * - "not-started": the course is still in progress and the track has not
 *   been reached.
 */
export function numeralsTrackState(
	completedLessons: readonly number[],
): NumeralsTrackState {
	const completed = new Set(completedLessons);
	const numerals = lessonSequence.find((entry) => !entry.required);
	if (!numerals) return "not-started";
	if (completed.has(numerals.position)) return "completed";
	const requiredDone = lessonSequence.every(
		(entry) => !entry.required || completed.has(entry.position),
	);
	return requiredDone ? "skipped" : "not-started";
}

export type LessonIdRefusal = { readonly ok: false; readonly error: string };

export type LessonIdResult =
	| { readonly ok: true; readonly id: string }
	| LessonIdRefusal;

/**
 * The gate every path derivation and every lookup passes an id through.
 *
 * The refusal names `key` and deliberately does **not** echo the value: a
 * rejected id is by definition attacker-shaped (`../../etc/passwd`), and the
 * message ends up in logs and findings.
 */
export function parseLessonId(
	value: unknown,
	key = "lessonId",
): LessonIdResult {
	if (typeof value !== "string") {
		return { ok: false, error: `${key}: expected a string lesson id` };
	}
	if (!LESSON_ID_PATTERN.test(value)) {
		return {
			ok: false,
			error: `${key}: not a lesson id (must match ${LESSON_ID_PATTERN.source})`,
		};
	}
	return { ok: true, id: value };
}

export type LessonLookupResult =
	| { readonly ok: true; readonly entry: LessonSequenceEntry }
	| LessonIdRefusal;

/** Lookup by stable id. Refuses a malformed id rather than simply missing it. */
export function lessonEntryById(
	value: unknown,
	key = "lessonId",
): LessonLookupResult {
	const parsed = parseLessonId(value, key);
	if (!parsed.ok) return parsed;
	const entry = lessonSequence.find((candidate) => candidate.id === parsed.id);
	if (!entry) {
		return { ok: false, error: `${key}: no lesson is declared with this id` };
	}
	return { ok: true, entry };
}

/**
 * The lessons phase 3 produced, by stable id — the six middle-band lessons
 * and the three concepts promoted from asides.
 *
 * Declared here rather than in either content task because tasks 3.2 and 3.3
 * ran concurrently on disjoint files: if each placed its own lessons, neither
 * would see the other's ordering and the scheduler could not catch the
 * collision.
 */
export const PHASE_THREE_LESSON_IDS: readonly string[] = Object.freeze([
	"lesson-06",
	"lesson-07",
	"lesson-08",
	"lesson-09",
	"lesson-10",
	"lesson-11",
	"lesson-unwritten-vowels",
	"lesson-clusters",
	"lesson-leading-consonants",
]);

export interface SlotReconciliation {
	/** Declared in the sequence, with no content authored for it yet. */
	readonly unfilled: readonly string[];
	/** Content exists, but no slot in the sequence declares it. */
	readonly orphaned: readonly string[];
	/** Declared and filled — one lesson, one slot. */
	readonly filled: readonly string[];
}

/**
 * Slots and content, reconciled in both directions.
 *
 * Both halves are reported rather than asserted away: during a phase a slot
 * legitimately has no content yet, and a lesson that shipped content without a
 * slot (`lesson-sound-buckets` is one today) is unreachable from any route —
 * a defect that is invisible unless something counts it.
 */
export function reconcileLessonSlots(
	contentLessonIds: readonly string[],
): SlotReconciliation {
	const declared = new Set(lessonSequence.map((entry) => entry.id));
	const content = new Set(contentLessonIds);
	return {
		unfilled: lessonSequence
			.map((entry) => entry.id)
			.filter((id) => !content.has(id)),
		orphaned: [...content].filter((id) => !declared.has(id)).sort(),
		filled: lessonSequence
			.map((entry) => entry.id)
			.filter((id) => content.has(id)),
	};
}

/** Lookup by the integer the `symbols.ts` tables still use. */
export function lessonEntryByNumber(
	legacyNumber: number,
): LessonSequenceEntry | undefined {
	return lessonSequence.find((entry) => entry.legacyNumber === legacyNumber);
}

/**
 * Lookup by 1-based position — the space persisted state and routes live in.
 *
 * Distinct from {@link lessonEntryByNumber} on purpose: position and legacy
 * number were the same integer until task 4.3's resequence, so a caller
 * holding a position could reach for the legacy lookup and be silently
 * right. They now diverge from position 15 on, and the two lookups exist so
 * the call site names which space its integer is in.
 */
export function lessonEntryByPosition(
	position: number,
): LessonSequenceEntry | undefined {
	return lessonSequence[position - 1];
}
