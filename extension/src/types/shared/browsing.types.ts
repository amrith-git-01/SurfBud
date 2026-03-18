export interface BrowsingInteractions {
  keypresses: number;
  clicks: number;
  scrollEvents: number;
}

export interface ExtensionSession {
  sessionId: string;
  domain: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  interactions: BrowsingInteractions;
}

export interface OpenSession extends ExtensionSession {
  tabId: number;
}

export interface StoredBrowsingState {
  openSession?: OpenSession;
  closedSessions: ExtensionSession[];
}

/** API batch ingest body — keep in sync with api/src/types/shared/browsing.types.ts */
export interface BrowsingSessionBatchPayload {
  sessions: ExtensionSession[];
}
