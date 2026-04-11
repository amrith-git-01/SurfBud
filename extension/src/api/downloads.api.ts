import { api } from "@/services/api";

const BASE = "/api/downloads";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T>;

export interface UserDownloadMetrics {
  todayCount: number;
  todayDate: string;
  prevTodayCount: number;
  weekCount: number;
  weekStart: string;
  prevWeekCount: number;
  monthCount: number;
  monthStart: string;
  prevMonthCount: number;
  totalNew: number;
  totalDuplicates: number;
  totalSize: number;
  newSize: number;
  duplicateSize: number;
  updatedAt: string;
}

export interface FilePopulate {
  _id: string;
  fileCategory?: string;
  fileExtension?: string;
  mimeType?: string;
  size?: number;
}

export interface DownloadEvent {
  _id: string;
  userId: string;
  fileId: string | FilePopulate;
  filename: string;
  savedPath?: string;
  sourceDomain?: string;
  status: "new" | "duplicate";
  duration?: number;
  isRemoved: boolean;
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventsResponse {
  events: DownloadEvent[];
  total: number;
}

export async function getDownloadStats(): Promise<UserDownloadMetrics | null> {
  const { data } = await api.get<
    ApiResponse<{ metrics: UserDownloadMetrics | null }>
  >(`${BASE}/stats`);
  return data.data?.metrics ?? null;
}

export async function getRecentEvents(limit = 8): Promise<DownloadEvent[]> {
  const { data } = await api.get<ApiResponse<EventsResponse>>(`${BASE}/events`, {
    params: {
      page: 1,
      limit,
      sort: "newest",
    },
  });
  return data.data?.events ?? [];
}
