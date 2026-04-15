import { test, expect, type Locator } from "@playwright/test";
import {
  CREDENTIALS_SKIP_REASON,
  getDashboardCredentials,
} from "./helpers/credentials";
import { loginDashboardWithEnv } from "./helpers/login";
import { openProductivityConfigure } from "./services/productivity";

async function assertStreakModalVerticalOrder(modal: Locator): Promise<void> {
  const domainInput = modal.getByPlaceholder("leetcode.com");
  const scheduleRow = modal.getByTestId("streak-schedule-row");
  const createBtn = modal.getByRole("button", { name: "Create Streak" });

  const dBox = await domainInput.boundingBox();
  const sBox = await scheduleRow.boundingBox();
  const cBox = await createBtn.boundingBox();

  expect(dBox, "domain input box").toBeTruthy();
  expect(sBox, "schedule row box").toBeTruthy();
  expect(cBox, "Create Streak box").toBeTruthy();

  expect(sBox!.y).toBeGreaterThanOrEqual(dBox!.y + dBox!.height - 1);
  expect(cBox!.y).toBeGreaterThanOrEqual(sBox!.y + sBox!.height - 1);
}

test.describe("Streak modal layout", () => {
  test.beforeEach(() => {
    test.skip(!getDashboardCredentials(), CREDENTIALS_SKIP_REASON);
  });

  test("active days sit below domain and above footer (desktop + mobile)", async ({
    page,
  }) => {
    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);
    await expect(page.getByText("Streak tracking")).toBeVisible({
      timeout: 25_000,
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "New streak" }).click();
    const modal = page.getByTestId("streak-modal");
    await expect(modal).toBeVisible();
    await assertStreakModalVerticalOrder(modal);

    await page.getByRole("button", { name: "Close streak modal" }).click();
    await expect(modal).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "New streak" }).click();
    await expect(modal).toBeVisible();
    await assertStreakModalVerticalOrder(modal);
  });
});
