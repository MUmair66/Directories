import { test, expect } from "@playwright/test";
import { expectToast, signUpAndLogin, sql } from "./helpers";

test("support ticket: create, see it in the list, reply", async ({ page }) => {
  await signUpAndLogin(page, "ticket");
  await page.goto("/dashboard/tickets");
  await page.getByRole("link", { name: /new ticket/i }).click();
  await page.getByLabel(/category/i).selectOption({ label: "Technical" });
  await page.getByLabel(/priority/i).selectOption({ label: "High" });
  await page.getByLabel(/subject/i).fill("Cannot upload gallery photos");
  await page.getByLabel(/message/i).fill("Uploading a 3 MB JPG fails with an error on the media step.");
  await page.getByRole("button", { name: /submit|create ticket/i }).click();
  await expect(page.getByRole("heading", { name: /cannot upload gallery photos/i })).toBeVisible();

  await page.getByLabel(/reply|message/i).last().fill("Adding more detail: it happens on Chrome and Safari.");
  await page.getByRole("button", { name: /send reply|reply/i }).click();
  await expect(page.getByText(/adding more detail/i)).toBeVisible();
});

test("API key: generate shows once, then masked; key authenticates the REST API", async ({ page, request }) => {
  const user = await signUpAndLogin(page, "api");
  await page.goto("/dashboard/api");
  await page.getByRole("button", { name: /generate key/i }).click();
  const keyText = await page.getByTestId("api-key-value").innerText();
  expect(keyText.length).toBeGreaterThan(20);

  const res = await request.get("/api/v1/businesses", { headers: { Authorization: `Bearer ${keyText.trim()}` } });
  expect(res.status()).toBe(200);
  const unauthorized = await request.get("/api/v1/businesses", { headers: { Authorization: "Bearer nope" } });
  expect(unauthorized.status()).toBe(401);

  await page.reload();
  await expect(page.getByText(new RegExp(`•+\\s*${keyText.trim().slice(-4)}`))).toBeVisible();
  const rows = (await sql()`select key_hash, last4 from api_keys k join users u on u.id = k.user_id where u.email = ${user.email}`) as { key_hash: string; last4: string }[];
  expect(rows[0]?.key_hash).not.toContain(keyText.trim());
  expect(rows[0]?.last4).toBe(keyText.trim().slice(-4));

  await page.getByRole("button", { name: /revoke/i }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /revoke/i }).click();
  await expectToast(page, /revoked/i);
});
