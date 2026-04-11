import { config as loadEnv } from "dotenv";
import path from "node:path";

const e2eDir = path.join(process.cwd(), "e2e");

let didLoad = false;

export function loadE2eEnv(): void {
  if (didLoad) return;
  didLoad = true;
  loadEnv({ path: path.join(e2eDir, ".env.e2e.local") });
  loadEnv({ path: path.join(e2eDir, ".env.e2e") });
}

export function getDashboardBaseUrl(): string {
  loadE2eEnv();
  return (process.env.E2E_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

export function isE2eSkipServers(): boolean {
  loadE2eEnv();
  return process.env.E2E_SKIP_SERVERS === "1";
}
