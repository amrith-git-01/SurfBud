import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateFocusDraft,
  endFocusSession,
  getActiveFocusSession,
  getFocusDrafts,
  getProductivityStreaks,
  getProductivityTabGroups,
} from "./productivity.api";

export const extensionProductivityKeys = {
  tabGroups: ["extension-productivity", "tab-groups"] as const,
  streaks: ["extension-productivity", "streaks"] as const,
  focusActive: ["extension-productivity", "focus", "active"] as const,
  focusHistory: (page: number, limit: number) =>
    ["extension-productivity", "focus", "history", page, limit] as const,
  focusDrafts: (limit: number) =>
    ["extension-productivity", "focus", "drafts", limit] as const,
};

export function useExtensionProductivityTabGroups() {
  return useQuery({
    queryKey: extensionProductivityKeys.tabGroups,
    queryFn: getProductivityTabGroups,
    staleTime: 30_000,
  });
}

export function useExtensionProductivityStreaks() {
  return useQuery({
    queryKey: extensionProductivityKeys.streaks,
    queryFn: getProductivityStreaks,
    staleTime: 30_000,
  });
}

export function useExtensionActiveFocusSession() {
  return useQuery({
    queryKey: extensionProductivityKeys.focusActive,
    queryFn: getActiveFocusSession,
    staleTime: 15_000,
  });
}

const FOCUS_DRAFTS_LIST_LIMIT = 150;

export function useExtensionFocusDrafts() {
  return useQuery({
    queryKey: extensionProductivityKeys.focusDrafts(FOCUS_DRAFTS_LIST_LIMIT),
    queryFn: () => getFocusDrafts(FOCUS_DRAFTS_LIST_LIMIT),
    staleTime: 15_000,
  });
}

export function useExtensionActivateFocusDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      plannedMins,
    }: {
      sessionId: string;
      plannedMins?: number | null;
    }) =>
      activateFocusDraft(sessionId, {
        plannedMins: plannedMins === undefined ? undefined : plannedMins,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: extensionProductivityKeys.focusActive,
      });
      void queryClient.invalidateQueries({
        queryKey: ["extension-productivity", "focus", "history"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["extension-productivity", "focus", "drafts"],
      });
    },
  });
}

export function useExtensionEndFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: { status: "completed" | "abandoned" };
    }) => endFocusSession(sessionId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: extensionProductivityKeys.focusActive,
      });
      void queryClient.invalidateQueries({
        queryKey: ["extension-productivity", "focus", "history"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["extension-productivity", "focus", "drafts"],
      });
    },
  });
}
