import type { BrowsingProductivityType } from "../models/browsing-category.model";
export interface BrowsingMetricsSessionSnapshot {
  sessionId: string;
  domain: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  categorySlug: string;
  label: string;
  productivityType: BrowsingProductivityType;
}
export interface BrowsingMetricsJobData {
  userId: string;
  sessions: BrowsingMetricsSessionSnapshot[];
}
