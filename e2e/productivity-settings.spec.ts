import { test, expect } from "@playwright/test";
import {
  CREDENTIALS_SKIP_REASON,
  getDashboardCredentials,
} from "./helpers/credentials";
import { loginDashboardWithEnv } from "./helpers/login";
import {
  SETTINGS_TOGGLE_TAB_EVOLUTION,
  SETTINGS_TOGGLE_TRACK_NEW_TABS,
  setToggleByTestId,
  tabEvolutionInput,
  trackNewTabsInput,
} from "./helpers/toggles";
import {
  matchesProductivitySettingsPatch,
  matchesProductivitySettingsPatchOk,
  openProductivityConfigure,
  waitForProductivitySettingsGet,
  waitForTabEvolutionToggleVisible,
} from "./services/productivity";

test.describe("Productivity tab-group behavior settings", () => {
  test.beforeEach(() => {
    test.skip(!getDashboardCredentials(), CREDENTIALS_SKIP_REASON);
  });

  test("Tab evolution off disables Track new tabs toggle", async ({ page }) => {
    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);
    await waitForTabEvolutionToggleVisible(page);

    const tabEvolution = tabEvolutionInput(page);
    const trackNew = trackNewTabsInput(page);

    await expect(tabEvolution).toBeAttached();
    await expect(trackNew).toBeAttached();

    await setToggleByTestId(page, SETTINGS_TOGGLE_TAB_EVOLUTION, true);
    await expect(trackNew).toBeEnabled();

    await setToggleByTestId(page, SETTINGS_TOGGLE_TAB_EVOLUTION, false);
    await expect(trackNew).toBeDisabled();

    await setToggleByTestId(page, SETTINGS_TOGGLE_TAB_EVOLUTION, true);
    await expect(trackNew).toBeEnabled();
  });

  test("Save persists Track new tabs via API and after reload", async ({
    page,
  }) => {
    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);
    await waitForTabEvolutionToggleVisible(page);

    const trackNew = trackNewTabsInput(page);
    await setToggleByTestId(page, SETTINGS_TOGGLE_TAB_EVOLUTION, true);
    await expect(trackNew).toBeEnabled();

    const before = await trackNew.isChecked();

    await setToggleByTestId(
      page,
      SETTINGS_TOGGLE_TRACK_NEW_TABS,
      !before,
    );
    await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();

    const patchPromise = page.waitForResponse(matchesProductivitySettingsPatchOk);

    await page.getByRole("button", { name: "Save" }).click();
    const patchRes = await patchPromise;
    const json = (await patchRes.json()) as {
      data?: { settings?: { trackNewTabsInTabGroupEnabled?: boolean } };
    };
    expect(json.data?.settings?.trackNewTabsInTabGroupEnabled).toBe(!before);

    await expect(page.getByText("Settings saved", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForProductivitySettingsGet(page);
    await expect(page.getByTestId(SETTINGS_TOGGLE_TRACK_NEW_TABS)).toBeVisible({
      timeout: 25_000,
    });
    const trackAfterReload = trackNewTabsInput(page);
    await expect(trackAfterReload).toBeChecked({
      checked: !before,
      timeout: 15_000,
    });
  });

  test("Save sends tabEvolutionEnabled in PATCH", async ({ page }) => {
    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);
    await waitForTabEvolutionToggleVisible(page);

    const tabEvolution = tabEvolutionInput(page);

    const next = !(await tabEvolution.isChecked());
    await setToggleByTestId(page, SETTINGS_TOGGLE_TAB_EVOLUTION, next);

    const patchPromise = page.waitForResponse(matchesProductivitySettingsPatch);
    await page.getByRole("button", { name: "Save" }).click();
    const patchRes = await patchPromise;
    expect(patchRes.ok()).toBeTruthy();

    const raw = patchRes.request().postData();
    const posted = (raw ? JSON.parse(raw) : {}) as { tabEvolutionEnabled?: boolean };
    expect(posted.tabEvolutionEnabled).toBe(next);

    await setToggleByTestId(page, SETTINGS_TOGGLE_TAB_EVOLUTION, !next);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Settings saved", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});
