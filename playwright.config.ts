import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { getDashboardBaseUrl, isE2eSkipServers } from "./e2e/env";

const dashboardUrl = getDashboardBaseUrl();
const skipWebServer = isE2eSkipServers();

/**
 * E2E: dashboard + Chromium with SurfBud extension loaded.
 *
 * Default dashboard URL is http://localhost:5173 (same as Vite). Override with E2E_BASE_URL.
 *
 * If API (3001) and dashboard already run, set E2E_SKIP_SERVERS=1 in e2e/.env.e2e.local.
 * Otherwise omit it so `e2e:serve` starts both (dashboard uses strict port 5173).
 */
export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.E2E_WORKERS
    ? Number(process.env.E2E_WORKERS)
    : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: path.join(__dirname, "e2e", "global-setup.ts"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: dashboardUrl,
    trace: "on-first-retry",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "npm run e2e:serve",
        url: dashboardUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
