import type {
  DownloadSettings,
  DownloadSettingsSyncPayload,
} from "../types/shared/download-settings.types";
import type {
  BrowsingSettings,
  BrowsingSettingsSyncPayload,
} from "../types/shared/browsing-settings.types";
import type {
  ProductivityUserSettings,
  TabGroupActivationPayload,
} from "../types/shared/productivity.types";

export function notifyExtensionAuth(
  accessToken: string,
  user: { userId: string; displayName: string },
): void {
  window.postMessage(
    {
      type: "SURFBUD_AUTH_SUCCESS",
      payload: { user, token: accessToken },
    },
    "*",
  );
}

export function notifyExtensionSettingsSync(settings: DownloadSettings): void {
  const payload: DownloadSettingsSyncPayload = {
    settings,
    syncedAt: new Date().toISOString(),
    source: "dashboard",
  };

  window.postMessage(
    {
      type: "SURFBUD_SETTINGS_SYNC",
      payload,
    },
    "*",
  );
}

export function notifyExtensionBrowsingSettingsSync(
  settings: BrowsingSettings,
): void {
  const payload: BrowsingSettingsSyncPayload = {
    settings,
    syncedAt: new Date().toISOString(),
    source: "dashboard",
  };

  window.postMessage(
    {
      type: "SURFBUD_BROWSING_SETTINGS_SYNC",
      payload,
    },
    "*",
  );
}

/**
 * Opens tab group URLs in the extension. If the dashboard already called
 * `POST /api/productivity/tab-groups/:id/activate`, set `skipActivationApi: true`
 * and pass `urls` from `launchUrls` so the worker does not duplicate the activation event.
 * Omit `urls` for extension-only flows; the worker will call `GET .../launch-urls`.
 */
export function notifyExtensionProductivityUserSettingsSync(
  settings: ProductivityUserSettings,
): void {
  window.postMessage(
    {
      type: "SURFBUD_PRODUCTIVITY_USER_SETTINGS_SYNC",
      payload: {
        settings,
        syncedAt: new Date().toISOString(),
        source: "dashboard" as const,
      },
    },
    "*",
  );
}

export function notifyExtensionTabGroupActivation(
  payload: TabGroupActivationPayload,
): void {
  window.postMessage(
    {
      type: "SURFBUD_PRODUCTIVITY_ACTIVATE",
      payload,
    },
    "*",
  );
}

export function notifyExtensionLogout(): void {
  window.postMessage({ type: "SURFBUD_AUTH_LOGOUT" }, "*");
}
