import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  getDownloadStats,
  getDownloadTrend,
  getRecentEvents,
  getEvents,
  getDuplicateGroups,
  getCategories,
  getDomains,
  getFileById,
  getFileTimeline,
  getDownloadSettings,
  updateDownloadSettings,
  createDomainRule,
  updateDomainRule,
  deleteDomainRule,
  createRoutingFolder,
  updateRoutingFolder,
  deleteRoutingFolder,
  cancelRemoval,
  type DownloadStatsDateLimitParams,
  type EventsQueryParams,
  type UpdateDownloadSettingsInput,
  type CreateDomainRuleInput,
  type UpdateDomainRuleInput,
  type CreateRoutingFolderInput,
  type UpdateRoutingFolderInput,
} from "./downloads.api";


/** Query key factory — single source of truth for cache keys and invalidation */
export const downloadKeys = {
  all: ["downloads"] as const,
  stats: () => [...downloadKeys.all, "stats"] as const,
  trend: (period: number) => [...downloadKeys.all, "trend", period] as const,
  recent: () => [...downloadKeys.all, "recent"] as const,
  events: (params: EventsQueryParams) =>
    [...downloadKeys.all, "events", params] as const,
  duplicates: () => [...downloadKeys.all, "duplicates"] as const,
  categoriesAll: () => [...downloadKeys.all, "categories"] as const,
  categories: (params: DownloadStatsDateLimitParams) =>
    [...downloadKeys.all, "categories", params] as const,
  domainsAll: () => [...downloadKeys.all, "domains"] as const,
  domains: (params: DownloadStatsDateLimitParams) =>
    [...downloadKeys.all, "domains", params] as const,
  file: (id: string) => [...downloadKeys.all, "file", id] as const,
  fileTimeline: (id: string) =>
    [...downloadKeys.all, "file", id, "timeline"] as const,
  settings: () => [...downloadKeys.all, "settings"] as const,
};

type StatsResult = Awaited<ReturnType<typeof getDownloadStats>>;
type TrendResult = Awaited<ReturnType<typeof getDownloadTrend>>;
type RecentResult = Awaited<ReturnType<typeof getRecentEvents>>;
type EventsResult = Awaited<ReturnType<typeof getEvents>>;
type DuplicatesResult = Awaited<ReturnType<typeof getDuplicateGroups>>;
type CategoriesResult = Awaited<ReturnType<typeof getCategories>>;
type DomainsResult = Awaited<ReturnType<typeof getDomains>>;
type FileResult = Awaited<ReturnType<typeof getFileById>>;
type TimelineResult = Awaited<ReturnType<typeof getFileTimeline>>;

/** Section 1 + 3 — metric cards and health bars */
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

/** Section 2 — activity chart */
export function useDownloadTrend(
  period: 7 | 15 | 30 = 7,
  options?: Omit<
    UseQueryOptions<TrendResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.trend(period),
    queryFn: () => getDownloadTrend(period),
    ...options,
  });
}

/** Section 4 — recent downloads feed */
export function useRecentEvents(
  options?: Omit<
    UseQueryOptions<RecentResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.recent(),
    queryFn: getRecentEvents,
    ...options,
  });
}

/** Drawer list — paginated/filtered events */
export function useDownloadEvents(
  params: EventsQueryParams = {},
  options?: Omit<
    UseQueryOptions<EventsResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.events(params),
    queryFn: () => getEvents(params),
    ...options,
  });
}

/** Section 5 — duplicate groups */
export function useDuplicateGroups(
  options?: Omit<
    UseQueryOptions<DuplicatesResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.duplicates(),
    queryFn: getDuplicateGroups,
    ...options,
  });
}

/** Section 6 — file categories */
export function useCategories(
  params: DownloadStatsDateLimitParams = { period: "today" },
  options?: Omit<
    UseQueryOptions<CategoriesResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.categories(params),
    queryFn: () => getCategories(params),
    ...options,
  });
}

/** Section 6 — download sources (domains) */
export function useDomains(
  params: DownloadStatsDateLimitParams = { period: "today" },
  options?: Omit<
    UseQueryOptions<DomainsResult>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.domains(params),
    queryFn: () => getDomains(params),
    ...options,
  });
}

/** Drawer DETAILS tab — single file */
export function useFileById(
  fileId: string | null,
  options?: Omit<
    UseQueryOptions<FileResult>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.file(fileId ?? ""),
    queryFn: () => getFileById(fileId!),
    enabled: !!fileId,
    ...options,
  });
}

/** Drawer TIMELINE tab */
export function useFileTimeline(
  fileId: string | null,
  options?: Omit<
    UseQueryOptions<TimelineResult>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: downloadKeys.fileTimeline(fileId ?? ""),
    queryFn: () => getFileTimeline(fileId!),
    enabled: !!fileId,
    ...options,
  });
}

/** Invalidate all download-related queries (e.g. after new download from extension) */
export function useInvalidateDownloads() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: downloadKeys.all });
}

// ─────────────────────────────────────────────────────────────────────────────
// Download Configuration Hooks
// ─────────────────────────────────────────────────────────────────────────────

/** Settings page — fetch current settings */
export function useDownloadSettings() {
  return useQuery({
    queryKey: downloadKeys.settings(),
    queryFn: getDownloadSettings,
    staleTime: 30_000,
  });
}

/** Settings page — update top-level toggles and grace period */
export function useUpdateDownloadSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDownloadSettingsInput) =>
      updateDownloadSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Domain rules — add a new rule */
export function useCreateDomainRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDomainRuleInput) => createDomainRule(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Domain rules — update an existing rule */
export function useUpdateDomainRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDomainRuleInput }) =>
      updateDomainRule(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Domain rules — delete a rule */
export function useDeleteDomainRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDomainRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Routing folders — create a new folder mapping */
export function useCreateRoutingFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoutingFolderInput) => createRoutingFolder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Routing folders — rename or reassign category */
export function useUpdateRoutingFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoutingFolderInput }) =>
      updateRoutingFolder(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Routing folders — delete */
export function useDeleteRoutingFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoutingFolder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.settings() });
    },
  });
}

/** Duplicate removal — cancel a scheduled removal by hash */
export function useCancelRemoval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hash: string) => cancelRemoval(hash),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: downloadKeys.duplicates() });
      void queryClient.invalidateQueries({ queryKey: downloadKeys.recent() });
    },
  });
}
