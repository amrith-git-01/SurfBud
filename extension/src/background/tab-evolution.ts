/// <reference types="chrome" />

import { PRODUCTIVITY_TAB_GROUP_OPEN_STATE_KEY } from "../constants/productivity-storage";
import { getExtensionApiBase } from "../lib/extension-api-base";
import { readStoredProductivityUserSettings } from "../lib/extension-productivity-user-settings";
import { readStoredBrowsingSettings } from "./browsingSession";
import {
  hostMatchesBrowsingTrackRules,
  hostMatchesLaunchUrlHosts,
  launchUrlsToHostSet,
} from "../utils/tabEvolutionAllowedHosts";

const PENDING_STORAGE_KEY = "tabEvolutionPending";
const DEBOUNCE_MS = 400;

interface ProductivityTrackedWindowsPayload {
  tabGroupIds: string[];
  streakIds: string[];
  updatedAt: string;
}

interface TrackedWindowEntry {
  tabGroupId: string;
  lastSnapshot: string[];
  initialTabIds: Set<number>;
  allowedHosts: Set<string>;
  persistEvolution: boolean;
}

const trackedByWindow = new Map<number, TrackedWindowEntry>();
const debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

interface PendingEvolution {
  tabGroupId: string;
  urls: string[];
  at: string;
}

function normalizePendingItem(raw: unknown): PendingEvolution | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const urls = Array.isArray(o.urls) ? (o.urls as string[]) : [];
  const at = typeof o.at === "string" ? o.at : new Date().toISOString();
  if (typeof o.entityType === "string" && typeof o.entityId === "string") {
    if (o.entityType !== "tabGroup" || !o.entityId.trim()) {
      return null;
    }
    return {
      tabGroupId: o.entityId.trim(),
      urls,
      at,
    };
  }
  if (typeof o.tabGroupId === "string" && o.tabGroupId.trim()) {
    return {
      tabGroupId: o.tabGroupId.trim(),
      urls,
      at,
    };
  }
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function tabToUrl(tab: chrome.tabs.Tab): string | null {
  const raw = tab.url ?? tab.pendingUrl ?? "";
  const trimmed = raw.trim();
  if (!isHttpUrl(trimmed)) {
    return null;
  }
  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

async function collectWindowTabUrlsForEvolution(
  windowId: number,
  initialTabIds: Set<number>,
  includeAllNewTabsInGroup: boolean,
  allowedHosts: Set<string>,
): Promise<string[]> {
  const browsingSettings = await readStoredBrowsingSettings();
  const tabs = await chrome.tabs.query({ windowId });
  const ordered = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const tab of ordered) {
    const isInitial = tab.id !== undefined && initialTabIds.has(tab.id);
    const u = tabToUrl(tab);
    if (!u) continue;

    if (!isInitial) {
      const matchesAllowlist =
        hostMatchesLaunchUrlHosts(u, allowedHosts) ||
        hostMatchesBrowsingTrackRules(u, browsingSettings);
      if (!matchesAllowlist && !includeAllNewTabsInGroup) {
        continue;
      }
    }

    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(u);
  }
  return urls;
}

async function refreshWindowSnapshot(windowId: number): Promise<void> {
  const entry = trackedByWindow.get(windowId);
  if (!entry) {
    return;
  }
  const settings = await readStoredProductivityUserSettings();
  entry.lastSnapshot = await collectWindowTabUrlsForEvolution(
    windowId,
    entry.initialTabIds,
    settings.trackNewTabsInTabGroupEnabled,
    entry.allowedHosts,
  );
}

export function getOpenTabGroupIds(): string[] {
  return [...new Set([...trackedByWindow.values()].map((e) => e.tabGroupId))];
}

export function getOpenStreakIds(): string[] {
  return [];
}

export async function writeTabGroupOpenStateToSession(): Promise<void> {
  const payload: ProductivityTrackedWindowsPayload = {
    tabGroupIds: getOpenTabGroupIds(),
    streakIds: [],
    updatedAt: new Date().toISOString(),
  };
  await chrome.storage.session.set({
    [PRODUCTIVITY_TAB_GROUP_OPEN_STATE_KEY]: payload,
  });
}

export async function focusTrackedTabGroupWindowIfExists(
  tabGroupId: string,
): Promise<boolean> {
  const id = tabGroupId.trim();
  if (!id) {
    return false;
  }

  for (const [windowId, entry] of trackedByWindow) {
    if (entry.tabGroupId !== id) {
      continue;
    }
    try {
      await chrome.windows.get(windowId);
    } catch {
      trackedByWindow.delete(windowId);
      const t = debounceTimers.get(windowId);
      if (t) {
        clearTimeout(t);
        debounceTimers.delete(windowId);
      }
      await writeTabGroupOpenStateToSession();
      continue;
    }
    await chrome.windows.update(windowId, { focused: true });
    return true;
  }
  return false;
}

export function clearTabGroupTrackingState(): void {
  trackedByWindow.clear();
  for (const t of debounceTimers.values()) {
    clearTimeout(t);
  }
  debounceTimers.clear();
  void chrome.storage.session.remove(PRODUCTIVITY_TAB_GROUP_OPEN_STATE_KEY);
}

export async function pruneStaleTrackedWindows(): Promise<void> {
  const windows = await chrome.windows.getAll();
  const valid = new Set(
    windows.map((w) => w.id).filter((x): x is number => typeof x === "number"),
  );

  let changed = false;
  for (const wid of [...trackedByWindow.keys()]) {
    if (!valid.has(wid)) {
      trackedByWindow.delete(wid);
      const t = debounceTimers.get(wid);
      if (t) {
        clearTimeout(t);
        debounceTimers.delete(wid);
      }
      changed = true;
    }
  }
  if (changed) {
    await writeTabGroupOpenStateToSession();
  }
}

function scheduleRefresh(windowId: number): void {
  const prev = debounceTimers.get(windowId);
  if (prev) {
    clearTimeout(prev);
  }
  debounceTimers.set(
    windowId,
    setTimeout(() => {
      debounceTimers.delete(windowId);
      void refreshWindowSnapshot(windowId);
    }, DEBOUNCE_MS),
  );
}

async function postEvolution(
  token: string,
  tabGroupId: string,
  urls: string[],
): Promise<boolean> {
  const segment = `tab-groups/${encodeURIComponent(tabGroupId)}/tab-evolution`;
  const response = await fetch(
    `${getExtensionApiBase()}/productivity/${segment}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    },
  );
  return response.ok;
}

async function queuePendingEvolution(
  tabGroupId: string,
  urls: string[],
): Promise<void> {
  const stored = await chrome.storage.local.get(PENDING_STORAGE_KEY);
  const rawList = Array.isArray(stored[PENDING_STORAGE_KEY])
    ? (stored[PENDING_STORAGE_KEY] as unknown[])
    : [];
  const list: PendingEvolution[] = rawList
    .map((item) => normalizePendingItem(item))
    .filter((x): x is PendingEvolution => x !== null);
  list.push({
    tabGroupId,
    urls,
    at: new Date().toISOString(),
  });
  await chrome.storage.local.set({
    [PENDING_STORAGE_KEY]: list.slice(-25),
  });
}

export async function flushTabEvolutionPendingQueue(
  getToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getToken();
  if (!token) {
    return;
  }

  const stored = await chrome.storage.local.get(PENDING_STORAGE_KEY);
  const rawList = Array.isArray(stored[PENDING_STORAGE_KEY])
    ? (stored[PENDING_STORAGE_KEY] as unknown[])
    : [];
  const list: PendingEvolution[] = rawList
    .map((item) => normalizePendingItem(item))
    .filter((x): x is PendingEvolution => x !== null);
  if (list.length === 0) {
    return;
  }

  const remaining: PendingEvolution[] = [];
  for (const item of list) {
    const ok = await postEvolution(token, item.tabGroupId, item.urls);
    if (!ok) {
      remaining.push(item);
    }
  }
  await chrome.storage.local.set({ [PENDING_STORAGE_KEY]: remaining });
}

async function persistSnapshot(
  tabGroupId: string,
  urls: string[],
  getToken: () => Promise<string | null>,
): Promise<void> {
  if (urls.length === 0) {
    return;
  }
  const token = await getToken();
  if (!token) {
    await queuePendingEvolution(tabGroupId, urls);
    return;
  }
  const ok = await postEvolution(token, tabGroupId, urls);
  if (!ok) {
    await queuePendingEvolution(tabGroupId, urls);
  }
}

let listenersInstalled = false;

export function ensureTabEvolutionListeners(
  getToken: () => Promise<string | null>,
): void {
  if (listenersInstalled) {
    return;
  }
  listenersInstalled = true;

  chrome.windows.onRemoved.addListener((windowId) => {
    const entry = trackedByWindow.get(windowId);
    if (!entry) {
      return;
    }
    trackedByWindow.delete(windowId);
    const t = debounceTimers.get(windowId);
    if (t) {
      clearTimeout(t);
      debounceTimers.delete(windowId);
    }
    void (async () => {
      await writeTabGroupOpenStateToSession();
      const settings = await readStoredProductivityUserSettings();
      if (!entry.persistEvolution || !settings.tabEvolutionEnabled) {
        return;
      }
      let urls = entry.lastSnapshot;
      const fresh = await collectWindowTabUrlsForEvolution(
        windowId,
        entry.initialTabIds,
        settings.trackNewTabsInTabGroupEnabled,
        entry.allowedHosts,
      );
      if (fresh.length > 0) {
        urls = fresh;
      }
      await persistSnapshot(entry.tabGroupId, urls, getToken);
    })();
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (tab.windowId === undefined) {
      return;
    }
    if (!trackedByWindow.has(tab.windowId)) {
      return;
    }
    if (
      changeInfo.status === "loading" ||
      changeInfo.url !== undefined ||
      changeInfo.title !== undefined
    ) {
      scheduleRefresh(tab.windowId);
    }
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.windowId === undefined) {
      return;
    }
    if (trackedByWindow.has(tab.windowId)) {
      scheduleRefresh(tab.windowId);
    }
  });

  chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
    if (trackedByWindow.has(removeInfo.windowId)) {
      scheduleRefresh(removeInfo.windowId);
    }
  });

  chrome.tabs.onMoved.addListener((_tabId, moveInfo) => {
    if (trackedByWindow.has(moveInfo.windowId)) {
      scheduleRefresh(moveInfo.windowId);
    }
  });

  chrome.tabs.onDetached.addListener((_tabId, detachInfo) => {
    if (trackedByWindow.has(detachInfo.oldWindowId)) {
      scheduleRefresh(detachInfo.oldWindowId);
    }
  });

  chrome.tabs.onAttached.addListener((_tabId, attachInfo) => {
    if (trackedByWindow.has(attachInfo.newWindowId)) {
      scheduleRefresh(attachInfo.newWindowId);
    }
  });
}

export async function startTabEvolutionSession(
  windowId: number | undefined,
  tabGroupId: string,
  getToken: () => Promise<string | null>,
  launchUrls: string[] = [],
): Promise<void> {
  ensureTabEvolutionListeners(getToken);
  const id = tabGroupId.trim();
  if (!id || windowId === undefined) {
    return;
  }
  const tabsAtOpen = await chrome.tabs.query({ windowId });
  const initialTabIds = new Set(
    tabsAtOpen
      .map((t) => t.id)
      .filter((x): x is number => typeof x === "number"),
  );
  const allowedHosts = launchUrlsToHostSet(launchUrls);
  const settings = await readStoredProductivityUserSettings();
  const snapshot = await collectWindowTabUrlsForEvolution(
    windowId,
    initialTabIds,
    settings.trackNewTabsInTabGroupEnabled,
    allowedHosts,
  );
  trackedByWindow.set(windowId, {
    tabGroupId: id,
    lastSnapshot: snapshot,
    initialTabIds,
    allowedHosts,
    persistEvolution: true,
  });
  await writeTabGroupOpenStateToSession();
}
