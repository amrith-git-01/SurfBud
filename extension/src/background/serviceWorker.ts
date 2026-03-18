/// <reference types="chrome" />
import { createSHA256 } from "hash-wasm";
import { io, type Socket } from "socket.io-client";
import {
  inferFileCategory,
  extractFilename,
  extractDomain,
} from "../utils/downloadHelpers";
import {
  handleTabBecameActive,
  closeCurrentSession,
  ensureBrowsingBatchAlarm,
  flushBrowsingSessionsQueue,
  handleAlarm as handleBrowsingAlarm,
  finalizeOrphanedSessionOnStartup,
  recordInteraction,
} from "./browsingSession";
import type {
  DownloadSettings,
  DownloadSettingsSyncPayload,
  DownloadRuleValue,
  FileCategory,
} from "../types/shared/download-settings.types";
import type {
  BrowsingSettings,
  BrowsingSettingsSyncPayload,
} from "../types/shared/browsing-settings.types";

const API_BASE = "http://localhost:3001/api";
const SOCKET_BASE = API_BASE.endsWith("/api")
  ? API_BASE.slice(0, -4)
  : API_BASE;

/** Matches `GET /api/health` on the API — poll until HTTP server listens (after Redis/DB bootstrap). */
const SOCKET_HEALTH_PATH = "/api/health";
/** Polling first avoids websocket-only failures; keep attempts low to reduce console noise. */
const SOCKET_RECONNECT_ATTEMPTS = 3;
const SOCKET_RECONNECT_DELAY_MS = 5000;
const SOCKET_RECONNECT_DELAY_MAX_MS = 30000;
/** Backstop if the API was down — retries socket without tight reconnect loops. */
const SOCKET_RECONNECT_ALARM = "surfbud-socket-reconnect";
const SOCKET_RECONNECT_ALARM_MINUTES = 15;

async function waitForApiHealth(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, "")}${SOCKET_HEALTH_PATH}`;
  let delayMs = 200;
  const maxDelayMs = 4000;
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (res.ok) {
        return true;
      }
    } catch {
      /* connection refused until server listens */
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
    delayMs = Math.min(Math.floor(delayMs * 1.35), maxDelayMs);
  }

  return false;
}
const AUTH_STORAGE_KEY = "authToken";
const SETTINGS_STORAGE_KEY = "downloadSettings";
const SETTINGS_SYNCED_AT_STORAGE_KEY = "downloadSettingsSyncedAt";
const BROWSING_SETTINGS_STORAGE_KEY = "browsingSettings";
const BROWSING_SETTINGS_SYNCED_AT_STORAGE_KEY = "browsingSettingsSyncedAt";

const DEFAULT_SETTINGS: DownloadSettings = {
  trackingEnabled: true,
  autoRemoveEnabled: false,
  gracePeriodType: "delayed",
  gracePeriodMinutes: 15,
  routingEnabled: false,
  domainRules: [],
  routingFolders: [],
};

const DEFAULT_BROWSING_SETTINGS: BrowsingSettings = {
  trackingEnabled: true,
  interactionTrackingEnabled: true,
  minSessionDurationSeconds: 10,
  mergeGapSeconds: 30,
  domainRules: [],
};

const RETRY_DELAYS_MS = [2000, 4000, 8000] as const;

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

type RuntimeMessage =
  | AuthSuccessMessage
  | AuthLogoutMessage
  | SettingsSyncMessage
  | BrowsingSettingsSyncMessage
  | BrowsingInteractionMessage;

let removalSocket: Socket | null = null;
let activeSocketToken: string | null = null;

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
  const filename = extractFilename(item.filename ?? "");
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

function normalizeDomain(input: string): string {
  if (!input) return "";

  try {
    const url = new URL(
      input.startsWith("http://") || input.startsWith("https://")
        ? input
        : `https://${input}`,
    );
    return (url.hostname ?? "").toLowerCase();
  } catch {
    return input.trim().toLowerCase();
  }
}

function getDomainRuleValue(
  settings: DownloadSettings,
  sourceDomain: string,
): DownloadRuleValue | null {
  const normalized = normalizeDomain(sourceDomain);
  if (!normalized) return null;

  const rule = settings.domainRules.find(
    (item) => item.domain.toLowerCase() === normalized,
  );
  return rule?.rule ?? null;
}

interface TrackingPolicyDecision {
  shouldTrack: boolean;
  blockedBy: "master-toggle" | "domain-rule" | null;
}

function evaluateTrackingPolicy(
  settings: DownloadSettings,
  sourceDomain: string,
): TrackingPolicyDecision {
  // Priority 1: master toggles
  if (!settings.trackingEnabled) {
    return { shouldTrack: false, blockedBy: "master-toggle" };
  }

  // Priority 2: domain rules
  const domainRule = getDomainRuleValue(settings, sourceDomain);
  if (domainRule === "dont_track") {
    return { shouldTrack: false, blockedBy: "domain-rule" };
  }

  return { shouldTrack: true, blockedBy: null };
}

function shouldTrackEvent(
  settings: DownloadSettings,
  sourceDomain: string,
): boolean {
  return evaluateTrackingPolicy(settings, sourceDomain).shouldTrack;
}

function getRoutingFolderForCategory(
  settings: DownloadSettings,
  sourceDomain: string,
  category: FileCategory,
): string | null {
  const trackingPolicy = evaluateTrackingPolicy(settings, sourceDomain);
  if (!trackingPolicy.shouldTrack) {
    return null;
  }

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
      resolve(stored ?? DEFAULT_SETTINGS);
    });
  });
}

async function persistDownloadSettings(
  payload: DownloadSettingsSyncPayload,
): Promise<void> {
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: payload.settings,
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
    [BROWSING_SETTINGS_STORAGE_KEY]: payload.settings,
    [BROWSING_SETTINGS_SYNCED_AT_STORAGE_KEY]: payload.syncedAt,
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
      chrome.downloads.search({}, (result) => {
        resolve(result ?? []);
      });
    },
  );

  const matchedItem = items.find((item) => {
    if (!item.filename) {
      return false;
    }

    return item.filename.toLowerCase() === savedPath.toLowerCase();
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

async function handleRemoveFileEvent(
  token: string,
  payload: RemoveFilePayload,
): Promise<void> {
  try {
    const removed = await removeDownloadedFileByPath(payload.savedPath);

    if (!removed) {
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

function disconnectRemovalSocket(): void {
  if (!removalSocket) {
    return;
  }

  removalSocket.removeAllListeners();
  removalSocket.disconnect();
  removalSocket = null;
  activeSocketToken = null;
}

async function ensureSocketReconnectAlarm(): Promise<void> {
  await chrome.alarms.create(SOCKET_RECONNECT_ALARM, {
    periodInMinutes: SOCKET_RECONNECT_ALARM_MINUTES,
  });
}

async function clearSocketReconnectAlarm(): Promise<void> {
  await chrome.alarms.clear(SOCKET_RECONNECT_ALARM);
}

async function connectRemovalSocket(token: string): Promise<void> {
  if (
    removalSocket &&
    activeSocketToken === token &&
    (removalSocket.connected || removalSocket.active)
  ) {
    return;
  }

  disconnectRemovalSocket();

  const reachable = await waitForApiHealth(SOCKET_BASE);
  if (!reachable) {
    await ensureSocketReconnectAlarm();
    console.warn(
      "SurfBud: API not reachable; removal socket will retry on schedule.",
    );
    return;
  }

  const socket = io(SOCKET_BASE, {
    auth: { token },
    transports: ["polling", "websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
    reconnectionDelay: SOCKET_RECONNECT_DELAY_MS,
    reconnectionDelayMax: SOCKET_RECONNECT_DELAY_MAX_MS,
    randomizationFactor: 0.5,
  });

  socket.on("remove:file", (payload: RemoveFilePayload) => {
    void handleRemoveFileEvent(token, payload);
  });

  socket.io.on("reconnect_failed", () => {
    void ensureSocketReconnectAlarm();
  });

  removalSocket = socket;
  activeSocketToken = token;
}

async function bootstrapSocketConnection(): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    disconnectRemovalSocket();
    await clearSocketReconnectAlarm();
    return;
  }

  await syncDownloadSettingsFromApi(token);
  await syncBrowsingSettingsFromApi(token);
  await connectRemovalSocket(token);
}

chrome.runtime.onMessage.addListener(
  (msg: RuntimeMessage, _sender, sendResponse): boolean => {
    if (msg.type === "AUTH_SUCCESS" && msg.payload) {
      chrome.storage.sync
        .set({
          authToken: msg.payload.token,
          user: msg.payload.user,
          isAuthenticated: true,
        })
        .then(async () => {
          await syncDownloadSettingsFromApi(msg.payload.token);
          await syncBrowsingSettingsFromApi(msg.payload.token);
          await connectRemovalSocket(msg.payload.token);
          sendResponse({ ok: true });
        });
    } else if (msg.type === "SETTINGS_SYNC" && msg.payload) {
      persistDownloadSettings(msg.payload).then(async () => {
        const token = await getAuthToken();
        if (token) {
          await syncDownloadSettingsFromApi(token);
        }
        sendResponse({ ok: true });
      });
    } else if (msg.type === "BROWSING_SETTINGS_SYNC" && msg.payload) {
      persistBrowsingSettings(msg.payload).then(async () => {
        const token = await getAuthToken();
        if (token) {
          await syncBrowsingSettingsFromApi(token);
        }
        sendResponse({ ok: true });
      });
    } else if (msg.type === "AUTH_LOGOUT") {
      disconnectRemovalSocket();
      void clearSocketReconnectAlarm();
      sendResponse({ ok: true });
    } else if (msg.type === "BROWSING_INTERACTION" && msg.payload) {
      void recordInteraction(msg.payload.kind);
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false });
    }
    return true;
  },
);

void bootstrapSocketConnection();
void (async () => {
  await finalizeOrphanedSessionOnStartup();
  await ensureBrowsingBatchAlarm();
  await ensureSocketReconnectAlarm();
  await flushBrowsingSessionsQueue();
})();

chrome.runtime.onStartup.addListener(() => {
  void bootstrapSocketConnection();
  void flushBrowsingSessionsQueue();
});

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    await ensureBrowsingBatchAlarm();
    await ensureSocketReconnectAlarm();
    await flushBrowsingSessionsQueue();
  })();
});

async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [AUTH_STORAGE_KEY],
      (result: { authToken?: string }) => {
        resolve(result.authToken ?? null);
      },
    );
  });
}

async function sendToBackend(payload: ApiDownloadPayload): Promise<void> {
  const token = await getAuthToken();
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
    }
  } catch (err) {
    console.error("SurfBud: failed to send download", err);
  }
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest): boolean => {
  void (async () => {
    const filename = extractFilename(item.filename ?? "");
    if (!filename) {
      suggest();
      return;
    }

    const category = inferFileCategory(filename, item.mime);
    const sourceDomain = extractDomain(item.finalUrl ?? item.url ?? "");
    let settings = await getStoredSettings();
    let folderName = getRoutingFolderForCategory(
      settings,
      sourceDomain,
      category,
    );

    // If settings in extension storage are stale, refresh once from API and retry routing.
    if (!folderName && settings.routingEnabled) {
      const token = await getAuthToken();
      if (token) {
        await syncDownloadSettingsFromApi(token);
        settings = await getStoredSettings();
        folderName = getRoutingFolderForCategory(
          settings,
          sourceDomain,
          category,
        );
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
    const category = inferFileCategory(metadata.filename, metadata.mimeType);
    const settings = await getStoredSettings();

    if (!shouldTrackEvent(settings, metadata.sourceDomain)) {
      return;
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
    } else if (alarm.name === SOCKET_RECONNECT_ALARM) {
      await bootstrapSocketConnection();
    }
  })();
});
