export function validateLearnerState(data: unknown): boolean {
	if (data === null || typeof data !== "object") return false;
	const obj = data as Record<string, unknown>;

	if (!Array.isArray(obj.completedLessons)) return false;
	if (
		typeof obj.cards !== "object" ||
		obj.cards === null ||
		Array.isArray(obj.cards)
	)
		return false;
	if (!Array.isArray(obj.sessionHistory)) return false;

	return true;
}
