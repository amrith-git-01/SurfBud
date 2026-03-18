/// <reference types="chrome" />

import type {
  ExtensionSession,
  OpenSession,
} from "../types/shared/browsing.types";
import { extractDomain } from "../utils/downloadHelpers";

const OPEN_SESSION_KEY = "browsingOpenSession";
const CLOSED_SESSIONS_KEY = "browsingClosedSessions";
const BATCH_ALARM_NAME = "browsing-batch-send";

const MIN_DURATION_SECONDS = 10;
const MERGE_GAP_SECONDS = 30;
const BATCH_INTERVAL_MINUTES = 60;

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
    if (gapSeconds < MERGE_GAP_SECONDS) {
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
  const open = await getOpenSession();
  if (!open) return;
  const now = new Date();
  const startedAt = new Date(open.startedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - startedAt.getTime()) / 1000),
  );
  // Drop very short sessions entirely
  if (durationSeconds < MIN_DURATION_SECONDS) {
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
export async function ensureBrowsingBatchAlarm(): Promise<void> {
  const alarm = await chrome.alarms.get(BATCH_ALARM_NAME);
  if (!alarm) {
    await chrome.alarms.create(BATCH_ALARM_NAME, {
      periodInMinutes: BATCH_INTERVAL_MINUTES,
    });
  }
}
export async function handleAlarm(alarmName: string): Promise<void> {
  if (alarmName !== BATCH_ALARM_NAME) return;
  const sessions = await getClosedSessions();
  if (!sessions.length) return;
  // TODO: replace this with real API call when backend is ready.
  // For now, just log and clear to verify behaviour.
  console.info("[SurfBud] Flushing browsing sessions batch", sessions);
  await setClosedSessions([]);
}
export function getBrowsingBatchAlarmName(): string {
  return BATCH_ALARM_NAME;
}
