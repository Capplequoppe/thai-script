export type ValidationResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: string };

function describeType(value: unknown): string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (Array.isArray(value)) return "an array";
	return `a ${typeof value}`;
}

/**
 * Structural validation of a persisted learner state, with the reason a state
 * is refused. Reasons name the offending site and the expected shape but never
 * echo a non-numeric value — a rejected blob is by definition attacker-shaped,
 * and the reason ends up in logs and error reports.
 *
 * Lesson references (`completedLessons`, `currentLesson`, each script card's
 * `lessonNumber`, each pending catch-up's `lessonNumber`) must be numbers.
 * A state where only some of those sites still carry numbers — e.g. a
 * hand-edited blob holding strings in `completedLessons` while its cards keep
 * numeric `lessonNumber`s — is exactly the half-converted state CONTEXT.md
 * warns about, and it is reported here rather than half-accepted.
 */
export function validateLearnerStateDetailed(data: unknown): ValidationResult {
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return {
			ok: false,
			reason: `state: expected an object, got ${describeType(data)}`,
		};
	}
	const obj = data as Record<string, unknown>;

	if (!Array.isArray(obj.completedLessons)) {
		return {
			ok: false,
			reason: `completedLessons: expected an array, got ${describeType(obj.completedLessons)}`,
		};
	}
	for (let i = 0; i < obj.completedLessons.length; i++) {
		const entry: unknown = obj.completedLessons[i];
		if (typeof entry !== "number" || !Number.isFinite(entry)) {
			return {
				ok: false,
				reason: `completedLessons[${i}]: expected a lesson number, got ${describeType(entry)}`,
			};
		}
	}

	if (
		obj.currentLesson !== undefined &&
		obj.currentLesson !== null &&
		(typeof obj.currentLesson !== "number" ||
			!Number.isFinite(obj.currentLesson))
	) {
		return {
			ok: false,
			reason: `currentLesson: expected a lesson number or null, got ${describeType(obj.currentLesson)}`,
		};
	}

	if (
		typeof obj.cards !== "object" ||
		obj.cards === null ||
		Array.isArray(obj.cards)
	) {
		return {
			ok: false,
			reason: `cards: expected an object, got ${describeType(obj.cards)}`,
		};
	}
	for (const [id, card] of Object.entries(
		obj.cards as Record<string, unknown>,
	)) {
		if (card === null || typeof card !== "object") {
			return {
				ok: false,
				reason: `cards[${JSON.stringify(id)}]: expected an object, got ${describeType(card)}`,
			};
		}
		const lessonNumber = (card as Record<string, unknown>).lessonNumber;
		if (typeof lessonNumber !== "number" || !Number.isFinite(lessonNumber)) {
			return {
				ok: false,
				reason: `cards[${JSON.stringify(id)}].lessonNumber: expected a lesson number, got ${describeType(lessonNumber)}`,
			};
		}
	}

	if (obj.pendingCatchUps !== undefined) {
		if (!Array.isArray(obj.pendingCatchUps)) {
			return {
				ok: false,
				reason: `pendingCatchUps: expected an array, got ${describeType(obj.pendingCatchUps)}`,
			};
		}
		for (let i = 0; i < obj.pendingCatchUps.length; i++) {
			const entry: unknown = obj.pendingCatchUps[i];
			if (entry === null || typeof entry !== "object") {
				return {
					ok: false,
					reason: `pendingCatchUps[${i}]: expected an object, got ${describeType(entry)}`,
				};
			}
			const lessonNumber = (entry as Record<string, unknown>).lessonNumber;
			if (typeof lessonNumber !== "number" || !Number.isFinite(lessonNumber)) {
				return {
					ok: false,
					reason: `pendingCatchUps[${i}].lessonNumber: expected a lesson number, got ${describeType(lessonNumber)}`,
				};
			}
		}
	}

	if (!Array.isArray(obj.sessionHistory)) {
		return {
			ok: false,
			reason: `sessionHistory: expected an array, got ${describeType(obj.sessionHistory)}`,
		};
	}

	return { ok: true };
}

/** Boolean convenience over {@link validateLearnerStateDetailed} for callers that only branch. */
export function validateLearnerState(data: unknown): boolean {
	return validateLearnerStateDetailed(data).ok;
}
