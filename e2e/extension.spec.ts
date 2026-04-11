import { test } from "@playwright/test";
import {
  expectExtensionServiceWorker,
  withExtensionContext,
} from "./helpers/extension-context";

test.describe("Extension", () => {
  test("loads service worker after navigation", async () => {
    await withExtensionContext(async (context) => {
      const page = await context.newPage();
      await page.goto("https://example.com/", { waitUntil: "domcontentloaded" });

      await expectExtensionServiceWorker(context, 20_000);
    });
  });
});
