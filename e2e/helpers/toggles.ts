import type { Page } from "@playwright/test";

export const SETTINGS_TOGGLE_TAB_EVOLUTION = "settings-toggle-tab-evolution";
export const SETTINGS_TOGGLE_TRACK_NEW_TABS = "settings-toggle-track-new-tabs";

export function tabEvolutionInput(page: Page) {
  return page
    .getByTestId(SETTINGS_TOGGLE_TAB_EVOLUTION)
    .locator('input[type="checkbox"]');
}

export function trackNewTabsInput(page: Page) {
  return page
    .getByTestId(SETTINGS_TOGGLE_TRACK_NEW_TABS)
    .locator('input[type="checkbox"]');
}

export async function setToggleByTestId(
  page: Page,
  testId: string,
  checked: boolean,
): Promise<void> {
  const root = page.getByTestId(testId);
  const input = root.locator('input[type="checkbox"]');
  for (let i = 0; i < 4; i++) {
    if ((await input.isChecked()) === checked) return;
    await root.locator("label").click();
  }
  throw new Error(`toggle ${testId} did not reach checked=${checked}`);
}
