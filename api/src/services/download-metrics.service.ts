import type { IFile } from "../models/file.model";
import { DownloadMetricsRepository } from "../repositories/download-metrics.repository";
import { DomainStatsRepository } from "../repositories/domain-stats.repository";
import { CategoryStatsRepository } from "../repositories/category-stats.repository";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMondayString(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return toDateString(d);
}

function getMonthStartString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export const DownloadMetricsService = {
  async updateOnDownload(
    userId: string,
    file: IFile,
    status: "new" | "duplicate",
  ): Promise<void> {
    const today = toDateString(new Date());
    const weekStart = getMondayString(new Date());
    const monthStart = getMonthStartString(new Date());

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
    };
    if (resetToday) setFields.todayCount = 1;
    if (resetWeek) setFields.weekCount = 1;
    if (resetMonth) setFields.monthCount = 1;

    const incFields: Record<string, number> = {
      totalNew: status === "new" ? 1 : 0,
      totalDuplicates: status === "duplicate" ? 1 : 0,
      totalSize: status === "new" ? size : 0,
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
};
