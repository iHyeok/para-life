import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: multichat (static build) against a real channel/server.ts.
// Tests tagged @slow wait on real timers (heartbeat, throttled upload); skip them with --grep-invert @slow.
export default defineConfig({
  testDir: "test",
  testMatch: "*.spec.ts",
  // Timing-sensitive (reconnect backoff, heartbeat): run one at a time
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
