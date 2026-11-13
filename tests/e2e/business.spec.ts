import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { signUpAndLogin, sql, uid } from "./helpers";

async function next(page: Page) {
  await page.getByRole("button", { name: /save and continue/i }).click();
}

test.describe.serial("owner listing flows", () => {
  let page: Page;
  const name = `E2E Plumbing ${uid()}`;
  let businessId = "";

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await signUpAndLogin(page, "owner");
  });

  test("add business wizard: 6 steps to pending review", async () => {
    const started = Date.now();
    await page.goto("/dashboard/businesses/new");

    // 1. Details
    await page.getByLabel(/business name/i).fill(name);
    await page.getByLabel(/categories/i).fill("Plumbers");
    await page.getByRole("option", { name: /^plumbers$/i }).first().click();
    await expect(page.getByText(/available/i).first()).toBeVisible();
    await page.getByLabel(/description/i).fill("Family-owned plumbing company serving the area with fast, friendly repairs. ".repeat(4));
    await page.getByLabel(/^phone$/i).fill("3125550199");
    await next(page);

    // 2. Location
    await page.getByLabel(/street address/i).fill("100 Main St");
    await page.getByLabel(/^city/i).fill("Chicago");
    await page.getByLabel(/^state/i).selectOption({ label: "Illinois" });
    await page.getByLabel(/zip/i).fill("60601");
    await next(page);

    // 3. Hours
    await page.getByRole("button", { name: /copy monday to all weekdays/i }).click();
    await next(page);

    // 4. Media (optional)
    await next(page);

    // 5. SEO and social
    await page.getByLabel(/meta title/i).fill(`${name} | Chicago Plumber`);
    await next(page);

    // 6. Review and submit
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText(/pending review|submitted/i).first()).toBeVisible();

    const rows = (await sql()`select id, status from businesses where name = ${name}`) as { id: string; status: string }[];
    expect(rows[0]?.status).toBe("pending_review");
    businessId = rows[0]!.id;
    expect(Date.now() - started).toBeLessThan(5 * 60_000);
  });

  test("edit business: description change saves with the sticky save bar", async () => {
    await sql()`update businesses set status = 'approved' where id = ${businessId}`;
    await page.goto(`/dashboard/businesses/${businessId}/edit`);
    await page.getByLabel(/description/i).fill("Updated description for our plumbing company. ".repeat(5));
    await page.getByRole("button", { name: /^save/i }).click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    const rows = (await sql()`select description, status from businesses where id = ${businessId}`) as { description: string; status: string }[];
    expect(rows[0]?.description).toContain("Updated description");
    expect(rows[0]?.status).toBe("approved");
  });

  test("verify listing by SMS code", async () => {
    await page.goto("/dashboard/businesses");
    await page.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: /actions|more/i }).click();
    await page.getByRole("menuitem", { name: /verify/i }).click();
    await page.getByLabel(/sms/i).check();
    await page.getByRole("button", { name: /send code/i }).click();
    // Codes are stored only as SHA-256 hashes; swap in the hash of a known code for the test.
    await expect
      .poll(async () => ((await sql()`select count(*)::int as n from business_verifications where business_id = ${businessId} and status = 'pending'`) as { n: number }[])[0]!.n, { timeout: 15_000 })
      .toBeGreaterThan(0);
    const known = "246810";
    await sql()`update business_verifications set code_hash = ${createHash("sha256").update(known).digest("hex")}
      where business_id = ${businessId} and status = 'pending'`;
    await page.getByLabel(/code/i).fill(known);
    await page.getByRole("button", { name: /^verify/i }).click();
    await expect(page.getByText(/verified/i).first()).toBeVisible();
  });
});
