import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

/**
 * End-to-end integration proof for the AI conversation practice pipeline —
 * task 1.4. Runs only under the `conversation-practice` Playwright project
 * (`npm run test:e2e -- --project=conversation-practice`), which owns its
 * own real backend process via the conversation-backend-setup/-teardown
 * dependency (see playwright.config.ts) rather than the shared `webServer`
 * array, so the app's existing home/lesson-intro specs never boot a GPU
 * backend.
 *
 * Chromium loops the fake-capture file continuously from stream start
 * (`--use-file-for-fake-audio-capture`), so both fixture WAVs are padded
 * with ~1s of leading/trailing silence — recording for 3s comfortably
 * captures real speech regardless of exact click timing.
 */

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

test.describe("conversation practice — real backend, acceptable reply", () => {
	test.beforeAll(async ({ request }) => {
		await waitForBackendReady(request);
	});

	test("a fake-mic pass reply drives a real pass verdict (AC2)", async ({
		page,
	}) => {
		await page.goto("/thai-script/#/conversation");
		await expect(page.getByText("สบายดีไหม")).toBeVisible({ timeout: 30_000 });

		await page.getByRole("button", { name: "Record your reply" }).click();
		await page.waitForTimeout(3_000);
		await page.getByRole("button", { name: "Stop recording" }).click();

		// Transcript non-empty BEFORE the verdict — a capture-timing miss must
		// report as "nothing was heard", never as a false "the judge said fail".
		await expect(page.getByText("We heard:")).toBeVisible({ timeout: 30_000 });
		const transcript = await page.locator('span[lang="th"]').textContent();
		expect(transcript?.trim().length ?? 0).toBeGreaterThan(0);

		await expect(page.getByText("Good answer")).toBeVisible({
			timeout: 60_000,
		});
	});
});

// The off-topic-reply case (AC3) needs a different
// `--use-file-for-fake-audio-capture` value, which Playwright only allows
// via a file-top-level `test.use()` (a describe-scoped override "forces a
// new worker" and is refused) — see conversation-practice-fail.spec.ts.

test.describe("conversation practice — backend unreachable", () => {
	test("a simulated connection failure renders the not-running state without hanging (AC4)", async ({
		page,
	}) => {
		// No process is stopped and task 1.3's frozen base-URL constant is
		// never repointed — this produces exactly the `fetch` rejection the
		// adapter's `unavailable` path is already built to handle.
		await page.route("**/localhost:8000/**", (route) =>
			route.abort("connectionrefused"),
		);
		await page.goto("/thai-script/#/conversation");
		await expect(page.getByRole("alert")).toContainText("not running", {
			timeout: 15_000,
		});
	});
});

// AC5: a person actually listens to the opening question's synthesized audio
// and confirms it's audible, intelligible Thai in the cloned voice. No
// automated test can judge audio quality — see this task's manual
// verification note.
