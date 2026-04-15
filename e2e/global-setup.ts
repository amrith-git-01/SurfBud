import { request } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getDashboardBaseUrl, isE2eSkipServers, loadE2eEnv } from "./env";

export default async function globalSetup(): Promise<void> {
  loadE2eEnv();

  const base = getDashboardBaseUrl();
  if (isE2eSkipServers()) {
    const ctx = await request.newContext({ baseURL: base });
    try {
      const res = await ctx.get("/login", { timeout: 10_000 }).catch(() => null);
      if (!res?.ok()) {
        throw new Error(
          [
            `E2E_SKIP_SERVERS=1 but nothing responded at ${base}/login (status ${res?.status() ?? "none"}).`,
            "Fix: start the dashboard (cd dashboard && npm run dev) so it matches E2E_BASE_URL,",
            "or remove E2E_SKIP_SERVERS from e2e/.env.e2e.local so Playwright runs npm run e2e:serve.",
            `If Vite picked another port, set E2E_BASE_URL=http://localhost:PORT in e2e/.env.e2e.local.`,
          ].join(" "),
        );
      }
    } finally {
      await ctx.dispose();
    }
  }

  const extRoot = path.join(__dirname, "..", "extension");
  const manifest = path.join(extRoot, "dist", "manifest.json");
  if (!fs.existsSync(manifest) || process.env.E2E_FORCE_EXT_BUILD === "1") {
    execSync("npm run build", { cwd: extRoot, stdio: "inherit" });
  }
  if (!fs.existsSync(manifest)) {
    throw new Error("extension/dist/manifest.json missing after build");
  }
}
