import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL, E2E_BASE_URL } from "./tests/e2e/embedded-db";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `next dev` locks per-project-directory regardless of port, which
    // collides with any dev server already running locally — build + start
    // instead, which also tests against a production-like build.
    command: "next build && next start -p 3100",
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      E2E_TESTING: "1",
      NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
      AUTH_SECRET: "e2e-test-secret-not-for-production",
      AUTH_URL: E2E_BASE_URL,
      AUTH_TRUST_HOST: "true",
    },
  },
});
