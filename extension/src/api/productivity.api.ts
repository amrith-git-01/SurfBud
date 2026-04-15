import { api } from "@/services/api";

import type {
  FocusSession,
  FocusSessionHistory,
  ProductivityTabGroup,
  UserStreak,
} from "@/types/shared/productivity.types";

export type ExtensionProductivityTabGroup = ProductivityTabGroup & {
  isPredefined: boolean;
};

const BASE = "/api/productivity";
const TAB_GROUPS = `${BASE}/tab-groups`;
const STREAKS = `${BASE}/streaks`;

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T>;

type ProductivityTabGroupApi = ProductivityTabGroup;

export async function getProductivityTabGroups(): Promise<
  ExtensionProductivityTabGroup[]
> {
  const { data } = await api.get<ApiResponse<{ tabGroups: ProductivityTabGroupApi[] }>>(
    TAB_GROUPS,
  );
  return (data.data?.tabGroups ?? []).map((g) => ({
    ...g,
    isPredefined: g.sortOrder > 0,
    evolvedDomains: g.evolvedDomains ?? [],
    evolvedAt: g.evolvedAt ?? null,
  }));
}

function normalizeUserStreak(s: UserStreak): UserStreak {
  return {
    ...s,
    evolvedDomains: s.evolvedDomains ?? [],
    evolvedAt: s.evolvedAt ?? null,
  };
}

export async function getProductivityStreaks(): Promise<UserStreak[]> {
  const { data } = await api.get<ApiResponse<{ streaks: UserStreak[] }>>(STREAKS);
  return (data.data?.streaks ?? []).map(normalizeUserStreak);
}

export async function deleteProductivityStreak(streakId: string): Promise<void> {
  await api.delete<ApiResponse<{ deleted: boolean }>>(
    `${STREAKS}/${encodeURIComponent(streakId)}`,
  );
}

export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const { data } = await api.get<ApiResponse<{ session: FocusSession | null }>>(
    `${BASE}/focus/active`,
  );
  return data.data?.session ?? null;
}

export async function getFocusDrafts(limit = 100): Promise<FocusSession[]> {
  const { data } = await api.get<ApiResponse<{ sessions: FocusSession[] }>>(
    `${BASE}/focus/drafts`,
    { params: { limit } },
  );
  return data.data?.sessions ?? [];
}

export async function getFocusSessionHistory(
  page = 1,
  limit = 100,
): Promise<FocusSessionHistory> {
  const { data } = await api.get<ApiResponse<FocusSessionHistory>>(
    `${BASE}/focus/sessions`,
    { params: { page, limit } },
  );
  return (
    data.data ?? {
      sessions: [],
      total: 0,
      page,
      totalPages: 1,
    }
  );
}

export async function activateFocusDraft(
  sessionId: string,
  payload: { plannedMins?: number | null } = {},
): Promise<FocusSession> {
  const { data } = await api.post<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/sessions/${encodeURIComponent(sessionId)}/start`,
    payload,
  );
  return data.data.session;
}

export async function endFocusSession(
  sessionId: string,
  payload: { status: "completed" | "abandoned" },
): Promise<FocusSession> {
  const { data } = await api.patch<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/sessions/${encodeURIComponent(sessionId)}/end`,
    payload,
  );
  return data.data.session;
}
