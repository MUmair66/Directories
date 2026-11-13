import { expect, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

/**
 * E2E helpers. Tests talk to the same Neon preview branch as the deployment under test
 * (E2E_DATABASE_URL, falling back to DATABASE_URL) to read verification links/codes and
 * to promote the admin test user. Never point this at production.
 */
const dbUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;

export function sql() {
  if (!dbUrl) throw new Error("Set E2E_DATABASE_URL to the Neon preview branch used by the deployment under test");
  if (/prod|main/i.test(process.env.NEON_BRANCH ?? "")) throw new Error("Refusing to run e2e against the production branch");
  return neon(dbUrl);
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type TestUser = { email: string; password: string; firstName: string; lastName: string };

export function newUser(prefix = "e2e"): TestUser {
  const id = uid();
  return { email: `${prefix}+${id}@example.com`, password: `Pw!${id}Strong9`, firstName: "Test", lastName: `User ${id}` };
}

/** Registers through the UI. Sign-up signs the user in and lands on /dashboard/welcome (no email verification step). */
export async function register(page: Page, user: TestUser) {
  await page.goto("/register");
  await page.getByLabel(/first name/i).fill(user.firstName);
  await page.getByLabel(/last name/i).fill(user.lastName);
  await page.getByLabel(/^email/i).fill(user.email);
  await page.getByLabel(/^password/i).first().fill(user.password);
  const confirm = page.getByLabel(/confirm password/i);
  if (await confirm.count()) await confirm.fill(user.password);
  await page.getByLabel(/accept|agree|terms/i).check();
  await page.getByRole("button", { name: /create account|sign up|register/i }).click();
  await page.waitForURL(/\/dashboard\/welcome/);
}

export async function login(page: Page, user: Pick<TestUser, "email" | "password">) {
  await page.goto("/login");
  await page.getByLabel(/email|username/i).first().fill(user.email);
  await page.getByLabel(/^password/i).fill(user.password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL(/\/(dashboard|$)/);
}

export async function signUpAndLogin(page: Page, prefix?: string) {
  const user = newUser(prefix);
  await register(page, user);
  await login(page, user);
  return user;
}

/** An approved public business to review/message/claim. */
export async function anyPublicBusiness() {
  const rows = (await sql()`select id, slug, name from businesses where status = 'approved' and deleted_at is null and owner_id is null order by created_at limit 1`) as { id: string; slug: string; name: string }[];
  if (!rows[0]) throw new Error("Seed the preview branch first (npm run db:seed)");
  return rows[0];
}

export async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}
