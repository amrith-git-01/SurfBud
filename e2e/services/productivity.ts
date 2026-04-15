import { expect, type Page } from "@playwright/test";

export const PRODUCTIVITY_CONFIGURE_PATH = "/productivity/configure";

export async function openProductivityConfigure(
  page: Page,
  options?: { baseURL?: string },
): Promise<void> {
  const target = options?.baseURL
    ? `${options.baseURL.replace(/\/$/, "")}${PRODUCTIVITY_CONFIGURE_PATH}`
    : PRODUCTIVITY_CONFIGURE_PATH;
  await page.goto(target, { waitUntil: "domcontentloaded" });
}

export async function waitForTabGroupsGet(
  page: Page,
  timeoutMs = 30_000,
): Promise<void> {
  await page.waitForResponse(
    (res) =>
      res.request().method() === "GET" &&
      res.url().includes("/api/productivity/tab-groups") &&
      res.ok(),
    { timeout: timeoutMs },
  );
}

export async function waitForTabEvolutionToggleVisible(
  page: Page,
  timeoutMs = 25_000,
): Promise<void> {
  await expect(
    page.getByTestId("settings-toggle-tab-evolution"),
  ).toBeVisible({ timeout: timeoutMs });
}

export async function waitForProductivitySettingsGet(
  page: Page,
  timeoutMs = 30_000,
): Promise<void> {
  await page.waitForResponse(
    (res) =>
      res.request().method() === "GET" &&
      res.url().includes("/api/productivity/settings") &&
      res.ok(),
    { timeout: timeoutMs },
  );
}

export function matchesProductivitySettingsPatchOk(res: {
  url: () => string;
  request: () => { method: () => string };
  ok: () => boolean;
}): boolean {
  return (
    res.url().includes("/api/productivity/settings") &&
    res.request().method() === "PATCH" &&
    res.ok()
  );
}

export function matchesProductivitySettingsPatch(res: {
  url: () => string;
  request: () => { method: () => string };
}): boolean {
  return (
    res.url().includes("/api/productivity/settings") &&
    res.request().method() === "PATCH"
  );
}

export async function expectTabEvolutionSectionVisible(
  page: Page,
  timeoutMs = 15_000,
): Promise<void> {
  await expect(
    page.getByText("Tab evolution", { exact: false }).first(),
  ).toBeVisible({ timeout: timeoutMs });
}
