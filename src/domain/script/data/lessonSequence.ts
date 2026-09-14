/**
 * The declared lesson sequence: the one place lesson identity and lesson
 * ordering are written down.
 *
 * Today a lesson is identified by an integer that is simultaneously its
 * position, its persisted join key (five stores key on it) and its filename.
 * That conflation is what makes resequencing hazardous. This module splits it
 * apart *additively*: a stable `id` per lesson, ordering carried by array
 * order, and `legacyNumber` still holding the integer every persisted store
 * uses today. Nothing persisted changes here — task 1.1b converts the stores.
 *
 * Ordering is read from `lessonSequence` and from nowhere else. In particular
 * the lesson *count* is derived from it (`lessonCount`), never written as a
 * literal: the five `25`s scattered through the app are what a resequence
 * breaks, and they are converted to read this.
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
	 * The integer the five persisted stores key on today (CONTEXT.md Rule 1).
	 * Still authoritative until task 1.1b migrates them onto `id`.
	 */
	readonly legacyNumber: number;
}

/** Declaration order is the course order. Positions are assigned from it. */
const DECLARED: readonly Omit<LessonSequenceEntry, "position">[] = [
	{ id: "lesson-01", legacyNumber: 1 },
	{ id: "lesson-02", legacyNumber: 2 },
	{ id: "lesson-03", legacyNumber: 3 },
	{ id: "lesson-04", legacyNumber: 4 },
	{ id: "lesson-05", legacyNumber: 5 },
	{ id: "lesson-06", legacyNumber: 6 },
	{ id: "lesson-07", legacyNumber: 7 },
	{ id: "lesson-08", legacyNumber: 8 },
	{ id: "lesson-09", legacyNumber: 9 },
	{ id: "lesson-10", legacyNumber: 10 },
	{ id: "lesson-11", legacyNumber: 11 },
	{ id: "lesson-12", legacyNumber: 12 },
	{ id: "lesson-13", legacyNumber: 13 },
	{ id: "lesson-14", legacyNumber: 14 },
	{ id: "lesson-15", legacyNumber: 15 },
	{ id: "lesson-16", legacyNumber: 16 },
	{ id: "lesson-17", legacyNumber: 17 },
	{ id: "lesson-18", legacyNumber: 18 },
	{ id: "lesson-19", legacyNumber: 19 },
	{ id: "lesson-20", legacyNumber: 20 },
	{ id: "lesson-21", legacyNumber: 21 },
	{ id: "lesson-22", legacyNumber: 22 },
	{ id: "lesson-23", legacyNumber: 23 },
	{ id: "lesson-24", legacyNumber: 24 },
	{ id: "lesson-25", legacyNumber: 25 },
	// Phase 3 — the three concepts the source course taught as asides. Their
	// slots are declared here before their content exists so that tasks 3.2 and
	// 3.3 fill a slot rather than each inventing an ordering (see
	// `PHASE_THREE_LESSON_IDS`).
	{ id: "lesson-unwritten-vowels", legacyNumber: 26 },
	{ id: "lesson-clusters", legacyNumber: 27 },
	{ id: "lesson-leading-consonants", legacyNumber: 28 },
	// Task 4.2 — the consolidated tone-mark lesson. Appended for the same
	// reason as the phase 3 trio above: its position is its persisted identity
	// (CONTEXT.md Rule 1), so it takes the next open slot rather than the
	// position a finished course would put it at. Every spelling-based tone
	// rule (lessons 2-16) already precedes it. It introduces no symbol of its
	// own yet — the four `ThaiToneMark` entries and `toneMarkRules` still carry
	// their pre-migration `.lesson` values (17/18/21-24); moving them onto this
	// slot is task 4.3's resequencing, not this one's.
	{ id: "lesson-tone-marks", legacyNumber: 29 },
];

export const lessonSequence: readonly LessonSequenceEntry[] = Object.freeze(
	DECLARED.map((entry, index) =>
		Object.freeze({ ...entry, position: index + 1 }),
	),
);

/**
 * The number of lessons in the course, derived. Consumers that currently hold
 * a literal (`ScriptLessonService.TOTAL_LESSONS`, `AchievementService`,
 * `ProgressPage`, `AchievementBadge`, `LessonPath`) read this instead.
 */
export const lessonCount = lessonSequence.length;

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
 * The lessons phase 3 produces, by stable id — the six middle-band lessons
 * that already had slots and the three concepts promoted from asides.
 *
 * Declared here rather than in either content task because tasks 3.2 and 3.3
 * run concurrently on disjoint files: if each placed its own lessons, neither
 * would see the other's ordering and the scheduler could not catch the
 * collision.
 *
 * The three promoted lessons are **appended**, not inserted at the place a
 * finished course would put them. A lesson's persisted identity is its
 * `position` (CONTEXT.md rule 1 — five stores key on it), so inserting in the
 * middle renumbers every later lesson and silently rewrites what the learner
 * has completed. Appending keeps the legacy→position mapping the identity it
 * is today; phase 4 owns the resequence and the persisted epoch that has to
 * come with it.
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
 * Both halves are reported rather than asserted away: during the phase a slot
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

/** Lookup by the integer the persisted stores still use. */
export function lessonEntryByNumber(
	legacyNumber: number,
): LessonSequenceEntry | undefined {
	return lessonSequence.find((entry) => entry.legacyNumber === legacyNumber);
}
