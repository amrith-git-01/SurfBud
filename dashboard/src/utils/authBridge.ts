import type {
  DownloadSettings,
  DownloadSettingsSyncPayload,
} from '../types/shared/download-settings.types';

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
    source: 'dashboard',
  };

  window.postMessage(
    {
      type: "SURFBUD_SETTINGS_SYNC",
      payload,
    },
    "*",
  );
}

export function notifyExtensionLogout(): void {
  window.postMessage({ type: "SURFBUD_AUTH_LOGOUT" }, "*");
}
