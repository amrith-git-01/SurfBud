/// <reference types="chrome" />

import type {
  ExtensionSession,
  OpenSession,
} from "../types/shared/browsing.types";
import type { BrowsingSettings } from "../types/shared/browsing-settings.types";
import { extractDomain } from "../utils/downloadHelpers";
import { getExtensionApiBase } from "../lib/extension-api-base";
import { getExtensionAuthToken } from "../lib/extension-storage";

const OPEN_SESSION_KEY = "browsingOpenSession";
const CLOSED_SESSIONS_KEY = "browsingClosedSessions";
const BATCH_ALARM_NAME = "browsing-batch-send";
const BROWSING_SETTINGS_STORAGE_KEY = "browsingSettings";

const BATCH_POST_RETRY_DELAYS_MS = [2000, 5000, 12000] as const;
const API_BASE = getExtensionApiBase();

const DEFAULT_BROWSING_SETTINGS: BrowsingSettings = {
  trackingEnabled: true,
  interactionTrackingEnabled: true,
  minSessionDurationSeconds: 10,
  mergeGapSeconds: 30,
  domainRules: [],
};

function readBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return fallback;
}

export function normalizeBrowsingSettings(
  raw: Partial<BrowsingSettings> | null | undefined,
): BrowsingSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_BROWSING_SETTINGS };
  }
  return {
    trackingEnabled: readBool(
      raw.trackingEnabled,
      DEFAULT_BROWSING_SETTINGS.trackingEnabled,
    ),
    interactionTrackingEnabled: readBool(
      raw.interactionTrackingEnabled,
      DEFAULT_BROWSING_SETTINGS.interactionTrackingEnabled,
    ),
    minSessionDurationSeconds:
      typeof raw.minSessionDurationSeconds === "number"
        ? raw.minSessionDurationSeconds
        : DEFAULT_BROWSING_SETTINGS.minSessionDurationSeconds,
    mergeGapSeconds:
      typeof raw.mergeGapSeconds === "number"
        ? raw.mergeGapSeconds
        : DEFAULT_BROWSING_SETTINGS.mergeGapSeconds,
    domainRules: Array.isArray(raw.domainRules)
      ? raw.domainRules
      : DEFAULT_BROWSING_SETTINGS.domainRules,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  settings: BrowsingSettings,
  sourceDomain: string,
): "track" | "dont_track" | null {
  const normalized = normalizeDomain(sourceDomain);
  if (!normalized) return null;

  const rule = settings.domainRules.find(
    (item) => item.domain.toLowerCase() === normalized,
  );
  return rule?.rule ?? null;
}

function shouldTrackBrowsingSession(
  settings: BrowsingSettings,
  sourceDomain: string,
): boolean {
  if (!settings.trackingEnabled) {
    return false;
  }

  const domainRule = getDomainRuleValue(settings, sourceDomain);
  if (domainRule === "dont_track") {
    return false;
  }

  return true;
}

export async function readStoredBrowsingSettings(): Promise<BrowsingSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([BROWSING_SETTINGS_STORAGE_KEY], (result) => {
      const stored = result[BROWSING_SETTINGS_STORAGE_KEY] as
        | Partial<BrowsingSettings>
        | undefined;
      resolve(normalizeBrowsingSettings(stored));
    });
  });
}

// ────────────────────────────
// Storage helpers
// ────────────────────────────

async function getOpenSession(): Promise<OpenSession | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([OPEN_SESSION_KEY], (result) => {
      const session = result[OPEN_SESSION_KEY] as OpenSession | undefined;
      resolve(session);
    });
  });
}

async function setOpenSession(session: OpenSession | undefined): Promise<void> {
  if (!session) {
    await chrome.storage.local.remove(OPEN_SESSION_KEY);
    return;
  }
  await chrome.storage.local.set({
    [OPEN_SESSION_KEY]: session,
  });
}

async function getClosedSessions(): Promise<ExtensionSession[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CLOSED_SESSIONS_KEY], (result) => {
      const sessions =
        (result[CLOSED_SESSIONS_KEY] as ExtensionSession[] | undefined) ?? [];
      resolve(sessions);
    });
  });
}

async function setClosedSessions(sessions: ExtensionSession[]): Promise<void> {
  if (!sessions.length) {
    await chrome.storage.local.remove(CLOSED_SESSIONS_KEY);
    return;
  }
  await chrome.storage.local.set({
    [CLOSED_SESSIONS_KEY]: sessions,
  });
}

// ────────────────────────────
// Core session API
// ────────────────────────────

export async function handleTabBecameActive(
  tabId: number,
  url: string,
): Promise<void> {
  const domain = extractDomain(url);
  if (!domain) {
    await closeCurrentSession();
    return;
  }

  let settings = await readStoredBrowsingSettings();
  if (!shouldTrackBrowsingSession(settings, domain)) {
    // Re-sync from API once in case cached settings are stale.
    const token = await getExtensionAuthToken();
    if (token) {
      try {
        const response = await fetch(`${API_BASE}/browsing/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = (await response.json()) as {
            success?: boolean;
            data?: Partial<
              import("../types/shared/browsing-settings.types").BrowsingSettings
            >;
          };
          if (data.success && data.data) {
            const normalized = normalizeBrowsingSettings(data.data);
            await chrome.storage.sync.set({
              [BROWSING_SETTINGS_STORAGE_KEY]: normalized,
            });
            settings = normalized;
          }
        }
      } catch {
        // keep cached settings on network failure
      }
    }
    if (!shouldTrackBrowsingSession(settings, domain)) {
      await closeCurrentSession();
      return;
    }
  }

  const now = new Date();
  const open = await getOpenSession();

  if (open && open.domain === domain && open.tabId === tabId) {
    return;
  }

  if (open) {
    await closeCurrentSession();
  }

  const closed = await getClosedSessions();
  const last = closed[closed.length - 1];

  if (last && last.domain === domain) {
    const lastEndedAt = new Date(last.endedAt);
    const gapSeconds = (now.getTime() - lastEndedAt.getTime()) / 1000;
    if (gapSeconds < settings.mergeGapSeconds) {
      const reopened: OpenSession = {
        ...last,
        tabId,
      };
      const updatedClosed = closed.slice(0, -1);
      await setClosedSessions(updatedClosed);
      await setOpenSession(reopened);
      return;
    }
  }

  const newSession: OpenSession = {
    sessionId: crypto.randomUUID(),
    domain,
    startedAt: now.toISOString(),
    endedAt: now.toISOString(),
    durationSeconds: 0,
    interactions: {
      keypresses: 0,
      clicks: 0,
      scrollEvents: 0,
    },
    tabId,
  };
  await setOpenSession(newSession);
}

export async function closeCurrentSession(): Promise<void> {
  const settings = await readStoredBrowsingSettings();
  const open = await getOpenSession();
  if (!open) return;
  const now = new Date();
  const startedAt = new Date(open.startedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - startedAt.getTime()) / 1000),
  );
  // Drop very short sessions entirely
  if (durationSeconds < settings.minSessionDurationSeconds) {
    await setOpenSession(undefined);
    return;
  }
  const closed: ExtensionSession = {
    sessionId: open.sessionId,
    domain: open.domain,
    startedAt: open.startedAt,
    endedAt: now.toISOString(),
    durationSeconds,
    interactions: open.interactions,
  };
  const queue = await getClosedSessions();
  const lastClosed = queue[queue.length - 1];
  const isSameMergedSegment =
    lastClosed &&
    lastClosed.sessionId === closed.sessionId &&
    lastClosed.startedAt === closed.startedAt;
  if (isSameMergedSegment) {
    queue[queue.length - 1] = closed;
  } else {
    queue.push(closed);
  }
  await setClosedSessions(queue);
  await setOpenSession(undefined);
}

export async function finalizeOrphanedSessionOnStartup(): Promise<void> {
  const open = await getOpenSession();
  if (!open) return;
  await closeCurrentSession();
}

export type BrowsingInteractionKind = "key" | "click" | "scroll";
export async function recordInteraction(
  kind: BrowsingInteractionKind,
): Promise<void> {
  const settings = await readStoredBrowsingSettings();
  if (!settings.trackingEnabled || !settings.interactionTrackingEnabled) {
    return;
  }

  const open = await getOpenSession();
  if (!open) return;
  const interactions = { ...open.interactions };
  if (kind === "key") interactions.keypresses += 1;
  if (kind === "click") interactions.clicks += 1;
  if (kind === "scroll") interactions.scrollEvents += 1;
  const updated: OpenSession = {
    ...open,
    interactions,
  };
  await setOpenSession(updated);
}

// ────────────────────────────
// Batching
// ────────────────────────────

function getNextHourBoundaryMs(from: Date = new Date()): number {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.getTime();
}

/**
 * (Re)schedules the next batch push for the local top-of-hour boundary
 * (e.g. 12:00, 1:00, 2:00). Same alarm name replaces the previous schedule.
 */
export async function ensureBrowsingBatchAlarm(): Promise<void> {
  const when = getNextHourBoundaryMs();
  await chrome.alarms.create(BATCH_ALARM_NAME, {
    when,
  });
}

/**
 * POST queued browsing sessions; clears queue only on success.
 * Retries a few times so transient API/network blips do not wait a full hour.
 */
export async function flushBrowsingSessionsQueue(): Promise<void> {
  const sessions = await getClosedSessions();
  if (!sessions.length) return;
  const token = await getExtensionAuthToken();
  if (!token) return;

  const maxAttempts = BATCH_POST_RETRY_DELAYS_MS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/browsing/sessions/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessions }),
      });

      if (response.ok) {
        await setClosedSessions([]);
        return;
      }

      if (response.status < 500) {
        return;
      }
    } catch {
      /* network error — retry */
    }

    const delay = BATCH_POST_RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) {
      await sleep(delay);
    }
  }
}

export async function handleAlarm(alarmName: string): Promise<void> {
  if (alarmName !== BATCH_ALARM_NAME) return;
  await ensureBrowsingBatchAlarm();
  await flushBrowsingSessionsQueue();
}
export function getBrowsingBatchAlarmName(): string {
  return BATCH_ALARM_NAME;
}
