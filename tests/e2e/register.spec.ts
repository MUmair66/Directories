import { test, expect } from "@playwright/test";
import { login, newUser, register } from "./helpers";

test("sign up lands on onboarding signed in, and the account can log in again", async ({ page, context }) => {
  const user = newUser("reg");
  await register(page, user);
  await expect(page.getByText(/add your first business/i).first()).toBeVisible();
  await context.clearCookies();
  await login(page, user);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/add your first business|hello, test/i).first()).toBeVisible();
});

test("register form validates required fields", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: /create account|sign up|register/i }).click();
  await expect(page.getByText(/required|enter/i).first()).toBeVisible();
});
