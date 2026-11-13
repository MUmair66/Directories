import { test, expect } from "@playwright/test";
import { anyPublicBusiness, expectToast, signUpAndLogin, sql } from "./helpers";

test("send a message from a business profile creates a lead", async ({ page }) => {
  const biz = await anyPublicBusiness();
  await page.goto(`/biz/${biz.slug}`);
  await page.getByRole("button", { name: /send message/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/name/i).fill("E2E Visitor");
  await dialog.getByLabel(/email/i).fill("visitor@example.com");
  await dialog.getByLabel(/message/i).fill("Hi, do you have availability next week for a repair?");
  await dialog.getByRole("button", { name: /send/i }).click();
  await expectToast(page, /message sent/i);
  const rows = (await sql()`select count(*)::int as n from leads where business_id = ${biz.id} and email = 'visitor@example.com'`) as { n: number }[];
  expect(rows[0]!.n).toBeGreaterThan(0);
});

test("write a review (login required, one per business)", async ({ page }) => {
  const biz = await anyPublicBusiness();
  await page.goto(`/biz/${biz.slug}`);
  await signUpAndLogin(page, "reviewer");
  await page.goto(`/biz/${biz.slug}#reviews`);
  await page.getByRole("button", { name: /write a review/i }).click();
  await page.getByRole("radio", { name: /4 stars?/i }).click();
  await page.getByLabel(/your review|review/i).fill("Quick response, clear pricing and the work was done right the first time.");
  await page.getByRole("button", { name: /submit|post review/i }).click();
  await expectToast(page, /review is live|thanks/i);

  // Second attempt is rejected
  await page.reload();
  await page.getByRole("button", { name: /write a review/i }).click();
  await page.getByRole("radio", { name: /5 stars?/i }).click();
  await page.getByLabel(/your review|review/i).fill("Trying to post a second review for the same business here.");
  await page.getByRole("button", { name: /submit|post review/i }).click();
  await expectToast(page, /already reviewed/i);
});

test("claim a business with a document", async ({ page }) => {
  const biz = await anyPublicBusiness();
  await signUpAndLogin(page, "claimer");
  await page.goto(`/biz/${biz.slug}/claim`);
  await page.getByLabel(/your name/i).fill("Pat Owner");
  await page.getByLabel(/^email/i).fill("pat@example.com");
  await page.getByLabel(/phone/i).fill("3125550199");
  await page.getByLabel(/details/i).fill("I am the owner; license attached.");
  await page.getByLabel(/document/i).setInputFiles({ name: "license.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });
  await page.getByRole("button", { name: /submit claim/i }).click();
  await expect(page.getByText(/claim (was )?submitted|under review/i).first()).toBeVisible();
  const rows = (await sql()`select status from claims where business_id = ${biz.id} order by created_at desc limit 1`) as { status: string }[];
  expect(rows[0]?.status).toBe("pending");
});
