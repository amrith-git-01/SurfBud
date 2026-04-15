import { test, expect } from "@playwright/test";
import {
  CREDENTIALS_SKIP_REASON,
  getDashboardCredentials,
} from "./helpers/credentials";
import { loginDashboardWithEnv } from "./helpers/login";
import {
  openProductivityConfigure,
  waitForTabGroupsGet,
} from "./services/productivity";
import {
  addUrlToNewTabGroupModal,
  applyNewTabGroupModalAndSaveConfigure,
  deleteAllCustomTabGroups,
  openNewTabGroupModal,
} from "./services/tab-groups";

test.describe("Productivity tab group create", () => {
  test.beforeEach(() => {
    test.skip(!getDashboardCredentials(), CREDENTIALS_SKIP_REASON);
  });

  test("remove existing custom groups, create group with URL, save", async ({
    page,
  }) => {
    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);

    await waitForTabGroupsGet(page);

    await expect(page.getByRole("heading", { name: "Tab groups" })).toBeVisible({
      timeout: 25_000,
    });

    await deleteAllCustomTabGroups(page);

    const groupName = `E2E group ${Date.now()}`;
    const modal = await openNewTabGroupModal(page);

    await modal.getByPlaceholder("Mode name").fill(groupName);
    await addUrlToNewTabGroupModal(modal, "https://example.com");
    await expect(modal.getByText("example.com", { exact: true })).toBeVisible();

    await applyNewTabGroupModalAndSaveConfigure(page, modal);

    await expect(
      page.getByRole("heading", { level: 3, name: groupName }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/example\.com/)).toBeVisible();
  });
});
