import { expect, type Locator, type Page } from "@playwright/test";

export const TAB_GROUP_MODAL_BACKDROP_TESTID = "tab-group-modal-backdrop";

export function yourGroupsPanel(page: Page): Locator {
  return page
    .locator("div.chart-glass")
    .filter({ has: page.getByText("Your Groups", { exact: true }) })
    .first();
}

export async function deleteAllCustomTabGroups(page: Page): Promise<void> {
  const panel = yourGroupsPanel(page);
  for (;;) {
    const rowDelete = panel.getByRole("button", { name: /^Delete / });
    const n = await rowDelete.count();
    if (n === 0) break;

    await page.getByRole("heading", { name: "Tab groups" }).click();
    await rowDelete.first().click({ force: true });
    await expect(rowDelete).toHaveCount(n - 1, { timeout: 20_000 });
  }
}

export function newTabGroupModal(page: Page): Locator {
  return page
    .locator("div.rounded-2xl.bg-white.p-6.shadow-xl")
    .filter({ has: page.getByRole("heading", { name: "New Group" }) });
}

export function matchesTabGroupCreatePost(res: {
  request: () => { method: () => string };
  url: () => string;
  ok: () => boolean;
}): boolean {
  if (res.request().method() !== "POST" || !res.ok()) return false;
  try {
    const path = new URL(res.url()).pathname.replace(/\/$/, "");
    return /\/productivity\/tab-groups$/.test(path);
  } catch {
    return false;
  }
}

export async function openNewTabGroupModal(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "New group" }).click();
  const modal = newTabGroupModal(page);
  await expect(modal.getByRole("heading", { name: "New Group" })).toBeVisible();
  return modal;
}

export async function addUrlToNewTabGroupModal(
  modal: Locator,
  url: string,
): Promise<void> {
  await modal.getByPlaceholder("https://example.com").fill(url);
  await modal.getByRole("button", { name: "Add" }).click();
}

export async function applyNewTabGroupModalAndSaveConfigure(
  page: Page,
  modal: Locator,
  timeoutMs = 30_000,
): Promise<void> {
  await modal.getByRole("button", { name: "Add group" }).click();
  await expect(
    modal.getByRole("heading", { name: "New Group" }),
  ).toBeHidden({ timeout: 15_000 });
  await Promise.all([
    page.waitForResponse((res) => matchesTabGroupCreatePost(res), {
      timeout: timeoutMs,
    }),
    page.getByRole("button", { name: "Save" }).click(),
  ]);
}
