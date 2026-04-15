import { api } from "../services/api";

const BASE = "/api/downloads";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T>;

// ─── Stats (Section 1 — metric cards, Section 3 — health bars) ───
export interface UserDownloadMetrics {
  todayCount: number;
  todayDate: string;
  prevTodayCount: number;
  weekCount: number;
  weekStart: string;
  prevWeekCount: number;
  monthCount: number;
  monthStart: string;
  prevMonthCount: number;
  totalNew: number;
  totalDuplicates: number;
  totalSize: number;
  newSize: number;
  duplicateSize: number;
  updatedAt: string;
}

// ─── Trend (Section 2 — activity chart) ───
export interface TrendBucket {
  date: string;
  total: number;
  newFiles: number;
  duplicates: number;
}

// ─── File populate shape (recent/events have fileId populated) ───
export interface FilePopulate {
  _id: string;
  fileCategory?: string;
  fileExtension?: string;
  mimeType?: string;
  size?: number;
}

export interface DownloadEvent {
  _id: string;
  userId: string;
  fileId: string | FilePopulate;
  filename: string;
  savedPath?: string;
  sourceDomain?: string;
  status: "new" | "duplicate";
  duration?: number;
  isRemoved: boolean;
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventsResponse {
  events: DownloadEvent[];
  total: number;
}

// ─── Section 5 — duplicate groups ───
export interface DuplicateGroup {
  fileId?: string;
  filename: string;
  dupCount: number;
  totalSize: number;
}

// ─── Section 6 — categories & domains ───
export interface CategoryStat {
  category: string;
  totalCount: number;
  newCount: number;
  dupCount: number;
  totalSize: number;
  newSize: number;
  dupSize: number;
}

export interface DomainStat {
  domain: string;
  totalCount: number;
  newCount: number;
  dupCount: number;
  totalSize: number;
  newSize: number;
  dupSize: number;
}

export type DownloadStatsPeriod = "today" | "week" | "month" | "all";

export const DOWNLOAD_STATS_PERIOD_OPTIONS: {
  value: DownloadStatsPeriod;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

export interface DownloadStatsDateLimitParams {
  period?: DownloadStatsPeriod;
  date?: string;
  limit?: number;
}

// ─── Drawer — file detail ───
export interface FileDetail {
  _id: string;
  userId: string;
  hash: string;
  filename: string;
  url: string;
  savedPath?: string;
  size?: number;
  fileExtension?: string;
  fileCategory?: string;
  mimeType?: string;
  sourceDomain?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventsQueryParams {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  period?: "today" | "week" | "month" | "all";
  status?: "new" | "duplicate";
  isRemoved?: boolean;
  category?: string;
  domain?: string;
  excludeDomains?: string[];
  search?: string;
  date?: string;
}

const DEFAULT_EVENTS_PARAMS = { page: 1, limit: 10 } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Download Configuration Models (new)
// ─────────────────────────────────────────────────────────────────────────────

export type FileCategory =
  | "document"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "image"
  | "text"
  | "executable"
  | "other";

export interface RoutingFolder {
  _id: string;
  folderName: string;
  category: FileCategory | null;
}

export interface DownloadSettings {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  routingEnabled: boolean;
  routingFolders: RoutingFolder[];
}

export interface UpdateDownloadSettingsInput {
  trackingEnabled?: boolean;
  autoRemoveEnabled?: boolean;
  routingEnabled?: boolean;
}

export interface CreateRoutingFolderInput {
  folderName: string;
}

export interface UpdateRoutingFolderInput {
  folderName?: string;
  category?: FileCategory | null;
}

// ─── API functions ───

export async function getDownloadStats(): Promise<UserDownloadMetrics | null> {
  const { data } = await api.get<
    ApiResponse<{ metrics: UserDownloadMetrics | null }>
  >(`${BASE}/stats`);
  return data.data?.metrics ?? null;
}

export async function getDownloadTrend(
  period: 7 | 15 | 30 = 7,
): Promise<TrendBucket[]> {
  const { data } = await api.get<ApiResponse<{ trend: TrendBucket[] }>>(
    `${BASE}/trend`,
    { params: { period } },
  );
  return data.data?.trend ?? [];
}

export async function getRecentEvents(): Promise<DownloadEvent[]> {
  const { data } = await api.get<ApiResponse<EventsResponse>>(
    `${BASE}/events`,
    {
      params: {
        page: 1,
        limit: 10,
        sort: "newest",
      },
    },
  );
  return data.data?.events ?? [];
}

export async function getEvents(
  params: EventsQueryParams = {},
): Promise<EventsResponse> {
  const { data } = await api.get<ApiResponse<EventsResponse>>(
    `${BASE}/events`,
    {
      params: { ...DEFAULT_EVENTS_PARAMS, ...params },
    },
  );
  return data.data ?? { events: [], total: 0 };
}

export async function getDuplicateGroups(): Promise<DuplicateGroup[]> {
  const { data } = await api.get<ApiResponse<{ groups: DuplicateGroup[] }>>(
    `${BASE}/duplicate-groups`,
  );
  return data.data?.groups ?? [];
}

export async function getCategories(
  params: DownloadStatsDateLimitParams = { period: "today" },
): Promise<CategoryStat[]> {
  const { data } = await api.get<ApiResponse<{ categories: CategoryStat[] }>>(
    `${BASE}/categories`,
    { params },
  );
  return data.data?.categories ?? [];
}

export async function getDomains(
  params: DownloadStatsDateLimitParams = { period: "today" },
): Promise<DomainStat[]> {
  const { data } = await api.get<ApiResponse<{ domains: DomainStat[] }>>(
    `${BASE}/domains`,
    { params },
  );
  return data.data?.domains ?? [];
}

export async function getFileById(fileId: string): Promise<FileDetail | null> {
  const { data } = await api.get<ApiResponse<{ file: FileDetail | null }>>(
    `${BASE}/files/${fileId}`,
  );
  return data.data?.file ?? null;
}

export async function getFileTimeline(
  fileId: string,
): Promise<DownloadEvent[]> {
  const { data } = await api.get<ApiResponse<{ events: DownloadEvent[] }>>(
    `${BASE}/files/${fileId}/timeline`,
  );
  return data.data?.events ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Download Configuration API (new)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDownloadSettings(): Promise<DownloadSettings> {
  const { data } = await api.get<ApiResponse<DownloadSettings>>(
    `${BASE}/settings`,
  );
  return data.data;
}

export async function updateDownloadSettings(
  payload: UpdateDownloadSettingsInput,
): Promise<DownloadSettings> {
  const { data } = await api.patch<ApiResponse<DownloadSettings>>(
    `${BASE}/settings`,
    payload,
  );
  return data.data;
}

export async function getRoutingFolders(): Promise<RoutingFolder[]> {
  const { data } = await api.get<
    ApiResponse<{ routingFolders: RoutingFolder[] }>
  >(`${BASE}/settings/routing/folders`);
  return data.data.routingFolders ?? [];
}

export async function createRoutingFolder(
  payload: CreateRoutingFolderInput,
): Promise<DownloadSettings> {
  const { data } = await api.post<ApiResponse<DownloadSettings>>(
    `${BASE}/settings/routing/folders`,
    payload,
  );
  return data.data;
}

export async function updateRoutingFolder(
  id: string,
  payload: UpdateRoutingFolderInput,
): Promise<DownloadSettings> {
  const { data } = await api.patch<ApiResponse<DownloadSettings>>(
    `${BASE}/settings/routing/folders/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteRoutingFolder(
  id: string,
): Promise<DownloadSettings> {
  const { data } = await api.delete<ApiResponse<DownloadSettings>>(
    `${BASE}/settings/routing/folders/${id}`,
  );
  return data.data;
}

export async function cancelRemoval(hash: string): Promise<boolean> {
  const { data } = await api.delete<ApiResponse<{ cancelled: boolean }>>(
    `${BASE}/removal/${hash}`,
  );
  return data.data.cancelled;
}
