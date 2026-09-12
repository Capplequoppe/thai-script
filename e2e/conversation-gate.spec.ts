import { expect, test } from "@playwright/test";
import { firstGrammarIds, seedLearnedVocabulary } from "./fixtures/seedLearner";

/**
 * Task 3.2's own end-to-end proof for the conversation-practice unlock
 * gate — independent of task 3.3's multi-turn session proof (see this
 * phase's README: a gating regression must fail here without needing a
 * real multi-turn session to even start).
 *
 * Needs no real model inference and never waits on `/health`: every request
 * to the conversation backend is intercepted and aborted up front, so this
 * spec proves the *gate*, not a judged exchange (that's task 3.3's job) —
 * and, for the locked path, proves the strongest available thing: that no
 * such request is ever attempted at all.
 */

const CONVERSATION_API_PATTERN = "**/localhost:8000/**";

test.describe("conversation practice — the unlock gate (task 3.2)", () => {
	test("a below-threshold learner sees the locked explanation and the page never calls the backend", async ({
		page,
	}) => {
		let backendCallCount = 0;
		await page.route(CONVERSATION_API_PATTERN, (route) => {
			backendCallCount += 1;
			return route.abort("connectionrefused");
		});

		// Well below both MIN_VOCAB_COUNT (200) and MIN_GRAMMAR_POINTS (5) —
		// no grammar seeded at all.
		await seedLearnedVocabulary(page, 10);
		await page.goto("/thai-script/#/conversation");

		await expect(page.getByRole("alert")).toContainText(
			/unlocks once you know/i,
			{ timeout: 15_000 },
		);
		await expect(
			page.getByRole("button", { name: /record your reply/i }),
		).toHaveCount(0);
		expect(backendCallCount).toBe(0);
	});

	test("an above-threshold learner sees the unlocked Dashboard tile and can navigate through it", async ({
		page,
	}) => {
		// Aborted here too: this case proves navigation reaches the real,
		// unlocked page — not a full judged exchange.
		await page.route(CONVERSATION_API_PATTERN, (route) =>
			route.abort("connectionrefused"),
		);

		await seedLearnedVocabulary(page, 220, 7, firstGrammarIds(5));
		await page.goto("/thai-script/#/");

		const tile = page.getByText("Conversation Practice");
		await expect(tile).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Start a session")).toBeVisible();

		await tile.click();

		await expect(page).toHaveURL(/#\/conversation$/);
		// Reached the real page past the gate — never the locked explanation.
		await expect(page.getByText(/unlocks once you know/i)).toHaveCount(0);
	});
});
