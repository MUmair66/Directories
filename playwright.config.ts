import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. Run against a deployment backed by a Neon preview branch:
 *   PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app npm run test:e2e
 * Without PLAYWRIGHT_BASE_URL a local production server is started (needs .env.local).
 *
 * The suite reads and writes the same Neon preview branch (E2E_DATABASE_URL) to mark emails verified
 * and to set known verification-code hashes. Turnstile should use Cloudflare's always-pass test keys.
 * See tests/e2e/helpers.ts.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, dependencies: ["setup"], testMatch: /(review|message|register)\.spec\.ts/ },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run build && npm run start", url: baseURL, timeout: 300_000, reuseExistingServer: true },
});
