import { test, expect } from "@playwright/test";
import {
  CREDENTIALS_SKIP_REASON,
  getDashboardCredentials,
} from "./helpers/credentials";
import { loginDashboardWithEnv } from "./helpers/login";
import {
  openProductivityConfigure,
  expectTabEvolutionSectionVisible,
} from "./services/productivity";

test.describe("Dashboard (no extension)", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
  });

  test("productivity configure shows tab evolution when logged in", async ({
    page,
  }) => {
    test.skip(!getDashboardCredentials(), CREDENTIALS_SKIP_REASON);

    await loginDashboardWithEnv(page);
    await openProductivityConfigure(page);
    await expectTabEvolutionSectionVisible(page, 15_000);
  });
});
