export interface DownloadNewPayload {
  id: string;
  filename: string;
  size: number;
  category: string;
  status: "new" | "duplicate";
  sourceDomain: string;
  downloadedAt: string;
}

export interface DownloadUpdatedPayload {
  id: string;
  removed: boolean;
  filename?: string;
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

export interface RemoveFilePayload {
  type: "remove:file";
  savedPath: string;
  hash: string;
}

export interface TabGroupsUpdatedPayload {
  userId: string;
  updatedAt: string;
}

export interface BrowsingSessionsSyncedPayload {
  sessionCount: number;
  syncedAt: string;
}
