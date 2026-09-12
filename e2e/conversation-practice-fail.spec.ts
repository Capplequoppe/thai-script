import path from "node:path";
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { firstGrammarIds, seedLearnedVocabulary } from "./fixtures/seedLearner";

/**
 * AC3's off-topic-reply case, split into its own file: Playwright refuses a
 * `launchOptions` override inside a `describe` block ("forces a new worker"
 * — only a file-top-level `test.use()` or the config file are allowed), and
 * this case needs a different `--use-file-for-fake-audio-capture` value than
 * conversation-practice.spec.ts's AC2/AC4 cases. See that file for the
 * shared rationale (padding, project scoping).
 */

test.use({
	launchOptions: {
		args: [
			"--use-fake-device-for-media-stream",
			"--use-fake-ui-for-media-stream",
			`--use-file-for-fake-audio-capture=${path.resolve(
				process.cwd(),
				"backend/tests/fixtures/reply-fail.wav",
			)}`,
		],
	},
});

const HEALTH_URL = "http://localhost:8000/health";
const READY_TIMEOUT_MS = 4 * 60_000;
const READY_POLL_INTERVAL_MS = 2_000;

async function waitForBackendReady(request: APIRequestContext): Promise<void> {
	const deadline = Date.now() + READY_TIMEOUT_MS;
	let lastLoaded: Record<string, boolean> | null = null;
	while (Date.now() < deadline) {
		try {
			const res = await request.get(HEALTH_URL);
			if (res.ok()) {
				const body = (await res.json()) as {
					models_loaded: Record<string, boolean>;
				};
				lastLoaded = body.models_loaded;
				if (Object.values(lastLoaded).every(Boolean)) return;
			}
		} catch {
			// Backend not accepting connections yet — keep polling.
		}
		await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
	}
	const stalled = lastLoaded
		? Object.entries(lastLoaded)
				.filter(([, ready]) => !ready)
				.map(([name]) => name)
		: ["whisper", "judge", "tts"];
	throw new Error(
		`Backend did not become ready within ${READY_TIMEOUT_MS}ms — ` +
			`stalled model(s): ${stalled.join(", ") || "unknown (no /health response yet)"}`,
	);
}

test.beforeAll(async ({ request }) => {
	await waitForBackendReady(request);
});

test("a fake-mic off-topic reply drives a real fail verdict, visibly distinct from pass (AC3)", async ({
	page,
}) => {
	// Seeded for the same reason as AC2's pass case: the opening question is
	// drawn from the bank by known vocabulary, not a fixed string, so the
	// question locator asserts presence/content rather than an exact Thai
	// string that content changes could invalidate.
	// Phase 3's gate (task 3.2) requires both a vocab AND a grammar count.
	await seedLearnedVocabulary(page, 220, 7, firstGrammarIds(5));
	await page.goto("/thai-script/#/conversation");
	const question = page.locator('p[lang="th"]');
	await expect(question).toBeVisible({ timeout: 30_000 });
	expect((await question.innerText()).trim().length).toBeGreaterThan(0);

	await page.getByRole("button", { name: "Record your reply" }).click();
	await page.waitForTimeout(3_000);
	await page.getByRole("button", { name: "Stop recording" }).click();

	await expect(page.getByText("We heard:")).toBeVisible({ timeout: 30_000 });
	const transcript = await page.locator('span[lang="th"]').textContent();
	expect(transcript?.trim().length ?? 0).toBeGreaterThan(0);

	await expect(page.getByText("Not quite")).toBeVisible({ timeout: 60_000 });
});
