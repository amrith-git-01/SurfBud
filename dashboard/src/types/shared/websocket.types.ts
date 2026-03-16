// Identical copy from api/src/types/shared/websocket.types.ts
// Keep in sync manually (authoritative source is API)

/** Events sent from backend to dashboard/extension */
export type ServerEvent =
  | 'dashboard:download:new'
  | 'dashboard:download:updated'
  | 'dashboard:download:deleted'
  | 'dashboard:metrics:delta'
  | 'dashboard:connection:ack';

/** Event payloads */
export interface DownloadNewPayload {
  id: string;
  filename: string;
  size: number;
  category: string;
  status: 'new' | 'duplicate';
  sourceDomain: string;
  downloadedAt: string;
}

export interface DownloadUpdatedPayload {
  id: string;
  removed: boolean;
}

export interface DownloadDeletedPayload {
  id: string;
}

export interface MetricsDeltaPayload {
  todayCount?: number;
  weekCount?: number;
  monthCount?: number;
  totalNew?: number;
  totalDuplicates?: number;
  totalSize?: number;
}

export interface ConnectionAckPayload {
  userId: string;
  timestamp: string;
}

/** Type-safe event map */
export interface ServerToClientEvents {
  'dashboard:download:new': (data: DownloadNewPayload) => void;
  'dashboard:download:updated': (data: DownloadUpdatedPayload) => void;
  'dashboard:download:deleted': (data: DownloadDeletedPayload) => void;
  'dashboard:metrics:delta': (data: MetricsDeltaPayload) => void;
  'dashboard:connection:ack': (data: ConnectionAckPayload) => void;
}

export interface ClientToServerEvents {
  // Future: dashboard → backend events can go here
}