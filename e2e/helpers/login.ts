import type { Page } from "@playwright/test";
import { requireDashboardCredentials } from "./credentials";

export async function loginDashboard(
  page: Page,
  email: string,
  password: string,
  origin?: string,
): Promise<void> {
  const loginPath = origin
    ? `${origin.replace(/\/$/, "")}/login`
    : "/login";
  await page.goto(loginPath, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(dashboard|productivity)/, { timeout: 30_000 });
}

export async function loginDashboardWithEnv(
  page: Page,
  origin?: string,
): Promise<void> {
  const { email, password } = requireDashboardCredentials();
  await loginDashboard(page, email, password, origin);
}
