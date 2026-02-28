import { test, expect } from "@playwright/test";

test.describe("Lesson 1 intro flow", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ page }) => {
		await page.goto("/thai-script/");
	});

	test("clicking Next Lesson opens the lesson with a watchable video", async ({
		page,
	}) => {
		await page.getByText("Next Lesson").click();

		// Should land on the lesson intro (video slide)
		const video = page.locator("video");
		await expect(video).toBeVisible();
		await expect(video).toHaveAttribute("controls", "");
	});

	test("Next button is visible below the video without scrolling", async ({
		page,
	}) => {
		await page.getByText("Next Lesson").click();

		await expect(page.locator("video")).toBeVisible();

		const nextButton = page.getByRole("button", { name: "Next" });
		await expect(nextButton).toBeInViewport();
		// Button must have a real background — not transparent (which would make
		// white text invisible against the cream page background)
		await expect(nextButton).not.toHaveCSS(
			"background-color",
			"rgba(0, 0, 0, 0)",
		);
	});

	test("clicking Next on the video slide shows maaw maa", async ({ page }) => {
		await page.getByText("Next Lesson").click();

		await expect(page.locator("video")).toBeVisible();

		await page.getByRole("button", { name: "Next" }).click();

		// ConsonantCard for ม (maaw maa)
		await expect(
			page.getByRole("heading", { name: "maaw maa" }),
		).toBeVisible();
		await expect(page.getByText("ม", { exact: true }).first()).toBeVisible();
		await expect(page.getByText("ม ม้า")).toBeVisible();
	});
});
