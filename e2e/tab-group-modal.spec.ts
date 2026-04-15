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
  TAB_GROUP_MODAL_BACKDROP_TESTID,
  openNewTabGroupModal,
} from "./services/tab-groups";

test.describe("Tab group modal", () => {
  test.beforeEach(() => {
    test.skip(!getDashboardCredentials(), CREDENTIALS_SKIP_REASON);
  });

  test("backdrop click closes new group modal; panel click does not", async ({
    page,
  }) => {
    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);
    await waitForTabGroupsGet(page);

    const modal = await openNewTabGroupModal(page);
    const title = modal.getByRole("heading", { name: "New Group" });

    await modal.getByPlaceholder("Mode name").click();
    await expect(title).toBeVisible();

    await page.getByTestId(TAB_GROUP_MODAL_BACKDROP_TESTID).click({
      position: { x: 12, y: 12 },
    });
    await expect(title).toBeHidden({ timeout: 10_000 });

    const modalAgain = await openNewTabGroupModal(page);
    await modalAgain.getByPlaceholder("Mode name").click();
    await expect(
      modalAgain.getByRole("heading", { name: "New Group" }),
    ).toBeVisible();
  });
});
