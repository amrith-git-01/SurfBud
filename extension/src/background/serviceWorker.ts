/// <reference types="chrome" />
import { createSHA256 } from "hash-wasm";
import {
  inferFileCategoryFromDownloadItem,
  extractDomain,
  resolveDownloadBasename,
} from "../utils/downloadHelpers";
import {
  handleTabBecameActive,
  closeCurrentSession,
  ensureBrowsingBatchAlarm,
  flushBrowsingSessionsQueue,
  handleAlarm as handleBrowsingAlarm,
  finalizeOrphanedSessionOnStartup,
  recordInteraction,
  normalizeBrowsingSettings,
} from "./browsingSession";
import { openTabGroupUrls, openUrlsInBrowserWindow } from "./tab-group-window";
import {
  clearTabGroupTrackingState,
  flushTabEvolutionPendingQueue,
  focusTrackedTabGroupWindowIfExists,
  getOpenStreakIds,
  getOpenTabGroupIds,
  pruneStaleTrackedWindows,
  startTabEvolutionSession,
} from "./tab-evolution";
import type {
  DownloadSettings,
  DownloadSettingsSyncPayload,
  FileCategory,
} from "../types/shared/download-settings.types";
import type {
  BrowsingSettings,
  BrowsingSettingsSyncPayload,
} from "../types/shared/browsing-settings.types";
import type {
  ProductivityUserSettings,
  TabGroupActivationPayload,
} from "../types/shared/productivity.types";
import { getExtensionApiBase } from "../lib/extension-api-base";
import {
  AUTH_SESSION_KEYS,
  getExtensionAuthToken,
} from "../lib/extension-storage";
import {
  DEFAULT_PRODUCTIVITY_USER_SETTINGS,
  PRODUCTIVITY_USER_SETTINGS_STORAGE_KEY,
  PRODUCTIVITY_USER_SETTINGS_SYNCED_AT_KEY,
} from "../lib/extension-productivity-user-settings";

const API_BASE = getExtensionApiBase();

const PENDING_REMOVAL_POLL_ALARM = "surfbud-pending-removal-poll";
const PENDING_REMOVAL_POLL_MINUTES = 1;
const SETTINGS_STORAGE_KEY = "downloadSettings";
const SETTINGS_SYNCED_AT_STORAGE_KEY = "downloadSettingsSyncedAt";
const BROWSING_SETTINGS_STORAGE_KEY = "browsingSettings";
const BROWSING_SETTINGS_SYNCED_AT_STORAGE_KEY = "browsingSettingsSyncedAt";

interface ProductivityUserSettingsSyncPayload {
  settings: ProductivityUserSettings;
  syncedAt: string;
  source: "extension-fetch" | "dashboard";
}

const DEFAULT_SETTINGS: DownloadSettings = {
  trackingEnabled: true,
  autoRemoveEnabled: false,
  routingEnabled: false,
  routingFolders: [],
};

function readSyncedBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === 1) {
    return true;
  }
  if (value === "false" || value === 0) {
    return false;
  }
  return defaultValue;
}

function normalizeDownloadSettings(
  raw: DownloadSettings | Partial<DownloadSettings> | undefined | null,
): DownloadSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    trackingEnabled: readSyncedBoolean(
      raw.trackingEnabled,
      DEFAULT_SETTINGS.trackingEnabled,
    ),
    autoRemoveEnabled: readSyncedBoolean(
      raw.autoRemoveEnabled,
      DEFAULT_SETTINGS.autoRemoveEnabled,
    ),
    routingEnabled: readSyncedBoolean(
      raw.routingEnabled,
      DEFAULT_SETTINGS.routingEnabled,
    ),
    routingFolders: Array.isArray(raw.routingFolders)
      ? raw.routingFolders
      : DEFAULT_SETTINGS.routingFolders,
  };
}

const DEFAULT_BROWSING_SETTINGS: BrowsingSettings = {
  trackingEnabled: true,
  interactionTrackingEnabled: true,
  minSessionDurationSeconds: 10,
  mergeGapSeconds: 30,
  domainRules: [],
};

const RETRY_DELAYS_MS = [2000, 4000, 8000] as const;

function ensureSidePanelOpensOnToolbarClick(): void {
  try {
    if (typeof chrome.sidePanel?.setPanelBehavior === "function") {
      void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch {
    /* Side Panel API unavailable */
  }
}

/** Payload for POST /api/downloads (ProcessDownloadSchema) */
interface ApiDownloadPayload {
  hash: string | null;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  fileExtension: string;
  fileCategory: string;
  sourceDomain: string;
  duration: number;
  savedPath?: string;
}

interface RemoveFilePayload {
  type: "remove:file";
  savedPath: string;
  hash: string;
}

interface AuthSuccessMessage {
  type: "AUTH_SUCCESS";
  payload: { user: unknown; token: string };
}

interface AuthLogoutMessage {
  type: "AUTH_LOGOUT";
}

interface SettingsSyncMessage {
  type: "SETTINGS_SYNC";
  payload: DownloadSettingsSyncPayload;
}

interface BrowsingSettingsSyncMessage {
  type: "BROWSING_SETTINGS_SYNC";
  payload: BrowsingSettingsSyncPayload;
}

interface BrowsingInteractionMessage {
  type: "BROWSING_INTERACTION";
  payload: {
    kind: "key" | "click" | "scroll";
  };
}

interface ProductivityActivateMessage {
  type: "PRODUCTIVITY_ACTIVATE";
  payload: TabGroupActivationPayload;
}

interface ProductivityTabGroupsStateMessage {
  type: "PRODUCTIVITY_TAB_GROUPS_STATE";
}

interface ProductivityOpenStreakMessage {
  type: "PRODUCTIVITY_OPEN_STREAK";
  payload: {
    streakId: string;
    domain: string;
    hostWindowId?: number;
  };
}

interface ProductivityUserSettingsSyncMessage {
  type: "PRODUCTIVITY_USER_SETTINGS_SYNC";
  payload: ProductivityUserSettingsSyncPayload;
}

type RuntimeMessage =
  | AuthSuccessMessage
  | AuthLogoutMessage
  | SettingsSyncMessage
  | BrowsingSettingsSyncMessage
  | BrowsingInteractionMessage
  | ProductivityActivateMessage
  | ProductivityOpenStreakMessage
  | ProductivityTabGroupsStateMessage
  | ProductivityUserSettingsSyncMessage;

const tabGroupActivationInFlight = new Set<string>();
const streakWindowOpenInFlight = new Set<string>();

function streakLaunchUrl(domain: string): string {
  const raw = domain.trim().toLowerCase();
  try {
    const prefixed =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`;
    const host = new URL(prefixed).hostname.replace(/^www\./i, "");
    return `https://${host}/`;
  } catch {
    const host = raw.replace(/^www\./, "").split("/")[0] ?? raw;
    return `https://${host}/`;
  }
}

/**
 * Build a file:// URL from Chrome's absolute download path (e.g. C:\Users\... or /home/...).
 * Hashes the actual file on disk so duplicate detection is content-based.
 */
function getFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

/**
 * Compute SHA-256 of the downloaded file on disk (content-based).
 * Uses file:// URL so the same file always yields the same hash.
 */
async function computeHashFromFile(filePath: string): Promise<string | null> {
  try {
    const fileUrl = getFileUrl(filePath);
    const response = await fetch(fileUrl);
    if (!response.ok || !response.body) return null;

    const sha256 = await createSHA256();
    sha256.init();

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) sha256.update(value);
    }

    return sha256.digest("hex");
  } catch {
    return null;
  }
}

async function extractMetadata(item: chrome.downloads.DownloadItem): Promise<{
  filename: string;
  url: string;
  size?: number;
  mimeType?: string;
  sourceDomain: string;
  durationMs: number;
}> {
  const filename = resolveDownloadBasename(item);
  const url = item.finalUrl ?? item.url ?? "";
  const size =
    typeof item.totalBytes === "number" && item.totalBytes >= 0
      ? item.totalBytes
      : undefined;
  const mimeType = item.mime || undefined;
  const sourceDomain = extractDomain(url);
  const startMs = item.startTime
    ? new Date(item.startTime).getTime()
    : Date.now();
  const durationMs = Math.max(0, Math.round(Date.now() - startMs));
  return {
    filename,
    url,
    size,
    mimeType,
    sourceDomain,
    durationMs,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (response.ok) {
        return response;
      }

      if (response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response;
      }
    } catch (error: unknown) {
      lastError = error;
    }

    await sleep(RETRY_DELAYS_MS[attempt]);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed after retries");
}

interface TrackingPolicyDecision {
  shouldTrack: boolean;
  blockedBy: "master-toggle" | null;
}

function evaluateTrackingPolicy(
  settings: DownloadSettings,
): TrackingPolicyDecision {
  if (!settings.trackingEnabled) {
    return { shouldTrack: false, blockedBy: "master-toggle" };
  }

  return { shouldTrack: true, blockedBy: null };
}

function shouldTrackEvent(settings: DownloadSettings): boolean {
  return evaluateTrackingPolicy(settings).shouldTrack;
}

function getRoutingFolderForCategory(
  settings: DownloadSettings,
  category: FileCategory,
): string | null {
  if (!settings.routingEnabled) {
    return null;
  }

  const normalizedCategory = category.toLowerCase();
  const mapping = settings.routingFolders.find(
    (item) => item.category?.toLowerCase() === normalizedCategory,
  );
  return mapping?.folderName ?? null;
}

function buildRoutedFilename(folderName: string, filename: string): string {
  const normalizedFolder = folderName
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  const normalizedFile = filename.replace(/^\/+/, "");
  return `${normalizedFolder}/${normalizedFile}`;
}

async function getStoredSettings(): Promise<DownloadSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_STORAGE_KEY], (result) => {
      const stored = result[SETTINGS_STORAGE_KEY] as
        | DownloadSettings
        | undefined;
      resolve(normalizeDownloadSettings(stored));
    });
  });
}

async function persistDownloadSettings(
  payload: DownloadSettingsSyncPayload,
): Promise<void> {
  const normalized = normalizeDownloadSettings(payload.settings);
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: normalized,
    [SETTINGS_SYNCED_AT_STORAGE_KEY]: payload.syncedAt,
  });
}

async function syncDownloadSettingsFromApi(token: string): Promise<void> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/downloads/settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      success?: boolean;
      data?: DownloadSettings;
    };

    if (!data.success || !data.data) {
      return;
    }

    await persistDownloadSettings({
      settings: data.data,
      syncedAt: new Date().toISOString(),
      source: "extension-fetch",
    });
  } catch {
    // Ignore sync failures and keep existing cached settings.
  }
}

async function persistBrowsingSettings(
  payload: BrowsingSettingsSyncPayload,
): Promise<void> {
  await chrome.storage.sync.set({
    [BROWSING_SETTINGS_STORAGE_KEY]: normalizeBrowsingSettings(
      payload.settings,
    ),
    [BROWSING_SETTINGS_SYNCED_AT_STORAGE_KEY]: payload.syncedAt,
  });
}

async function persistProductivityUserSettings(
  payload: ProductivityUserSettingsSyncPayload,
): Promise<void> {
  await chrome.storage.sync.set({
    [PRODUCTIVITY_USER_SETTINGS_STORAGE_KEY]: payload.settings,
    [PRODUCTIVITY_USER_SETTINGS_SYNCED_AT_KEY]: payload.syncedAt,
  });
}

async function syncBrowsingSettingsFromApi(token: string): Promise<void> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/browsing/settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      success?: boolean;
      data?: BrowsingSettings;
    };

    if (!data.success) {
      return;
    }

    await persistBrowsingSettings({
      settings: data.data ?? DEFAULT_BROWSING_SETTINGS,
      syncedAt: new Date().toISOString(),
      source: "extension-fetch",
    });
  } catch {
    // Ignore sync failures and keep existing cached settings.
  }
}

async function syncProductivityUserSettingsFromApi(
  token: string,
): Promise<void> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/productivity/settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      success?: boolean;
      data?: { settings?: ProductivityUserSettings };
    };

    if (!data.success || !data.data?.settings) {
      return;
    }

    const s = data.data.settings;
    await persistProductivityUserSettings({
      settings: {
        tabEvolutionEnabled:
          typeof s.tabEvolutionEnabled === "boolean"
            ? s.tabEvolutionEnabled
            : DEFAULT_PRODUCTIVITY_USER_SETTINGS.tabEvolutionEnabled,
        streakTabEvolutionEnabled:
          typeof s.streakTabEvolutionEnabled === "boolean"
            ? s.streakTabEvolutionEnabled
            : DEFAULT_PRODUCTIVITY_USER_SETTINGS.streakTabEvolutionEnabled,
        trackNewTabsInTabGroupEnabled:
          typeof s.trackNewTabsInTabGroupEnabled === "boolean"
            ? s.trackNewTabsInTabGroupEnabled
            : DEFAULT_PRODUCTIVITY_USER_SETTINGS.trackNewTabsInTabGroupEnabled,
      },
      syncedAt: new Date().toISOString(),
      source: "extension-fetch",
    });
  } catch {
    // Ignore sync failures and keep existing cached settings.
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Unknown removal failure";
}

async function patchRemovalConfirmed(
  token: string,
  input: { savedPath: string; hash: string },
): Promise<void> {
  await fetchWithRetry(`${API_BASE}/downloads/removal-confirmed`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
}

async function logTabGroupActivationToApi(
  token: string,
  tabGroupId: string,
): Promise<void> {
  const id = tabGroupId.trim();
  if (!id) {
    return;
  }

  const response = await fetchWithRetry(
    `${API_BASE}/productivity/tab-groups/${encodeURIComponent(id)}/activate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Productivity activation HTTP ${response.status}`);
  }
}

function normalizeDownloadPathForCompare(p: string): string {
  let s = p.trim().replace(/\\/g, "/");
  if (s.length >= 2 && /^[a-z]:/i.test(s.slice(0, 2))) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s.toLowerCase();
}

async function patchRemovalFailed(
  token: string,
  input: { savedPath: string; hash: string; reason: string },
): Promise<void> {
  await fetchWithRetry(`${API_BASE}/downloads/removal-failed`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
}

async function removeDownloadedFileByPath(savedPath: string): Promise<boolean> {
  const items = await new Promise<chrome.downloads.DownloadItem[]>(
    (resolve) => {
      chrome.downloads.search({}, (r) => resolve(r ?? []));
    },
  );
  const target = normalizeDownloadPathForCompare(savedPath);

  const matchedItem = items.find((item) => {
    if (!item.filename) {
      return false;
    }

    return normalizeDownloadPathForCompare(item.filename) === target;
  });

  if (matchedItem?.id === undefined) {
    return false;
  }

  await new Promise<void>((resolve, reject) => {
    chrome.downloads.removeFile(matchedItem.id, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError?.message) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });

  await new Promise<void>((resolve) => {
    chrome.downloads.erase({ id: matchedItem.id }, () => {
      resolve();
    });
  });

  return true;
}

const removalInflight = new Map<string, Promise<void>>();

function removalDedupKey(payload: RemoveFilePayload): string {
  return `${payload.hash}\0${payload.savedPath}`;
}

async function isPendingRemovalForItem(
  token: string,
  hash: string,
  savedPath: string,
): Promise<boolean> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE}/downloads/removals/pending`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) return true;
    const json = (await response.json()) as {
      data?: { items?: { savedPath: string; hash: string }[] };
    };
    const items = json.data?.items ?? [];
    const target = normalizeDownloadPathForCompare(savedPath);
    return items.some(
      (i) =>
        i.hash === hash &&
        normalizeDownloadPathForCompare(i.savedPath) === target,
    );
  } catch {
    return true;
  }
}

async function handleRemoveFileEventImpl(
  token: string,
  payload: RemoveFilePayload,
): Promise<void> {
  try {
    const removed = await removeDownloadedFileByPath(payload.savedPath);

    if (!removed) {
      const stillPending = await isPendingRemovalForItem(
        token,
        payload.hash,
        payload.savedPath,
      );
      if (!stillPending) {
        return;
      }
      await patchRemovalFailed(token, {
        savedPath: payload.savedPath,
        hash: payload.hash,
        reason: "Download path was not found in Chrome download records",
      });
      return;
    }

    await patchRemovalConfirmed(token, {
      savedPath: payload.savedPath,
      hash: payload.hash,
    });
  } catch (error: unknown) {
    await patchRemovalFailed(token, {
      savedPath: payload.savedPath,
      hash: payload.hash,
      reason: getErrorMessage(error),
    });
  }
}

async function handleRemoveFileEvent(
  token: string,
  payload: RemoveFilePayload,
): Promise<void> {
  const key = removalDedupKey(payload);
  let p = removalInflight.get(key);
  if (p) {
    await p;
    return;
  }
  p = (async () => {
    try {
      await handleRemoveFileEventImpl(token, payload);
    } finally {
      removalInflight.delete(key);
    }
  })();
  removalInflight.set(key, p);
  await p;
}

async function processPendingRemovalsViaRest(token: string): Promise<void> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE}/downloads/removals/pending`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) return;
    const json = (await response.json()) as {
      data?: { items?: { savedPath: string; hash: string }[] };
    };
    const items = json.data?.items ?? [];
    for (const item of items) {
      await handleRemoveFileEvent(token, {
        type: "remove:file",
        savedPath: item.savedPath,
        hash: item.hash,
      });
    }
  } catch {
    /* ignore */
  }
}

async function ensurePendingRemovalPollAlarm(): Promise<void> {
  await chrome.alarms.create(PENDING_REMOVAL_POLL_ALARM, {
    periodInMinutes: PENDING_REMOVAL_POLL_MINUTES,
  });
}

async function clearPendingRemovalPollAlarm(): Promise<void> {
  await chrome.alarms.clear(PENDING_REMOVAL_POLL_ALARM);
}

async function bootstrapOnStartup(): Promise<void> {
  const token = await getExtensionAuthToken();
  if (!token) {
    await clearPendingRemovalPollAlarm();
    return;
  }

  await syncDownloadSettingsFromApi(token);
  await syncBrowsingSettingsFromApi(token);
  await syncProductivityUserSettingsFromApi(token);
  await processPendingRemovalsViaRest(token);
  await ensurePendingRemovalPollAlarm();
}

chrome.runtime.onMessage.addListener(
  (msg: RuntimeMessage, _sender, sendResponse): boolean => {
    if (msg.type === "AUTH_SUCCESS" && msg.payload) {
      chrome.storage.local
        .set({
          authToken: msg.payload.token,
          user: msg.payload.user,
          isAuthenticated: true,
        })
        .then(async () => {
          await syncDownloadSettingsFromApi(msg.payload.token);
          await syncBrowsingSettingsFromApi(msg.payload.token);
          await syncProductivityUserSettingsFromApi(msg.payload.token);
          await processPendingRemovalsViaRest(msg.payload.token);
          await ensurePendingRemovalPollAlarm();
          await flushTabEvolutionPendingQueue(async () => msg.payload.token);
          sendResponse({ ok: true });
        });
    } else if (msg.type === "SETTINGS_SYNC" && msg.payload) {
      persistDownloadSettings(msg.payload).then(() => {
        sendResponse({ ok: true });
      });
    } else if (msg.type === "BROWSING_SETTINGS_SYNC" && msg.payload) {
      persistBrowsingSettings(msg.payload).then(() => {
        sendResponse({ ok: true });
      });
    } else if (msg.type === "PRODUCTIVITY_USER_SETTINGS_SYNC" && msg.payload) {
      void persistProductivityUserSettings(msg.payload).then(() => {
        sendResponse({ ok: true });
      });
    } else if (msg.type === "AUTH_LOGOUT") {
      void clearPendingRemovalPollAlarm();
      clearTabGroupTrackingState();
      void chrome.storage.local.remove([...AUTH_SESSION_KEYS], () => {
        void chrome.storage.sync.remove([...AUTH_SESSION_KEYS], () => {
          sendResponse({ ok: true });
        });
      });
    } else if (msg.type === "BROWSING_INTERACTION" && msg.payload) {
      void recordInteraction(msg.payload.kind);
      sendResponse({ ok: true });
    } else if (msg.type === "PRODUCTIVITY_TAB_GROUPS_STATE") {
      sendResponse({
        ok: true,
        openTabGroupIds: getOpenTabGroupIds(),
        openStreakIds: getOpenStreakIds(),
        activatingTabGroupIds: [...tabGroupActivationInFlight],
      });
    } else if (msg.type === "PRODUCTIVITY_OPEN_STREAK" && msg.payload) {
      void (async () => {
        const streakIdTrim = msg.payload.streakId.trim();
        const send = (r: Record<string, unknown>) => sendResponse(r);
        if (!streakIdTrim) {
          send({
            ok: false,
            error: "Missing streak id",
            openTabGroupIds: getOpenTabGroupIds(),
            openStreakIds: getOpenStreakIds(),
          });
          return;
        }
        if (streakWindowOpenInFlight.has(streakIdTrim)) {
          send({
            ok: false,
            error: "Open already in progress for this streak",
            openTabGroupIds: getOpenTabGroupIds(),
            openStreakIds: getOpenStreakIds(),
          });
          return;
        }
        streakWindowOpenInFlight.add(streakIdTrim);
        try {
          const launchUrl = streakLaunchUrl(msg.payload.domain);
          const hostId = msg.payload.hostWindowId;
          try {
            if (typeof hostId === "number") {
              try {
                await chrome.windows.get(hostId);
                await openUrlsInBrowserWindow(hostId, [launchUrl]);
              } catch {
                await openTabGroupUrls([launchUrl]);
              }
            } else {
              const last = await chrome.windows.getLastFocused();
              if (last.id !== undefined) {
                await openUrlsInBrowserWindow(last.id, [launchUrl]);
              } else {
                await openTabGroupUrls([launchUrl]);
              }
            }
          } catch (error: unknown) {
            send({
              ok: false,
              error: getErrorMessage(error),
              openTabGroupIds: getOpenTabGroupIds(),
              openStreakIds: getOpenStreakIds(),
            });
            return;
          }
          send({
            ok: true,
            openTabGroupIds: getOpenTabGroupIds(),
            openStreakIds: getOpenStreakIds(),
          });
        } catch (error: unknown) {
          send({
            ok: false,
            error: getErrorMessage(error),
            openTabGroupIds: getOpenTabGroupIds(),
            openStreakIds: getOpenStreakIds(),
          });
        } finally {
          streakWindowOpenInFlight.delete(streakIdTrim);
        }
      })();
    } else if (msg.type === "PRODUCTIVITY_ACTIVATE" && msg.payload) {
      void (async () => {
        const openIds = (): string[] => getOpenTabGroupIds();

        const payload = msg.payload;
        const tabGroupIdTrim = payload.tabGroupId.trim();

        if (tabGroupIdTrim && tabGroupActivationInFlight.has(tabGroupIdTrim)) {
          sendResponse({
            ok: false,
            error: "Activation already in progress for this tab group",
            openTabGroupIds: openIds(),
            activatingTabGroupIds: [...tabGroupActivationInFlight],
          });
          return;
        }

        if (tabGroupIdTrim) {
          tabGroupActivationInFlight.add(tabGroupIdTrim);
        }
        try {
          if (tabGroupIdTrim) {
            const focused =
              await focusTrackedTabGroupWindowIfExists(tabGroupIdTrim);
            if (focused) {
              sendResponse({
                ok: true,
                focusedExisting: true,
                openTabGroupIds: openIds(),
                activatingTabGroupIds: [...tabGroupActivationInFlight],
              });
              return;
            }
          }

          let urlsToOpen = payload.urls ?? [];
          if (urlsToOpen.length === 0 && tabGroupIdTrim) {
            const token = await getExtensionAuthToken();
            if (!token) {
              sendResponse({
                ok: false,
                error: "Not signed in",
                openTabGroupIds: openIds(),
                activatingTabGroupIds: [...tabGroupActivationInFlight],
              });
              return;
            }
            const launchRes = await fetchWithRetry(
              `${API_BASE}/productivity/tab-groups/${encodeURIComponent(tabGroupIdTrim)}/launch-urls`,
              {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (!launchRes.ok) {
              sendResponse({
                ok: false,
                error: `Launch URLs HTTP ${launchRes.status}`,
                openTabGroupIds: openIds(),
                activatingTabGroupIds: [...tabGroupActivationInFlight],
              });
              return;
            }
            const launchJson = (await launchRes.json()) as {
              data?: { urls?: string[] };
            };
            urlsToOpen = launchJson.data?.urls ?? [];
          }

          if (urlsToOpen.length === 0) {
            sendResponse({
              ok: false,
              error: "No URLs to open",
              openTabGroupIds: openIds(),
              activatingTabGroupIds: [...tabGroupActivationInFlight],
            });
            return;
          }

          let windowId: number | undefined;
          try {
            windowId = await openTabGroupUrls(urlsToOpen);
          } catch (error: unknown) {
            sendResponse({
              ok: false,
              error: getErrorMessage(error),
              openTabGroupIds: openIds(),
              activatingTabGroupIds: [...tabGroupActivationInFlight],
            });
            return;
          }
          await startTabEvolutionSession(
            windowId,
            tabGroupIdTrim,
            getExtensionAuthToken,
            urlsToOpen,
          );

          if (!payload.skipActivationApi && tabGroupIdTrim) {
            const token = await getExtensionAuthToken();
            if (token) {
              try {
                await logTabGroupActivationToApi(token, tabGroupIdTrim);
              } catch {
                console.warn(
                  "SurfBud: tab group activation logged locally only (API failed)",
                );
              }
            }
          }

          sendResponse({
            ok: true,
            openTabGroupIds: openIds(),
            activatingTabGroupIds: [...tabGroupActivationInFlight],
          });
        } catch (error: unknown) {
          sendResponse({
            ok: false,
            error: getErrorMessage(error),
            openTabGroupIds: getOpenTabGroupIds(),
            activatingTabGroupIds: [...tabGroupActivationInFlight],
          });
        } finally {
          if (tabGroupIdTrim) {
            tabGroupActivationInFlight.delete(tabGroupIdTrim);
          }
        }
      })();
    } else {
      sendResponse({ ok: false });
    }
    return true;
  },
);

void bootstrapOnStartup();
ensureSidePanelOpensOnToolbarClick();
void (async () => {
  await finalizeOrphanedSessionOnStartup();
  await ensureBrowsingBatchAlarm();
  await flushBrowsingSessionsQueue();
  await pruneStaleTrackedWindows();
})();

chrome.runtime.onStartup.addListener(() => {
  ensureSidePanelOpensOnToolbarClick();
  void bootstrapOnStartup();
  void flushBrowsingSessionsQueue();
  void pruneStaleTrackedWindows();
});

chrome.runtime.onInstalled.addListener(() => {
  ensureSidePanelOpensOnToolbarClick();
  void (async () => {
    await ensureBrowsingBatchAlarm();
    await flushBrowsingSessionsQueue();
    await pruneStaleTrackedWindows();
  })();
});

async function sendToBackend(payload: ApiDownloadPayload): Promise<void> {
  const token = await getExtensionAuthToken();
  if (!token) {
    return;
  }

  try {
    const response = await fetchWithRetry(`${API_BASE}/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("SurfBud: failed to send download", response.status);
      return;
    }
    void processPendingRemovalsViaRest(token);
  } catch (err) {
    console.error("SurfBud: failed to send download", err);
  }
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest): boolean => {
  void (async () => {
    const filename = resolveDownloadBasename(item);
    if (!filename) {
      suggest();
      return;
    }

    const category = inferFileCategoryFromDownloadItem(item);
    let settings = await getStoredSettings();
    let folderName = getRoutingFolderForCategory(settings, category);

    // If settings in extension storage are stale, refresh once from API and retry routing.
    if (!folderName && settings.routingEnabled) {
      const token = await getExtensionAuthToken();
      if (token) {
        await syncDownloadSettingsFromApi(token);
        settings = await getStoredSettings();
        folderName = getRoutingFolderForCategory(settings, category);
      }
    }

    if (!folderName) {
      suggest();
      return;
    }

    suggest({
      filename: buildRoutedFilename(folderName, filename),
      conflictAction: "uniquify",
    });
  })();

  return true;
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current !== "complete") return;

  void (async () => {
    const results = await new Promise<chrome.downloads.DownloadItem[]>(
      (resolve) => {
        chrome.downloads.search({ id: delta.id }, (items) =>
          resolve(items ?? []),
        );
      },
    );

    const item = results[0];
    if (!item || !item.filename || !item.url) return;

    const metadata = await extractMetadata(item);
    const category = inferFileCategoryFromDownloadItem(item);
    let settings = await getStoredSettings();

    if (!shouldTrackEvent(settings)) {
      const token = await getExtensionAuthToken();
      if (token) {
        await syncDownloadSettingsFromApi(token);
        settings = await getStoredSettings();
      }
      if (!shouldTrackEvent(settings)) {
        return;
      }
    }

    const hash = await computeHashFromFile(item.filename);
    if (hash === null) {
      return;
    }

    const payload: ApiDownloadPayload = {
      hash,
      filename: metadata.filename,
      url: metadata.url,
      size: metadata.size ?? 0,
      mimeType: metadata.mimeType ?? "",
      fileExtension: "",
      fileCategory: category,
      sourceDomain: metadata.sourceDomain ?? "",
      duration: metadata.durationMs,
      savedPath: item.filename?.trim() || undefined,
    };
    await sendToBackend(payload);
  })();
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  void (async () => {
    try {
      const tab = await chrome.tabs.get(tabId);
      const url = tab.url ?? "";
      if (!url.startsWith("http")) {
        await closeCurrentSession();
        return;
      }
      await handleTabBecameActive(tabId, url);
    } catch {
      await closeCurrentSession();
    }
  })();
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (!changeInfo.url) return;
  const url = changeInfo.url;
  if (!url.startsWith("http")) {
    void closeCurrentSession();
    return;
  }
  void handleTabBecameActive(tabId, url);
});
chrome.tabs.onRemoved.addListener((_tabId) => {
  // Only one open session at a time → safe to just close
  void closeCurrentSession();
});
chrome.tabs.onReplaced.addListener((_addedTabId, _removedTabId) => {
  void closeCurrentSession();
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  void (async () => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await closeCurrentSession();
      return;
    }
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (!activeTab?.id || !activeTab.url?.startsWith("http")) {
      await closeCurrentSession();
      return;
    }
    await handleTabBecameActive(activeTab.id, activeTab.url);
  })();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void (async () => {
    if (alarm.name === "browsing-batch-send") {
      await handleBrowsingAlarm(alarm.name);
    } else if (alarm.name === PENDING_REMOVAL_POLL_ALARM) {
      const token = await getExtensionAuthToken();
      if (token) {
        await processPendingRemovalsViaRest(token);
      }
    }
  })();
});
