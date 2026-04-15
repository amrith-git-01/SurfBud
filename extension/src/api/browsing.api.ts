import { api } from "@/services/api";

const BASE = "/api/browsing";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T>;

export type BrowsingProductivityType = "productive" | "distractive" | "neutral";

export interface UserBrowsingMetricsToday {
  totalActiveTime: number;
  sitesVisited: number;
  topSite: string | null;
  topSiteLabel: string | null;
  topSiteTime: number;
  focusScore: number | null;
  longestSession: number;
  longestSessionStart: string | null;
  longestSessionEnd: string | null;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  topCategorySlug: string | null;
}

export interface UserBrowsingMetricsPeriod {
  totalActiveTime: number;
  sitesVisited: number;
  focusScore: number | null;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  topSite: string | null;
  topSiteLabel: string | null;
  topCategorySlug: string | null;
  longestSession: number;
}

export interface UserBrowsingMetricsPrev {
  todayTotalTime: number;
  todayFocusScore: number | null;
  todaySitesVisited: number;
  todayLongestSession: number;
  todayProductiveTime: number;
  weekTotalTime: number;
  weekFocusScore: number | null;
  monthTotalTime: number;
  monthFocusScore: number | null;
}

export interface UserBrowsingMetrics {
  id: string;
  userId: string;
  todayDate: string;
  weekStart: string;
  monthStart: string;
  today: UserBrowsingMetricsToday;
  week: UserBrowsingMetricsPeriod;
  month: UserBrowsingMetricsPeriod;
  prev: UserBrowsingMetricsPrev;
  updatedAt: string;
}

export interface BrowsingCategoryCatalogItem {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  productivityType: BrowsingProductivityType;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrowsingSessionRow {
  _id: string;
  userId: string;
  sessionId: string;
  domain: string;
  label?: string | null;
  domainLogo?: string | null;
  domainColor?: string | null;
  categorySlug?: string | null;
  productivityType?: BrowsingProductivityType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  interactions: {
    keypresses: number;
    clicks: number;
    scrollEvents: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BrowsingSessionsPagePayload {
  sessions: BrowsingSessionRow[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getBrowsingStats(): Promise<UserBrowsingMetrics | null> {
  const { data } = await api.get<
    ApiResponse<{ metrics: UserBrowsingMetrics | null }>
  >(`${BASE}/stats`);
  return data.data?.metrics ?? null;
}

export async function getBrowsingCategoryCatalog(): Promise<
  BrowsingCategoryCatalogItem[]
> {
  const { data } = await api.get<ApiResponse<BrowsingCategoryCatalogItem[]>>(
    `${BASE}/category-catalog`,
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function getBrowsingRecentSessions(
  limit = 8,
): Promise<BrowsingSessionRow[]> {
  const { data } = await api.get<ApiResponse<BrowsingSessionsPagePayload>>(
    `${BASE}/sessions`,
    { params: { page: 1, limit, sort: "newest" } },
  );
  return data.data?.sessions ?? [];
}
