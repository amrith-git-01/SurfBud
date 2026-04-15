import { api } from "../services/api";
import type {
  FocusSession,
  FocusSessionHistory,
  ProductivityTabGroup,
  ProductivityUserSettings,
  StreakDayLog,
  TabGroupActivation,
  UserStreak,
} from "../types/shared/productivity.types";

type ProductivityTabGroupApi = Omit<ProductivityTabGroup, "isPredefined">;

const BASE = "/api/productivity";
const TAB_GROUPS = `${BASE}/tab-groups`;
const SETTINGS = `${BASE}/settings`;

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T>;

export interface CreateProductivityTabGroupInput {
  name: string;
  color: string;
  icon: string;
  urls: string[];
}

export interface UpdateProductivityTabGroupInput {
  name?: string;
  color?: string;
  icon?: string;
  urls?: string[];
}

export interface CreateStreakInput {
  label: string;
  domain: string;
  minMinutes: number;
  activeDays: number[];
}

export interface UpdateStreakInput {
  label?: string;
  domain?: string;
  minMinutes?: number;
  activeDays?: number[];
}

export interface StartFocusSessionInput {
  domain: string;
  plannedMins: number | null;
}

export interface SaveFocusDraftInput {
  domain: string;
  plannedMins: number | null;
  label?: string;
}

export interface EndFocusSessionInput {
  status: "completed" | "abandoned";
}

export interface UpdateFocusSessionInput {
  label?: string;
  domain?: string;
  plannedMins?: number | null;
}

export async function getProductivityTabGroups(): Promise<
  (ProductivityTabGroup & { isPredefined: boolean })[]
> {
  const { data } =
    await api.get<ApiResponse<{ tabGroups: ProductivityTabGroupApi[] }>>(
      TAB_GROUPS,
    );
  return (data.data?.tabGroups ?? []).map((g) => ({
    ...g,
    isPredefined: g.sortOrder > 0,
    evolvedDomains: g.evolvedDomains ?? [],
    evolvedAt: g.evolvedAt ?? null,
  }));
}

export async function createProductivityTabGroup(
  payload: CreateProductivityTabGroupInput,
): Promise<ProductivityTabGroup & { isPredefined: boolean }> {
  const { data } = await api.post<
    ApiResponse<{ tabGroup: ProductivityTabGroup }>
  >(TAB_GROUPS, payload);
  const g = data.data.tabGroup;
  return {
    ...g,
    isPredefined: g.sortOrder > 0,
    evolvedDomains: g.evolvedDomains ?? [],
    evolvedAt: g.evolvedAt ?? null,
  };
}

export async function updateProductivityTabGroup(
  tabGroupId: string,
  payload: UpdateProductivityTabGroupInput,
): Promise<ProductivityTabGroup & { isPredefined: boolean }> {
  const { data } = await api.patch<
    ApiResponse<{ tabGroup: ProductivityTabGroup }>
  >(`${TAB_GROUPS}/${tabGroupId}`, payload);
  const g = data.data.tabGroup;
  return {
    ...g,
    isPredefined: g.sortOrder > 0,
    evolvedDomains: g.evolvedDomains ?? [],
    evolvedAt: g.evolvedAt ?? null,
  };
}

export async function deleteProductivityTabGroup(
  tabGroupId: string,
): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
    `${TAB_GROUPS}/${tabGroupId}`,
  );
  return data.data;
}

export async function activateProductivityTabGroup(
  tabGroupId: string,
): Promise<{
  event: TabGroupActivation;
  launchUrls: string[];
}> {
  const { data } = await api.post<
    ApiResponse<{ event: TabGroupActivation; launchUrls: string[] }>
  >(`${TAB_GROUPS}/${tabGroupId}/activate`);
  return {
    event: data.data.event,
    launchUrls: data.data.launchUrls,
  };
}

export async function getProductivityUserSettings(): Promise<ProductivityUserSettings> {
  const { data } =
    await api.get<ApiResponse<{ settings: ProductivityUserSettings }>>(
      SETTINGS,
    );
  return data.data.settings;
}

export async function updateProductivityUserSettings(
  patch: Partial<ProductivityUserSettings>,
): Promise<ProductivityUserSettings> {
  const { data } = await api.patch<
    ApiResponse<{ settings: ProductivityUserSettings }>
  >(SETTINGS, patch);
  return data.data.settings;
}

export async function getRecentTabGroupActivations(
  limit = 10,
): Promise<TabGroupActivation[]> {
  const { data } = await api.get<ApiResponse<{ events: TabGroupActivation[] }>>(
    `${TAB_GROUPS}/activations`,
    { params: { limit } },
  );
  return data.data?.events ?? [];
}

export async function getStreaks(): Promise<UserStreak[]> {
  const { data } = await api.get<ApiResponse<{ streaks: UserStreak[] }>>(
    `${BASE}/streaks`,
  );
  return (data.data?.streaks ?? []).map((s) => ({
    ...s,
    evolvedDomains: s.evolvedDomains ?? [],
    evolvedAt: s.evolvedAt ?? null,
  }));
}

export async function createStreak(
  payload: CreateStreakInput,
): Promise<UserStreak> {
  const { data } = await api.post<ApiResponse<{ streak: UserStreak }>>(
    `${BASE}/streaks`,
    payload,
  );
  return data.data.streak;
}

export async function updateStreak(
  streakId: string,
  payload: UpdateStreakInput,
): Promise<UserStreak> {
  const { data } = await api.patch<ApiResponse<{ streak: UserStreak }>>(
    `${BASE}/streaks/${streakId}`,
    payload,
  );
  return data.data.streak;
}

export async function deleteStreak(
  streakId: string,
): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
    `${BASE}/streaks/${streakId}`,
  );
  return data.data;
}

export async function getStreakCalendar(
  streakId: string,
  days = 90,
): Promise<{ streak: UserStreak; calendar: StreakDayLog[] }> {
  const { data } = await api.get<
    ApiResponse<{ streak: UserStreak; calendar: StreakDayLog[] }>
  >(`${BASE}/streaks/${streakId}/calendar`, {
    params: { days },
  });
  return data.data;
}

export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const { data } = await api.get<ApiResponse<{ session: FocusSession | null }>>(
    `${BASE}/focus/active`,
  );
  return data.data?.session ?? null;
}

export async function startFocusSession(
  payload: StartFocusSessionInput,
): Promise<FocusSession> {
  const { data } = await api.post<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/sessions`,
    payload,
  );
  return data.data.session;
}

export async function saveFocusDraft(
  payload: SaveFocusDraftInput,
): Promise<FocusSession> {
  const { data } = await api.post<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/drafts`,
    payload,
  );
  return data.data.session;
}

export async function activateFocusDraft(
  sessionId: string,
  payload: { plannedMins?: number | null } = {},
): Promise<FocusSession> {
  const { data } = await api.post<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/sessions/${sessionId}/start`,
    payload,
  );
  return data.data.session;
}

export async function endFocusSession(
  sessionId: string,
  payload: EndFocusSessionInput,
): Promise<FocusSession> {
  const { data } = await api.patch<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/sessions/${sessionId}/end`,
    payload,
  );
  return data.data.session;
}

export async function updateFocusSession(
  sessionId: string,
  payload: UpdateFocusSessionInput,
): Promise<FocusSession> {
  const { data } = await api.patch<ApiResponse<{ session: FocusSession }>>(
    `${BASE}/focus/sessions/${sessionId}`,
    payload,
  );
  return data.data.session;
}

export async function deleteFocusSession(
  sessionId: string,
): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
    `${BASE}/focus/sessions/${sessionId}`,
  );
  return data.data;
}

export async function getFocusSessionHistory(
  page = 1,
  limit = 10,
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
