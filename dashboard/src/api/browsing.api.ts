import { api } from "../services/api";
import type {
  BrowsingDomainRule,
  BrowsingRuleValue,
  BrowsingSettings,
} from "../types/shared/browsing-settings.types";

const BASE = "/api/browsing";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T>;

// ─── Serialized UserBrowsingMetrics (matches API serializeUserBrowsingMetrics) ───

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
  contextSwitches: number;
  deepFocusSessions: number;
  sessionCount: number;
  scatteredPeriods: number;
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
  todayContextSwitches: number;
  todaySessionCount: number;
  todayDeepFocusSessions: number;
  todayScatteredPeriods: number;
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

export interface BrowsingDailyTrendBucket {
  date: string;
  totalActiveTime: number;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  focusScore: number | null;
  sitesVisited: number;
}

export interface BrowsingDomainStatRow {
  _id: string;
  userId: string;
  date: string;
  timezone: string;
  domain: string;
  label: string;
  categorySlug: string;
  productivityType: BrowsingProductivityType;
  totalActiveTime: number;
  visitCount: number;
  longestSession: number;
  createdAt: string;
  updatedAt: string;
  /** From DomainClassification when enriched via Brandfetch. */
  domainLogo?: string | null;
  domainColor?: string | null;
}

export interface BrowsingCategoryBreakdownRow {
  categorySlug: string;
  name: string;
  icon: string;
  color: string;
  productivityType: BrowsingProductivityType;
  totalActiveTime: number;
  sitesVisited: number;
  topDomain: string | null;
  topDomainLabel: string | null;
  topDomainTime: number;
  percentage: number;
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
  /** From DomainClassification.label when available (may match domain while pending). */
  label?: string | null;
  /** From DomainClassification when enriched via Brandfetch. */
  domainLogo?: string | null;
  domainColor?: string | null;
  /** From DomainClassification — for category icon/color fallback in the UI. */
  categorySlug?: string | null;
  /** Resolved server-side from BrowsingCategory via categorySlug. */
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

export interface BrowsingDrawerSessionsParams {
  page: number;
  limit: number;
  period?: BrowsingStatsPeriod;
  date?: string;
  from?: string;
  to?: string;
  domain?: string;
  excludeDomains?: string[];
  categorySlug?: string;
  productivityType?: BrowsingProductivityType;
  sort?: "newest" | "oldest" | "longest";
}

export interface BrowsingTimelineBlock {
  index: number;
  startIso: string;
  endIso: string;
  productivity: BrowsingProductivityType | "empty";
  totalSeconds: number;
  domains: { domain: string; seconds: number }[];
}

export interface BrowsingTimelinePayload {
  date: string;
  timezone: string;
  blocks: BrowsingTimelineBlock[];
}

export type BrowsingStatsPeriod = "today" | "week" | "month" | "all";

export const BROWSING_STATS_PERIOD_OPTIONS: {
  value: BrowsingStatsPeriod;
  label: string;
}[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "all", label: "All time" },
  ];

export interface BrowsingStatsDateLimitParams {
  /** Defaults to `today` on the server when omitted. */
  period?: BrowsingStatsPeriod;
  date?: string;
  limit?: number;
}

// ─── API functions ───

export async function getBrowsingStats(): Promise<UserBrowsingMetrics | null> {
  const { data } = await api.get<
    ApiResponse<{ metrics: UserBrowsingMetrics | null }>
  >(`${BASE}/stats`);
  return data.data?.metrics ?? null;
}

/** Backend returns `data: categories[]` (array), not `{ categories }`. */
export async function getBrowsingCategoryCatalog(): Promise<
  BrowsingCategoryCatalogItem[]
> {
  const { data } = await api.get<ApiResponse<BrowsingCategoryCatalogItem[]>>(
    `${BASE}/category-catalog`,
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function getBrowsingTrend(
  period: 7 | 15 | 30 = 7,
): Promise<BrowsingDailyTrendBucket[]> {
  const { data } = await api.get<
    ApiResponse<{ trend: BrowsingDailyTrendBucket[] }>
  >(`${BASE}/trend`, { params: { period: String(period) } });
  return data.data?.trend ?? [];
}

export interface BrowsingDomainStatsPayload {
  domains: BrowsingDomainStatRow[];
  /** Sum of active seconds in the selected period (same filter as `domains`). */
  totalActiveTime: number;
}

export async function getBrowsingStatsDomains(
  params: BrowsingStatsDateLimitParams = { period: "today" },
): Promise<BrowsingDomainStatsPayload> {
  const { data } = await api.get<ApiResponse<BrowsingDomainStatsPayload>>(
    `${BASE}/domains`,
    { params },
  );
  return {
    domains: data.data?.domains ?? [],
    totalActiveTime: data.data?.totalActiveTime ?? 0,
  };
}

export async function getBrowsingStatsCategories(
  params: BrowsingStatsDateLimitParams = { period: "today" },
): Promise<BrowsingCategoryBreakdownRow[]> {
  const { data } = await api.get<
    ApiResponse<{ categories: BrowsingCategoryBreakdownRow[] }>
  >(`${BASE}/categories`, { params });
  return data.data?.categories ?? [];
}

export async function getBrowsingRecentSessions(
  limit = 10,
): Promise<BrowsingSessionRow[]> {
  const { data } = await api.get<ApiResponse<BrowsingSessionsPagePayload>>(
    `${BASE}/sessions`,
    { params: { page: 1, limit, sort: "newest" } },
  );
  return data.data?.sessions ?? [];
}

export async function getFilteredSessions(
  params: BrowsingDrawerSessionsParams,
): Promise<BrowsingSessionsPagePayload> {
  const { data } = await api.get<ApiResponse<BrowsingSessionsPagePayload>>(
    `${BASE}/sessions`,
    { params },
  );
  return (
    data.data ?? {
      sessions: [],
      total: 0,
      page: 1,
      totalPages: 0,
    }
  );
}

export interface BrowsingTimelineParams {
  date?: string;
}

export async function getBrowsingStatsTimeline(
  params: BrowsingTimelineParams = {},
): Promise<BrowsingTimelinePayload> {
  const { data } = await api.get<ApiResponse<BrowsingTimelinePayload>>(
    `${BASE}/stats/timeline`,
    { params },
  );
  return {
    date: data.data?.date ?? "",
    timezone: data.data?.timezone ?? "UTC",
    blocks: data.data?.blocks ?? [],
  };
}

export interface UpdateBrowsingSettingsInput {
  trackingEnabled?: boolean;
  interactionTrackingEnabled?: boolean;
  minSessionDurationSeconds?: number;
  mergeGapSeconds?: number;
}

export interface CreateBrowsingDomainRuleInput {
  domain: string;
  rule: BrowsingRuleValue;
}

export interface UpdateBrowsingDomainRuleInput {
  rule: BrowsingRuleValue;
}

export async function getBrowsingSettings(): Promise<BrowsingSettings> {
  const { data } = await api.get<ApiResponse<BrowsingSettings>>(
    `${BASE}/settings`,
  );
  return data.data;
}

export async function updateBrowsingSettings(
  payload: UpdateBrowsingSettingsInput,
): Promise<BrowsingSettings> {
  const { data } = await api.patch<ApiResponse<BrowsingSettings>>(
    `${BASE}/settings`,
    payload,
  );
  return data.data;
}

export async function getBrowsingDomainRules(): Promise<BrowsingDomainRule[]> {
  const { data } = await api.get<
    ApiResponse<{ domainRules: BrowsingDomainRule[] }>
  >(`${BASE}/settings/rules/domains`);
  return data.data.domainRules ?? [];
}

export async function createBrowsingDomainRule(
  payload: CreateBrowsingDomainRuleInput,
): Promise<BrowsingSettings> {
  const { data } = await api.post<ApiResponse<BrowsingSettings>>(
    `${BASE}/settings/rules/domains`,
    payload,
  );
  return data.data;
}

export async function updateBrowsingDomainRule(
  id: string,
  payload: UpdateBrowsingDomainRuleInput,
): Promise<BrowsingSettings> {
  const { data } = await api.patch<ApiResponse<BrowsingSettings>>(
    `${BASE}/settings/rules/domains/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteBrowsingDomainRule(
  id: string,
): Promise<BrowsingSettings> {
  const { data } = await api.delete<ApiResponse<BrowsingSettings>>(
    `${BASE}/settings/rules/domains/${id}`,
  );
  return data.data;
}
