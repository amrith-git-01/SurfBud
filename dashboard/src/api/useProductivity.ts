import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateProductivityTabGroup,
  createProductivityTabGroup,
  createStreak,
  deleteFocusSession,
  deleteProductivityTabGroup,
  deleteStreak,
  getActiveFocusSession,
  getFocusSessionHistory,
  getProductivityTabGroups,
  getProductivityUserSettings,
  getRecentTabGroupActivations,
  getStreakCalendar,
  getStreaks,
  endFocusSession,
  saveFocusDraft,
  startFocusSession,
  updateFocusSession,
  updateProductivityTabGroup,
  updateProductivityUserSettings,
  updateStreak,
} from "./productivity.api";

import type {
  DashboardProductivityTabGroup,
  ProductivityUserSettings,
  TabGroupActivation,
} from "../types/shared/productivity.types";
import type {
  EndFocusSessionInput,
  SaveFocusDraftInput,
  StartFocusSessionInput,
  UpdateFocusSessionInput,
  UpdateStreakInput,
} from "./productivity.api";

export const PRODUCTIVITY_TAB_GROUPS_QUERY_KEY = [
  "productivity",
  "tab-groups",
] as const;

export const PRODUCTIVITY_USER_SETTINGS_QUERY_KEY = [
  "productivity",
  "user-settings",
] as const;

export const TAB_GROUP_ACTIVATIONS_QUERY_KEY = [
  "productivity",
  "tab-group-activations",
] as const;

export const PRODUCTIVITY_STREAKS_QUERY_KEY = [
  "productivity",
  "streaks",
] as const;

const FOCUS_QUERY_ROOT = ["productivity", "focus"] as const;

export function useProductivityTabGroups() {
  return useQuery({
    queryKey: PRODUCTIVITY_TAB_GROUPS_QUERY_KEY,
    queryFn: getProductivityTabGroups,
  });
}

export function useProductivityUserSettings() {
  return useQuery({
    queryKey: PRODUCTIVITY_USER_SETTINGS_QUERY_KEY,
    queryFn: getProductivityUserSettings,
  });
}

export function useUpdateProductivityUserSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ProductivityUserSettings>) =>
      updateProductivityUserSettings(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_USER_SETTINGS_QUERY_KEY,
      });
    },
  });
}

export function useCreateProductivityTabGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductivityTabGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_TAB_GROUPS_QUERY_KEY,
      });
    },
  });
}

export function useUpdateProductivityTabGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateProductivityTabGroup>[1];
    }) => updateProductivityTabGroup(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_TAB_GROUPS_QUERY_KEY,
      });
    },
  });
}

export function useDeleteProductivityTabGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductivityTabGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_TAB_GROUPS_QUERY_KEY,
      });
    },
  });
}

export function useActivateProductivityTabGroup() {
  return useMutation({
    mutationFn: (id: string) => activateProductivityTabGroup(id),
  });
}

export function useRecentTabGroupActivations(limit = 20) {
  return useQuery({
    queryKey: [...TAB_GROUP_ACTIVATIONS_QUERY_KEY, limit] as const,
    queryFn: () => getRecentTabGroupActivations(limit),
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: PRODUCTIVITY_STREAKS_QUERY_KEY,
    queryFn: getStreaks,
  });
}

export function useCreateStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStreak,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_STREAKS_QUERY_KEY,
      });
    },
  });
}

export function useDeleteStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStreak,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_STREAKS_QUERY_KEY,
      });
    },
  });
}

export function useUpdateStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      streakId,
      payload,
    }: {
      streakId: string;
      payload: UpdateStreakInput;
    }) => updateStreak(streakId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRODUCTIVITY_STREAKS_QUERY_KEY,
      });
    },
  });
}

export function useStreakCalendar(
  streakId: string,
  days = 90,
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: [
      ...PRODUCTIVITY_STREAKS_QUERY_KEY,
      streakId,
      "calendar",
      days,
    ] as const,
    queryFn: () => getStreakCalendar(streakId, days),
    enabled: options?.enabled ?? Boolean(streakId),
    staleTime: options?.staleTime,
  });
}

export function useActiveFocusSession() {
  return useQuery({
    queryKey: [...FOCUS_QUERY_ROOT, "active"] as const,
    queryFn: getActiveFocusSession,
  });
}

export function useFocusSessionHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...FOCUS_QUERY_ROOT, "history", page, limit] as const,
    queryFn: () => getFocusSessionHistory(page, limit),
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartFocusSessionInput) => startFocusSession(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "active"],
      });
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "history"],
      });
    },
  });
}

export function useSaveFocusDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveFocusDraftInput) => saveFocusDraft(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "active"],
      });
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "history"],
      });
    },
  });
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: EndFocusSessionInput;
    }) => endFocusSession(sessionId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "active"],
      });
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "history"],
      });
    },
  });
}

export function useUpdateFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: UpdateFocusSessionInput;
    }) => updateFocusSession(sessionId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "active"],
      });
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "history"],
      });
    },
  });
}

export function useDeleteFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFocusSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "active"],
      });
      void queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "history"],
      });
    },
  });
}

export type { DashboardProductivityTabGroup, TabGroupActivation };
