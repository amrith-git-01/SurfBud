import {
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  getDownloadStats,
  getRecentEvents,
  type UserDownloadMetrics,
} from "@/api/downloads.api";

const RECENT_LIMIT = 8;

export const downloadKeys = {
  all: ["downloads"] as const,
  stats: () => [...downloadKeys.all, "stats"] as const,
  recent: (limit: number) => [...downloadKeys.all, "recent", limit] as const,
};

type StatsResult = Awaited<ReturnType<typeof getDownloadStats>>;
type RecentResult = Awaited<ReturnType<typeof getRecentEvents>>;

export function useDownloadStats(
  options?: Omit<
    UseQueryOptions<StatsResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.stats(),
    queryFn: getDownloadStats,
    ...options,
  });
}

export function useRecentEvents(
  options?: Omit<
    UseQueryOptions<RecentResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.recent(RECENT_LIMIT),
    queryFn: () => getRecentEvents(RECENT_LIMIT),
    ...options,
  });
}

export type { UserDownloadMetrics };
