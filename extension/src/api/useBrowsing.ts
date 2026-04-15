import {
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  getBrowsingCategoryCatalog,
  getBrowsingRecentSessions,
  getBrowsingStats,
  type BrowsingCategoryCatalogItem,
  type BrowsingSessionRow,
  type UserBrowsingMetrics,
} from "@/api/browsing.api";

const RECENT_SESSIONS_LIMIT = 8;

export const browsingKeys = {
  all: ["browsing"] as const,
  stats: () => [...browsingKeys.all, "stats"] as const,
  categories: () => [...browsingKeys.all, "categories"] as const,
  recent: (limit: number) => [...browsingKeys.all, "recent", limit] as const,
};

type StatsResult = Awaited<ReturnType<typeof getBrowsingStats>>;
type CategoriesResult = Awaited<ReturnType<typeof getBrowsingCategoryCatalog>>;
type RecentResult = Awaited<ReturnType<typeof getBrowsingRecentSessions>>;

export function useBrowsingStats(
  options?: Omit<
    UseQueryOptions<StatsResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: browsingKeys.stats(),
    queryFn: getBrowsingStats,
    ...options,
  });
}

export function useBrowsingCategoryCatalog(
  options?: Omit<
    UseQueryOptions<CategoriesResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: browsingKeys.categories(),
    queryFn: getBrowsingCategoryCatalog,
    staleTime: 60_000,
    ...options,
  });
}

export function useBrowsingRecentSessions(
  options?: Omit<
    UseQueryOptions<RecentResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: browsingKeys.recent(RECENT_SESSIONS_LIMIT),
    queryFn: () => getBrowsingRecentSessions(RECENT_SESSIONS_LIMIT),
    ...options,
  });
}

export type {
  BrowsingCategoryCatalogItem,
  BrowsingSessionRow,
  UserBrowsingMetrics,
};
