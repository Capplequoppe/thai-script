import { expect, type Page, test } from "@playwright/test";

/**
 * Lesson 1 now serves the in-house deck (task 1.4 wired `lesson-01` into
 * `DECK_LESSON_IDS`), not the licensed `.webm` this suite asserted against
 * before this plan. No `<video>` element renders for it any more; the first
 * thing a learner sees is the deck's opening exposition slide, and the
 * symbol cards that follow are unchanged.
 *
 * Advances through the deck one slide at a time: an exposition or retrieval
 * slide has one "Next"/"Continue" button; a reveal slide additionally has a
 * "Show Answer" button that must be clicked first, so this drives whichever
 * of the two is presently on screen. It stops as soon as `stopWhenVisible`
 * appears rather than clicking a fixed number of times — the symbol cards
 * that follow the deck also carry a "Next" button, so a click budget with no
 * stop condition would sail straight through them.
 */
async function clickThroughDeckUntil(
	page: Page,
	stopWhenVisible: ReturnType<Page["getByRole"]>,
): Promise<void> {
	const button = page.getByRole("button", {
		name: /^Next$|^Continue$|^Show Answer$/,
	});
	// Bounded well above lesson-01's own slide count so a stall (neither the
	// stop condition nor the button ever appearing) still fails the test
	// instead of looping forever.
	for (let i = 0; i < 40; i++) {
		if (await stopWhenVisible.isVisible()) return;
		if ((await button.count()) === 0) {
			throw new Error("ran out of Next/Continue/Show Answer buttons");
		}
		await button.first().click();
	}
	throw new Error(
		"deck did not reach the expected slide within the click budget",
	);
}

test.describe("Lesson 1 intro flow", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ page }) => {
		await page.goto("/thai-script/");
	});

	test("clicking Next Lesson opens the lesson with the in-house deck, no video", async ({
		page,
	}) => {
		await page.getByText("Next Lesson").click();

		// The deck's opening exposition slide, not a video element.
		await expect(page.locator("video")).toHaveCount(0);
		await expect(page.getByText("Two letters, one shared shape")).toBeVisible();
	});

	test("Next button is visible below the deck content without scrolling", async ({
		page,
	}) => {
		await page.getByText("Next Lesson").click();

		await expect(page.getByText("Two letters, one shared shape")).toBeVisible();

		const nextButton = page.getByRole("button", { name: "Next" });
		await expect(nextButton).toBeInViewport();
		// Button must have a real background — not transparent (which would make
		// white text invisible against the cream page background)
		await expect(nextButton).not.toHaveCSS(
			"background-color",
			"rgba(0, 0, 0, 0)",
		);
	});

	test("completing the deck reaches the symbol cards, starting with maaw maa", async ({
		page,
	}) => {
		await page.getByText("Next Lesson").click();

		await expect(page.getByText("Two letters, one shared shape")).toBeVisible();

		// ConsonantCard for ม (maaw maa) — the deck's own last slide fires
		// `onComplete`, handing off to the same symbol cards the video arm
		// used, unchanged by this task.
		const maawMaaHeading = page.getByRole("heading", { name: "maaw maa" });
		await clickThroughDeckUntil(page, maawMaaHeading);

		await expect(maawMaaHeading).toBeVisible();
		await expect(page.getByText("ม", { exact: true }).first()).toBeVisible();
		await expect(page.getByText("ม ม้า")).toBeVisible();
	});
});
