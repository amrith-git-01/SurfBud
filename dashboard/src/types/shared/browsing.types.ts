// Identical copy from api/src/types/shared/browsing.types.ts
// Keep in sync manually (authoritative source is API)

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

export interface BrowsingSessionBatchPayload {
  sessions: ExtensionSession[];
}
