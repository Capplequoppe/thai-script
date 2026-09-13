import { readFileSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext, Browser } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { firstGrammarIds, seedLearnedVocabulary } from "./fixtures/seedLearner";

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
const BANK_JSON = path.resolve(
	process.cwd(),
	"backend/data/conversationStarters.json",
);
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

interface BankEntry {
	tier: number;
	thai: string;
	words: string[];
}

function bankEntries(): BankEntry[] {
	return JSON.parse(readFileSync(BANK_JSON, "utf8")) as BankEntry[];
}

/**
 * One learner's whole opening exchange: seed their progress, open
 * `/conversation`, and read back the question the real backend picked from
 * the real bank for them.
 */
async function askOpeningQuestion(
	browser: Browser,
	learnedWordCount: number,
): Promise<{ knownWords: string[]; questionText: string }> {
	const context = await browser.newContext({
		baseURL: test.info().project.use.baseURL,
	});
	try {
		const page = await context.newPage();
		// Phase 3's gate (task 3.2) requires both a vocab AND a grammar count —
		// every fixture reaching `/conversation` needs both now, not just the
		// vocab count this helper originally seeded.
		const knownWords = await seedLearnedVocabulary(
			page,
			learnedWordCount,
			7,
			firstGrammarIds(5),
		);
		await page.goto("/thai-script/#/conversation");
		const question = page.locator('p[lang="th"]');
		await expect(question).toBeVisible({ timeout: 60_000 });
		return { knownWords, questionText: (await question.innerText()).trim() };
	} finally {
		await context.close();
	}
}

test.describe("conversation practice — real backend, acceptable reply", () => {
	test.beforeAll(async ({ request }) => {
		await waitForBackendReady(request);
	});

	test("a fake-mic pass reply drives a real pass verdict (AC2)", async ({
		page,
	}) => {
		// Seeded rather than run against an empty profile: the question is
		// now drawn from the bank by what this learner knows, and the
		// fake-mic fixture answers a "how are you" opener — which is what a
		// 220-word learner is asked. (Phase 1 could hardcode the question;
		// from here on the content is personalized, so the fixture and the
		// seeded learner have to belong together.)
		await seedLearnedVocabulary(page, 220, 7, firstGrammarIds(5));
		await page.goto("/thai-script/#/conversation");
		const question = page.locator('p[lang="th"]');
		await expect(question).toBeVisible({ timeout: 30_000 });
		expect((await question.innerText()).trim().length).toBeGreaterThan(0);

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
		// Seeded above the phase-3 gate first: an unseeded learner would see
		// the locked page before ever attempting a backend call, which would
		// make this assertion pass for the wrong reason.
		await seedLearnedVocabulary(page, 220, 7, firstGrammarIds(5));
		// No process is stopped and the backend address setting is left at
		// its default (localhost:8000) — this produces exactly the `fetch`
		// rejection the adapter's `unavailable` path is already built to
		// handle.
		await page.route("**/localhost:8000/**", (route) =>
			route.abort("connectionrefused"),
		);
		await page.goto("/thai-script/#/conversation");
		await expect(page.getByRole("alert")).toContainText("isn't answering", {
			timeout: 15_000,
		});
	});
});

// AC5: a person actually listens to the opening question's synthesized audio
// and confirms it's audible, intelligible Thai in the cloned voice. No
// automated test can judge audio quality — see this task's manual
// verification note.

// The seeding helper itself, proven on its own before anything below leans
// on it: a silently-wrong localStorage DTO shape would otherwise produce an
// empty learner that still passes every assertion about "two different
// questions" for entirely the wrong reason. Deliberately outside the
// backend-dependent describe below — what the app makes of seeded progress
// is not a question about the conversation backend.
test.describe("seeded learner state", () => {
	test("seedLearnedVocabulary produces a learner the app really sees", async ({
		page,
	}) => {
		const knownWords = await seedLearnedVocabulary(page, 150);
		expect(knownWords).toHaveLength(150);

		await page.goto("/thai-script/#/");

		// One due vocabulary card per seeded word, counted by the app's own
		// SRS state — not by reading back what the helper just wrote.
		await expect(page.getByRole("button", { name: "Vocab (150)" })).toBeVisible(
			{ timeout: 30_000 },
		);
	});
});

test.describe("conversation practice — a real multi-turn session (task 3.3 AC5)", () => {
	test.beforeAll(async ({ request }) => {
		await waitForBackendReady(request);
	});

	test("completes three real turns end to end against the real backend and bank, with a summary naming the total", async ({
		page,
	}) => {
		// This spec's own locked-path proof was retired (task 3.2 owns it
		// now, in e2e/conversation-gate.spec.ts) — this test only proves the
		// multi-turn session mechanic for an already-unlocked learner.
		//
		// gapEvery=15, not the default 7: checked directly against the real
		// shipped bank, a 1-in-7 gappy set only ever qualifies for 2 of tier
		// 5's 8 entries at ANY word count up to 600 (common short-sentence
		// function words keep landing on a gap position) — a real, if
		// narrow, edge in task 2.2/2.3's entry-level containment design,
		// not a bug in this test. A wider gap avoids it and reaches all 8
		// qualifying entries, giving headroom for three non-repeating turns.
		await seedLearnedVocabulary(page, 250, 15, firstGrammarIds(5));
		await page.goto("/thai-script/#/conversation");

		for (let turn = 1; turn <= 3; turn++) {
			const question = page.locator('p[lang="th"]');
			await expect(question).toBeVisible({ timeout: 60_000 });
			const questionText = (await question.innerText()).trim();
			expect(questionText.length).toBeGreaterThan(0);

			await page.getByRole("button", { name: "Record your reply" }).click();
			await page.waitForTimeout(3_000);
			await page.getByRole("button", { name: "Stop recording" }).click();

			// Transcript non-empty BEFORE the verdict, same discipline AC2
			// established — a capture-timing miss must report as "nothing
			// was heard", never as a false verdict.
			await expect(page.getByText("We heard:")).toBeVisible({
				timeout: 30_000,
			});
			const transcript = await page.locator('span[lang="th"]').textContent();
			expect(transcript?.trim().length ?? 0).toBeGreaterThan(0);

			if (turn < 3) {
				// AC1: automatically advances to a genuinely different
				// question, with no manual step and no full page reload.
				await page.waitForFunction(
					(prevText) =>
						document.querySelector('p[lang="th"]')?.textContent?.trim() !==
						prevText,
					questionText,
					{ timeout: 60_000 },
				);
			}
		}

		// Real judge verdicts vary by question and reply content, so this
		// proves the mechanic (three real record -> judge -> next cycles,
		// tallied correctly) rather than a specific pass count — the tally
		// names all three components (AC1) and totals exactly 3 asked.
		await expect(page.getByText(/\d+ passed \/ 3 asked/)).toBeVisible({
			timeout: 30_000,
		});
	});
});

test.describe("conversation practice — personalized by known vocabulary (AC4)", () => {
	test.beforeAll(async ({ request }) => {
		await waitForBackendReady(request);
	});

	test("two learners with different vocabulary get different questions", async ({
		browser,
	}) => {
		// 220 and 250, not 150 and 400: task 3.2's gate requires
		// >= MIN_VOCAB_COUNT (200) words before /conversation is reachable at
		// all, ruling out 150. Selection is entry-level containment with a
		// hash-based tie-break among qualifying entries (task 2.3), which is
		// not monotonic in word count — a larger gappy word set does not
		// always unlock a different entry (220 and 400 land on the same one
		// against the real shipped bank). 220 and 250 are confirmed, against
		// that same real bank, to select two different entries.
		const beginner = await askOpeningQuestion(browser, 220);
		const advanced = await askOpeningQuestion(browser, 250);

		expect(beginner.questionText).not.toEqual(advanced.questionText);

		// And each question is one that learner could actually understand:
		// every word in it is a word they know.
		const entries = bankEntries();
		for (const learner of [beginner, advanced]) {
			const entry = entries.find((e) => e.thai === learner.questionText);
			expect(
				entry,
				`"${learner.questionText}" is not an entry in the shipped bank`,
			).toBeDefined();
			const known = new Set(learner.knownWords);
			expect(
				(entry as BankEntry).words.filter((word) => !known.has(word)),
			).toEqual([]);
		}
	});
});
