import { test } from "@playwright/test";
import {
  CREDENTIALS_SKIP_REASON,
  getDashboardCredentials,
} from "./helpers/credentials";
import {
  expectExtensionServiceWorker,
  withExtensionContext,
} from "./helpers/extension-context";
import { loginDashboardWithEnv } from "./helpers/login";
import { getDashboardBaseUrl } from "./env";
import {
  openProductivityConfigure,
  expectTabEvolutionSectionVisible,
} from "./services/productivity";

test.describe("Dashboard + extension (same browser)", () => {
  test("login and open productivity configure with extension enabled", async () => {
    test.skip(!getDashboardCredentials(), CREDENTIALS_SKIP_REASON);

    await withExtensionContext(
      async (context) => {
        const page = await context.newPage();
        const base = getDashboardBaseUrl();
        await loginDashboardWithEnv(page, base);
        await openProductivityConfigure(page, { baseURL: base });

        await expectTabEvolutionSectionVisible(page, 20_000);

        await expectExtensionServiceWorker(context, 15_000);
      },
      { tempDirPrefix: "surfbud-pw-full-" },
    );
  });
});
