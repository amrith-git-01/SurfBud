import type { IFile } from "../models/file.model";
import { DownloadMetricsRepository } from "../repositories/download-metrics.repository";
import { DomainStatsRepository } from "../repositories/domain-stats.repository";
import { CategoryStatsRepository } from "../repositories/category-stats.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  toDateString,
  getMondayString,
  getMonthStartString,
} from "../utils/date.utils";

export const DownloadMetricsService = {
  async updateOnDownload(
    userId: string,
    file: IFile,
    status: "new" | "duplicate",
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    const tz = user?.timezone ?? "UTC";
    const today = toDateString(new Date(), tz);
    const weekStart = getMondayString(new Date(), tz);
    const monthStart = getMonthStartString(new Date(), tz);

    const existing = await DownloadMetricsRepository.findByUserId(userId);
    const category = file.fileCategory ?? "other";
    const size = file.size ?? 0;

    const resetToday = existing?.todayDate !== today;
    const resetWeek = existing?.weekStart !== weekStart;
    const resetMonth = existing?.monthStart !== monthStart;

    const setFields: Record<string, unknown> = {
      todayDate: today,
      weekStart,
      monthStart,
      updatedAt: new Date(),
      ...(resetToday
        ? { todayCount: 1, prevTodayCount: existing?.todayCount ?? 0 }
        : {}),
      ...(resetWeek
        ? { weekCount: 1, prevWeekCount: existing?.weekCount ?? 0 }
        : {}),
      ...(resetMonth
        ? { monthCount: 1, prevMonthCount: existing?.monthCount ?? 0 }
        : {}),
    };

    const incFields: Record<string, number> = {
      totalNew: status === "new" ? 1 : 0,
      totalDuplicates: status === "duplicate" ? 1 : 0,
      totalSize: size, // Always increment - total of ALL files
      newSize: status === "new" ? size : 0,
      duplicateSize: status === "duplicate" ? size : 0,
    };
    if (!resetToday) incFields.todayCount = 1;
    if (!resetWeek) incFields.weekCount = 1;
    if (!resetMonth) incFields.monthCount = 1;

    await DownloadMetricsRepository.upsert(userId, {
      $set: setFields,
      $inc: incFields,
    });

    await DomainStatsRepository.upsertOnDownload(
      userId,
      file.sourceDomain ?? "unknown",
      status,
      size,
    );

    await CategoryStatsRepository.upsertOnDownload(
      userId,
      category,
      status,
      size,
    );
  },

  async getStats(userId: string) {
    const user = await UserRepository.findById(userId);
    const tz = user?.timezone ?? "UTC";
    const today = toDateString(new Date(), tz);
    const weekStart = getMondayString(new Date(), tz);
    const monthStart = getMonthStartString(new Date(), tz);

    const metrics = await DownloadMetricsRepository.findByUserId(userId);
    if (!metrics) return null;

    // Periods that have rolled over since the last download show stale counts.
    // Return zeroed values for those periods without mutating the DB.
    const todayStale = metrics.todayDate !== today;
    const weekStale = metrics.weekStart !== weekStart;
    const monthStale = metrics.monthStart !== monthStart;

    return {
      ...metrics,
      todayCount: todayStale ? 0 : metrics.todayCount,
      prevTodayCount: todayStale ? metrics.todayCount : metrics.prevTodayCount,
      weekCount: weekStale ? 0 : metrics.weekCount,
      prevWeekCount: weekStale ? metrics.weekCount : metrics.prevWeekCount,
      monthCount: monthStale ? 0 : metrics.monthCount,
      prevMonthCount: monthStale ? metrics.monthCount : metrics.prevMonthCount,
    };
  },

  async getCategories(userId: string, limit?: number) {
    return CategoryStatsRepository.findByUserId(userId, limit);
  },

  async getDomains(userId: string, limit?: number) {
    return DomainStatsRepository.findByUserId(userId, limit);
  },
};
