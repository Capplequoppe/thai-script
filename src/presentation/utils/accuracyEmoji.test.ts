import { describe, expect, it } from "vitest";
import { Accuracy } from "../../domain/srs/value-objects/Accuracy";
import { accuracyEmoji } from "./accuracyEmoji";

describe("accuracyEmoji", () => {
	it("returns party emoji for >= 80%", () => {
		expect(accuracyEmoji(Accuracy.fromCounts(80, 100))).toBe("\uD83C\uDF89");
		expect(accuracyEmoji(Accuracy.fromCounts(10, 10))).toBe("\uD83C\uDF89");
	});

	it("returns muscle emoji for >= 50% and < 80%", () => {
		expect(accuracyEmoji(Accuracy.fromCounts(50, 100))).toBe("\uD83D\uDCAA");
		expect(accuracyEmoji(Accuracy.fromCounts(79, 100))).toBe("\uD83D\uDCAA");
	});

	it("returns book emoji for < 50%", () => {
		expect(accuracyEmoji(Accuracy.fromCounts(49, 100))).toBe("\uD83D\uDCDA");
		expect(accuracyEmoji(Accuracy.fromCounts(0, 0))).toBe("\uD83D\uDCDA");
	});

	it("handles boundary at 80 exactly", () => {
		expect(accuracyEmoji(Accuracy.fromCounts(80, 100))).toBe("\uD83C\uDF89");
		expect(accuracyEmoji(Accuracy.fromCounts(79, 100))).toBe("\uD83D\uDCAA");
	});

	it("handles boundary at 50 exactly", () => {
		expect(accuracyEmoji(Accuracy.fromCounts(50, 100))).toBe("\uD83D\uDCAA");
		expect(accuracyEmoji(Accuracy.fromCounts(49, 100))).toBe("\uD83D\uDCDA");
	});
});
