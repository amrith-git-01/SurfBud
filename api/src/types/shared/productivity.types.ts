export interface ProductivityTabGroup {
  _id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  urls: string[];
  evolvedDomains: string[];
  evolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TabGroupActivation {
  _id: string;
  userId: string;
  tabGroupId: string;
  tabGroupName: string;
  tabGroupColor: string;
  urlDomains: string[];
  activatedAt: string;
}

export interface TabGroupActivationPayload {
  tabGroupId: string;
  tabGroupName: string;
  urls?: string[];
  activatedAt: string;
  source: "dashboard" | "extension";
  /**
   * When true, the service worker only opens tabs — activation was already
   * POSTed to `/api/productivity/tab-groups/:id/activate` (e.g. from the dashboard).
   */
  skipActivationApi?: boolean;
}

export interface ProductivityUserSettings {
  tabEvolutionEnabled: boolean;
  streakTabEvolutionEnabled: boolean;
  trackNewTabsInTabGroupEnabled: boolean;
}

export type StreakDayStatus =
  | "met"
  | "partial"
  | "missed"
  | "skipped"
  | "inactive";

export interface UserStreak {
  _id: string;
  userId: string;
  label: string;
  domain: string;
  minMinutes: number;
  activeDays: number[];
  currentStreak: number;
  longestStreak: number;
  todaySeconds: number;
  todayDate: string;
  lastMetAt: string | null;
  skipsUsed: number;
  isActive: boolean;
  evolvedDomains: string[];
  evolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StreakDayLog {
  _id: string;
  userId: string;
  streakId: string;
  date: string;
  seconds: number;
  minSeconds: number;
  status: StreakDayStatus;
  createdAt: string;
  updatedAt: string;
}

export type FocusSessionStatus = "draft" | "active" | "completed" | "abandoned";

export interface FocusSession {
  _id: string;
  userId: string;
  domain: string;
  label: string;
  plannedMins: number | null;
  actualMins: number | null;
  startedAt: string | null;
  endedAt: string | null;
  status: FocusSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSessionHistory {
  sessions: FocusSession[];
  total: number;
  page: number;
  totalPages: number;
}
