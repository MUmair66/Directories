import { test as setup, expect } from "@playwright/test";

/** Smoke check: the deployment is up and the preview branch is seeded. */
setup("deployment is reachable and seeded", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: /find a business/i })).toBeVisible();
});
