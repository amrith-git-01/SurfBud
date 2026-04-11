import { chromium, expect, type BrowserContext } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const EXTENSION_DIST_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "extension",
  "dist",
);

function extensionLaunchArgs(): string[] {
  return [
    `--disable-extensions-except=${EXTENSION_DIST_DIR}`,
    `--load-extension=${EXTENSION_DIST_DIR}`,
  ];
}

export interface WithExtensionContextOptions {
  tempDirPrefix?: string;
  requireBuiltExtension?: boolean;
}

export async function withExtensionContext(
  fn: (context: BrowserContext) => Promise<void>,
  options: WithExtensionContextOptions = {},
): Promise<void> {
  const {
    tempDirPrefix = "surfbud-pw-ext-",
    requireBuiltExtension = true,
  } = options;

  if (
    requireBuiltExtension &&
    !fs.existsSync(path.join(EXTENSION_DIST_DIR, "manifest.json"))
  ) {
    throw new Error(
      "extension not built; global-setup should have built extension/dist/manifest.json",
    );
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), tempDirPrefix));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    args: extensionLaunchArgs(),
    headless: !!process.env.CI,
  });
  try {
    await fn(context);
  } finally {
    await context.close();
  }
}

export async function expectExtensionServiceWorker(
  context: BrowserContext,
  timeoutMs: number,
): Promise<void> {
  await expect
    .poll(
      () =>
        context
          .serviceWorkers()
          .filter((w) => w.url().includes("chrome-extension://")).length,
      { timeout: timeoutMs },
    )
    .toBeGreaterThan(0);
}
