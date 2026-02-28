import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
	await page.goto("/thai-script/");
	await expect(page).toHaveTitle(/Thai/i);
});
