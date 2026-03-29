import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  createBrowsingDomainRule,
  deleteBrowsingDomainRule,
  getBrowsingStats,
  getBrowsingSettings,
  getBrowsingCategoryCatalog,
  getBrowsingDomainRules,
  getBrowsingTrend,
  getBrowsingStatsDomains,
  getBrowsingStatsCategories,
  getBrowsingRecentSessions,
  getBrowsingStatsTimeline,
  updateBrowsingDomainRule,
  updateBrowsingSettings,
  type CreateBrowsingDomainRuleInput,
  type BrowsingStatsDateLimitParams,
  type BrowsingTimelineParams,
  type UpdateBrowsingDomainRuleInput,
  type UpdateBrowsingSettingsInput,
} from "./browsing.api";

export const browsingKeys = {
  all: ["browsing"] as const,
  stats: () => [...browsingKeys.all, "stats"] as const,
  categories: () => [...browsingKeys.all, "categories"] as const,
  trend: (period: number) => [...browsingKeys.all, "trend", period] as const,
  domainStats: (params: BrowsingStatsDateLimitParams) =>
    [...browsingKeys.all, "stats", "domains", params] as const,
  categoryStats: (params: BrowsingStatsDateLimitParams) =>
    [...browsingKeys.all, "stats", "categories", params] as const,
  sessions: (limit: number) =>
    [...browsingKeys.all, "sessions", limit] as const,
  timeline: (params: BrowsingTimelineParams) =>
    [...browsingKeys.all, "stats", "timeline", params] as const,
  settings: () => [...browsingKeys.all, "settings"] as const,
  domainRules: () => [...browsingKeys.all, "settings", "domain-rules"] as const,
};

type MetricsResult = Awaited<ReturnType<typeof getBrowsingStats>>;
type CategoriesResult = Awaited<ReturnType<typeof getBrowsingCategoryCatalog>>;
type TrendResult = Awaited<ReturnType<typeof getBrowsingTrend>>;
type DomainStatsResult = Awaited<ReturnType<typeof getBrowsingStatsDomains>>;
type CategoryStatsResult = Awaited<
  ReturnType<typeof getBrowsingStatsCategories>
>;
type SessionsResult = Awaited<ReturnType<typeof getBrowsingRecentSessions>>;
type TimelineResult = Awaited<ReturnType<typeof getBrowsingStatsTimeline>>;
type BrowsingSettingsResult = Awaited<ReturnType<typeof getBrowsingSettings>>;
type BrowsingDomainRulesResult = Awaited<ReturnType<typeof getBrowsingDomainRules>>;

export function useBrowsingStats(
  options?: Omit<UseQueryOptions<MetricsResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.stats(),
    queryFn: getBrowsingStats,
    ...options,
  });
}

export function useBrowsingCategories(
  options?: Omit<UseQueryOptions<CategoriesResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.categories(),
    queryFn: getBrowsingCategoryCatalog,
    ...options,
  });
}

export function useBrowsingTrend(
  period: 7 | 15 | 30 = 7,
  options?: Omit<UseQueryOptions<TrendResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.trend(period),
    queryFn: () => getBrowsingTrend(period),
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

export function useBrowsingSettings(
  options?: Omit<UseQueryOptions<BrowsingSettingsResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.settings(),
    queryFn: getBrowsingSettings,
    staleTime: 30_000,
    ...options,
  });
}

export function useBrowsingDomainRules(
  options?: Omit<UseQueryOptions<BrowsingDomainRulesResult>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: browsingKeys.domainRules(),
    queryFn: getBrowsingDomainRules,
    staleTime: 30_000,
    ...options,
  });
}

export function useUpdateBrowsingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBrowsingSettingsInput) =>
      updateBrowsingSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: browsingKeys.settings() });
      void queryClient.invalidateQueries({ queryKey: browsingKeys.domainRules() });
    },
  });
}

export function useCreateBrowsingDomainRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBrowsingDomainRuleInput) =>
      createBrowsingDomainRule(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: browsingKeys.settings() });
      void queryClient.invalidateQueries({ queryKey: browsingKeys.domainRules() });
    },
  });
}

export function useUpdateBrowsingDomainRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBrowsingDomainRuleInput;
    }) => updateBrowsingDomainRule(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: browsingKeys.settings() });
      void queryClient.invalidateQueries({ queryKey: browsingKeys.domainRules() });
    },
  });
}

export function useDeleteBrowsingDomainRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrowsingDomainRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: browsingKeys.settings() });
      void queryClient.invalidateQueries({ queryKey: browsingKeys.domainRules() });
    },
  });
}

export function useInvalidateBrowsing() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: browsingKeys.all });
  };
}
