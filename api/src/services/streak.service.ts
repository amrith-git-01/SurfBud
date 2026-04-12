import type { z } from "zod";
import type { IUserStreak } from "../models/user-streak.model";
import type { UserStreak as PublicUserStreak } from "../types/shared/productivity.types";
import { BrowsingDomainStatsRepository } from "../repositories/browsing-domain-stats.repository";
import { StreakDayLogRepository } from "../repositories/streak-day-log.repository";
import {
  UserStreakRepository,
  type UpdateUserStreakDto,
} from "../repositories/user-streak.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  CreateStreakSchema,
  StreakCalendarQuerySchema,
  UpdateStreakSchema,
} from "../schemas/productivity.schemas";
import { domainsFromUrls } from "./tab-group-mode.service";
import { toDateString } from "../utils/date.utils";
import { NotFoundError } from "../utils/errors";

const EVALUATION_LOOKBACK_DAYS = 400;

type CreateStreakInput = z.infer<typeof CreateStreakSchema>;
type UpdateStreakInput = z.infer<typeof UpdateStreakSchema>;
type CalendarQueryInput = z.infer<typeof StreakCalendarQuerySchema>;

function getStreakEvolvedUrlList(row: {
  evolvedUrls?: string[] | null;
}): string[] {
  const e = row.evolvedUrls;
  return Array.isArray(e) && e.length > 0 ? e : [];
}

function serializePublicStreak(row: IUserStreak): PublicUserStreak {
  const evolved = getStreakEvolvedUrlList(row);
  return {
    _id: String(row._id),
    userId: String(row.userId),
    label: row.label,
    domain: row.domain,
    minMinutes: row.minMinutes,
    activeDays: row.activeDays,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    todaySeconds: row.todaySeconds,
    todayDate: row.todayDate,
    lastMetAt: row.lastMetAt,
    skipsUsed: row.skipsUsed,
    isActive: row.isActive,
    evolvedDomains: domainsFromUrls(evolved),
    evolvedAt: row.evolvedAt ? new Date(row.evolvedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function normalizeDomain(rawDomain: string): string {
  const candidate = rawDomain.trim().toLowerCase();

  try {
    const prefixed =
      candidate.startsWith("http://") || candidate.startsWith("https://")
        ? candidate
        : `https://${candidate}`;
    const parsed = new URL(prefixed);
    return parsed.hostname.toLowerCase();
  } catch {
    return candidate.replace(/^www\./, "");
  }
}

function shiftDate(dateString: string, offsetDays: number): string {
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOfWeekFromDateString(dateString: string): number {
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

function isActiveDay(dateString: string, activeDays: number[]): boolean {
  return activeDays.includes(dayOfWeekFromDateString(dateString));
}

function buildDateRange(endDate: string, days: number): string[] {
  const dates: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    dates.push(shiftDate(endDate, -i));
  }

  return dates;
}

function deriveCurrentStreak(
  dateRange: string[],
  activeDays: number[],
  minSeconds: number,
  secondsByDate: Map<string, number>,
): number {
  let current = 0;

  for (let i = dateRange.length - 1; i >= 0; i -= 1) {
    const date = dateRange[i];
    if (!date) continue;
    if (!isActiveDay(date, activeDays)) {
      continue;
    }

    const seconds = secondsByDate.get(date) ?? 0;
    if (seconds >= minSeconds) {
      current += 1;
      continue;
    }

    break;
  }

  return current;
}

function deriveLongestStreak(
  dateRange: string[],
  activeDays: number[],
  minSeconds: number,
  secondsByDate: Map<string, number>,
): number {
  let current = 0;
  let longest = 0;

  for (const date of dateRange) {
    if (!isActiveDay(date, activeDays)) {
      continue;
    }

    const seconds = secondsByDate.get(date) ?? 0;
    if (seconds >= minSeconds) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 0;
  }

  return longest;
}

function deriveLastMetAt(
  dateRange: string[],
  minSeconds: number,
  secondsByDate: Map<string, number>,
): string | null {
  for (let i = dateRange.length - 1; i >= 0; i -= 1) {
    const date = dateRange[i];
    if (!date) continue;

    const seconds = secondsByDate.get(date) ?? 0;
    if (seconds >= minSeconds) {
      return date;
    }
  }

  return null;
}

export const StreakService = {
  async getStreaks(userId: string) {
    const rows = await UserStreakRepository.findByUserId(userId);
    return rows.map((r) => serializePublicStreak(r as IUserStreak));
  },

  async createStreak(userId: string, body: CreateStreakInput) {
    const user = await UserRepository.findById(userId);
    const timezone = user?.timezone ?? "UTC";

    const created = await UserStreakRepository.create({
      userId,
      label: body.label,
      domain: normalizeDomain(body.domain),
      minMinutes: body.minMinutes,
      activeDays: body.activeDays,
      todayDate: toDateString(new Date(), timezone),
    });
    return serializePublicStreak(created as IUserStreak);
  },

  async updateStreak(userId: string, streakId: string, body: UpdateStreakInput) {
    const streak = await UserStreakRepository.findById(userId, streakId);

    if (!streak || !streak.isActive) {
      throw new NotFoundError("Streak not found");
    }

    const payload: UpdateUserStreakDto = { ...body };
    if (body.domain !== undefined) {
      payload.domain = normalizeDomain(body.domain);
    }

    const updated = await UserStreakRepository.update(userId, streakId, payload);
    if (!updated) {
      throw new NotFoundError("Streak not found");
    }

    return serializePublicStreak(updated as IUserStreak);
  },

  async deleteStreak(userId: string, streakId: string): Promise<void> {
    const streak = await UserStreakRepository.findById(userId, streakId);

    if (!streak || !streak.isActive) {
      throw new NotFoundError("Streak not found");
    }

    const deleted = await UserStreakRepository.softDelete(userId, streakId);
    if (!deleted) {
      throw new NotFoundError("Streak not found");
    }
  },

  async getCalendar(userId: string, streakId: string, query: CalendarQueryInput) {
    const streak = await UserStreakRepository.findById(userId, streakId);

    if (!streak || !streak.isActive) {
      throw new NotFoundError("Streak not found");
    }

    const user = await UserRepository.findById(userId);
    const timezone = user?.timezone ?? "UTC";
    const today = toDateString(new Date(), timezone);
    const dateRange = buildDateRange(today, query.days);

    const logs = await StreakDayLogRepository.findByStreakId(streakId, query.days);
    const byDate = new Map(logs.map((log) => [log.date, log]));

    const calendar = dateRange.map((date) => {
      const existing = byDate.get(date);
      if (existing) {
        return existing;
      }

      return {
        _id: `${streakId}:${date}`,
        userId: streak.userId,
        streakId: streak._id,
        date,
        seconds: 0,
        minSeconds: streak.minMinutes * 60,
        status: isActiveDay(date, streak.activeDays) ? "missed" : "inactive",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    return { streak: serializePublicStreak(streak as IUserStreak), calendar };
  },

  async evaluateAfterBatch(
    userId: string,
    domains: string[],
    timezone: string,
  ): Promise<void> {
    const normalizedDomains = [...new Set(domains.map(normalizeDomain))];
    if (normalizedDomains.length === 0) {
      return;
    }

    const streaks = await UserStreakRepository.findByUserId(userId);
    const targetStreaks = streaks.filter((streak) =>
      normalizedDomains.includes(streak.domain),
    );

    if (targetStreaks.length === 0) {
      return;
    }

    const today = toDateString(new Date(), timezone);
    const fromDate = shiftDate(today, -(EVALUATION_LOOKBACK_DAYS - 1));

    for (const streak of targetStreaks) {
      const rows = await BrowsingDomainStatsRepository.findByUserDomainAndDateRange(
        userId,
        streak.domain,
        fromDate,
        today,
      );

      const secondsByDate = new Map<string, number>(
        rows.map((row) => [row.date, row.totalActiveTime]),
      );

      const dateRange = buildDateRange(today, EVALUATION_LOOKBACK_DAYS);
      const minSeconds = streak.minMinutes * 60;
      const todaySeconds = secondsByDate.get(today) ?? 0;
      const todayStatus: "met" | "partial" | "missed" | "inactive" =
        !isActiveDay(today, streak.activeDays)
          ? "inactive"
          : todaySeconds >= minSeconds
            ? "met"
            : todaySeconds > 0
              ? "partial"
              : "missed";

      const currentStreak = deriveCurrentStreak(
        dateRange,
        streak.activeDays,
        minSeconds,
        secondsByDate,
      );
      const historicalLongest = deriveLongestStreak(
        dateRange,
        streak.activeDays,
        minSeconds,
        secondsByDate,
      );
      const longestStreak = Math.max(streak.longestStreak, historicalLongest);
      const lastMetAt = deriveLastMetAt(dateRange, minSeconds, secondsByDate);

      await UserStreakRepository.updateDerived(String(streak._id), {
        currentStreak,
        longestStreak,
        todaySeconds,
        todayDate: today,
        lastMetAt,
      });

      await StreakDayLogRepository.upsertDay({
        userId,
        streakId: String(streak._id),
        date: today,
        seconds: todaySeconds,
        minSeconds,
        status: todayStatus,
      });
    }
  },
};
