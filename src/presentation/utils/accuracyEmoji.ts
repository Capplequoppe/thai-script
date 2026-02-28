import type { Accuracy } from "../../domain/srs/value-objects/Accuracy";

export function accuracyEmoji(accuracy: Accuracy): string {
	if (accuracy.percentage >= 80) return "\uD83C\uDF89";
	if (accuracy.percentage >= 50) return "\uD83D\uDCAA";
	return "\uD83D\uDCDA";
}
