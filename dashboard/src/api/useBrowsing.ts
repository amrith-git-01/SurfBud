import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  getBrowsingMetrics,
  getBrowsingCategories,
  getBrowsingStatsDaily,
  getBrowsingStatsDomains,
  getBrowsingStatsCategories,
  getBrowsingRecentSessions,
  getBrowsingStatsTimeline,
  type BrowsingStatsDateLimitParams,
  type BrowsingTimelineParams,
} from "./browsing.api";

export const browsingKeys = {
  all: ["browsing"] as const,
  metrics: () => [...browsingKeys.all, "metrics"] as const,
  categories: () => [...browsingKeys.all, "categories"] as const,
  dailyTrend: (period: number) =>
    [...browsingKeys.all, "stats", "daily", period] as const,
  domainStats: (params: BrowsingStatsDateLimitParams) =>
    [...browsingKeys.all, "stats", "domains", params] as const,
  categoryStats: (params: BrowsingStatsDateLimitParams) =>
    [...browsingKeys.all, "stats", "categories", params] as const,
  sessions: (limit: number) =>
    [...browsingKeys.all, "sessions", limit] as const,
  timeline: (params: BrowsingTimelineParams) =>
    [...browsingKeys.all, "stats", "timeline", params] as const,
};

type MetricsResult = Awaited<ReturnType<typeof getBrowsingMetrics>>;
type CategoriesResult = Awaited<ReturnType<typeof getBrowsingCategories>>;
type DailyTrendResult = Awaited<ReturnType<typeof getBrowsingStatsDaily>>;
type DomainStatsResult = Awaited<ReturnType<typeof getBrowsingStatsDomains>>;
type CategoryStatsResult = Awaited<ReturnType<typeof getBrowsingStatsCategories>>;
type SessionsResult = Awaited<ReturnType<typeof getBrowsingRecentSessions>>;
type TimelineResult = Awaited<ReturnType<typeof getBrowsingStatsTimeline>>;

export function useBrowsingMetrics(
  options?: Omit<UseQueryOptions<MetricsResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.metrics(),
    queryFn: getBrowsingMetrics,
    ...options,
  });
}

export function useBrowsingCategories(
  options?: Omit<UseQueryOptions<CategoriesResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.categories(),
    queryFn: getBrowsingCategories,
    ...options,
  });
}

export function useBrowsingDailyTrend(
  period: 7 | 15 | 30 = 7,
  options?: Omit<UseQueryOptions<DailyTrendResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.dailyTrend(period),
    queryFn: () => getBrowsingStatsDaily(period),
    ...options,
  });
}

export function useBrowsingDomainStats(
  params: BrowsingStatsDateLimitParams = {},
  options?: Omit<UseQueryOptions<DomainStatsResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.domainStats(params),
    queryFn: () => getBrowsingStatsDomains(params),
    ...options,
  });
}

export function useBrowsingCategoryStats(
  params: BrowsingStatsDateLimitParams = {},
  options?: Omit<UseQueryOptions<CategoryStatsResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.categoryStats(params),
    queryFn: () => getBrowsingStatsCategories(params),
    ...options,
  });
}

export function useBrowsingRecentSessions(
  limit = 50,
  options?: Omit<UseQueryOptions<SessionsResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.sessions(limit),
    queryFn: () => getBrowsingRecentSessions(limit),
    ...options,
  });
}

export function useBrowsingDailyTimeline(
  params: BrowsingTimelineParams = {},
  options?: Omit<UseQueryOptions<TimelineResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.timeline(params),
    queryFn: () => getBrowsingStatsTimeline(params),
    staleTime: 30_000,
    ...options,
  });
}

export function useInvalidateBrowsing() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: browsingKeys.all });
  };
}
