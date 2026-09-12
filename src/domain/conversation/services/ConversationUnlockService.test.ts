import { describe, expect, it } from "vitest";
import {
	checkConversationUnlock,
	MIN_GRAMMAR_POINTS,
	MIN_VOCAB_COUNT,
} from "./ConversationUnlockService";

describe("checkConversationUnlock", () => {
	it("locks when vocab is below threshold, regardless of grammar progress", () => {
		const status = checkConversationUnlock(
			MIN_VOCAB_COUNT - 1,
			MIN_GRAMMAR_POINTS + 10,
		);

		expect(status.unlocked).toBe(false);
		expect(status.vocabNeeded).toBe(1);
	});

	it("locks when grammar is below threshold, regardless of vocab progress", () => {
		const status = checkConversationUnlock(
			MIN_VOCAB_COUNT + 500,
			MIN_GRAMMAR_POINTS - 1,
		);

		expect(status.unlocked).toBe(false);
		expect(status.grammarNeeded).toBe(1);
	});

	it("unlocks once both thresholds are met", () => {
		const status = checkConversationUnlock(
			MIN_VOCAB_COUNT + 50,
			MIN_GRAMMAR_POINTS + 2,
		);

		expect(status.unlocked).toBe(true);
		expect(status.vocabNeeded).toBe(0);
		expect(status.grammarNeeded).toBe(0);
	});

	it("unlocks at exactly the boundary — inclusive, not strictly greater", () => {
		const status = checkConversationUnlock(MIN_VOCAB_COUNT, MIN_GRAMMAR_POINTS);

		expect(status.unlocked).toBe(true);
		expect(status.vocabNeeded).toBe(0);
		expect(status.grammarNeeded).toBe(0);
	});

	it("locks at zero counts, naming the full gap to each threshold", () => {
		const status = checkConversationUnlock(0, 0);

		expect(status.unlocked).toBe(false);
		expect(status.vocabNeeded).toBe(MIN_VOCAB_COUNT);
		expect(status.grammarNeeded).toBe(MIN_GRAMMAR_POINTS);
	});
});
