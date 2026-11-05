import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for FE-10 (Testing & CI). Scope is intentionally narrow — one real
 * browser (Chromium) driving the app's primary flow against a locally-started
 * dev server, with the AI route mocked at the network layer in the test itself
 * (see e2e/agent-chat.spec.ts) so this never calls the real Anthropic API and
 * never needs an ANTHROPIC_API_KEY to pass in CI.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // A missing/placeholder ANTHROPIC_API_KEY is fine here: the one route this
    // suite talks to is intercepted and fulfilled before it ever reaches the
    // server's streamText call.
    env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "test-placeholder-not-a-real-key" },
  },
});
