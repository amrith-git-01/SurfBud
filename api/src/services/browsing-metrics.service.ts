import { Types } from "mongoose";
import type { BrowsingProductivityType } from "../models/browsing-category.model";
import { BrowsingDailyStats } from "../models/browsing-daily-stats.model";
import { BrowsingDomainStats } from "../models/browsing-domain-stats.model";
import { BrowsingCategoryStats } from "../models/browsing-category-stats.model";
import { DomainClassificationRepository } from "../repositories/domain-classification.repository";
import { BrowsingCategoryRepository } from "../repositories/browsing-category.repository";
import { BrowsingSessionRepository } from "../repositories/browsing-session.repository";
import { UserBrowsingMetricsRepository } from "../repositories/user-browsing-metrics.repository";
import { UserRepository } from "../repositories/user.repository";
import { BrowsingDailyStatsRepository } from "../repositories/browsing-daily-stats.repository";
import { BrowsingDomainStatsRepository } from "../repositories/browsing-domain-stats.repository";
import { BrowsingCategoryStatsRepository } from "../repositories/browsing-category-stats.repository";
import type { ExtensionSession } from "../types/shared/browsing.types";
import type { BrowsingMetricsSessionSnapshot } from "../types/browsing-metrics-job.types";
import type { BrowsingStatsPeriod } from "../schemas/browsing.schemas";
import type { BrowsingDomainStatsPeriodRow } from "../types/browsing-domain-stats-period-row.types";
import {
  getMondayString,
  getMonthStartString,
  getStatsPeriodDateBounds,
  hourOfDayInTimezone,
  toDateString,
} from "../utils/date.utils";
import { logger } from "../utils/logger";
import type {
  IUserBrowsingMetricsPeriod,
  IUserBrowsingMetricsPrev,
  IUserBrowsingMetricsToday,
} from "../models/user-browsing-metrics.model";

const MICRO_SESSION_SECONDS = 60;
const DEEP_FOCUS_MIN_SECONDS = 30 * 60;
/** Spec §9.2 — count local hours where domain switches reach this threshold. */
const SCATTERED_SWITCHES_PER_HOUR_THRESHOLD = 10;

export function calculateFocusScore(
  productiveSeconds: number,
  distractingSeconds: number,
): number | null {
  const total = productiveSeconds + distractingSeconds;
  if (total === 0) return null;
  return Math.round((productiveSeconds / total) * 100);
}

const BROWSING_TREND_PERIODS = [7, 15, 30] as const;
type BrowsingTrendPeriod = (typeof BROWSING_TREND_PERIODS)[number];

function assertTrendPeriod(n: number): BrowsingTrendPeriod {
  if (n === 7 || n === 15 || n === 30) return n;
  return 7;
}

/** Last `days` calendar labels in `timezone` (approx — same approach as many dashboards). */
function browsingTrendDateKeys(timezone: string, days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = Date.now() - i * 86_400_000;
    keys.push(toDateString(new Date(t), timezone));
  }
  return keys;
}

function serializeUserBrowsingMetrics(
  doc: import("../models/user-browsing-metrics.model").IUserBrowsingMetrics,
) {
  const o = doc as unknown as Record<string, unknown>;
  const { _id, __v, userId, ...rest } = o;
  return {
    id: String(_id),
    userId: String(userId),
    ...rest,
  };
}

function emptyToday(): IUserBrowsingMetricsToday {
  return {
    totalActiveTime: 0,
    sitesVisited: 0,
    topSite: null,
    topSiteLabel: null,
    topSiteTime: 0,
    focusScore: null,
    longestSession: 0,
    longestSessionStart: null,
    longestSessionEnd: null,
    productiveTime: 0,
    distractingTime: 0,
    neutralTime: 0,
    contextSwitches: 0,
    deepFocusSessions: 0,
    sessionCount: 0,
    scatteredPeriods: 0,
    topCategorySlug: null,
  };
}

function emptyPeriod(): IUserBrowsingMetricsPeriod {
  return {
    totalActiveTime: 0,
    sitesVisited: 0,
    focusScore: null,
    productiveTime: 0,
    distractingTime: 0,
    neutralTime: 0,
    topSite: null,
    topSiteLabel: null,
    topCategorySlug: null,
    longestSession: 0,
  };
}

const DEFAULT_USER_BROWSING_PREV: IUserBrowsingMetricsPrev = {
  todayTotalTime: 0,
  todayFocusScore: null,
  todaySitesVisited: 0,
  todayLongestSession: 0,
  todayProductiveTime: 0,
  todayContextSwitches: 0,
  todaySessionCount: 0,
  todayDeepFocusSessions: 0,
  todayScatteredPeriods: 0,
  weekTotalTime: 0,
  weekFocusScore: null,
  monthTotalTime: 0,
  monthFocusScore: null,
};

function countContextSwitches(
  rows: { domain: string; durationSeconds: number }[],
): number {
  const relevant = rows.filter(
    (r) => r.durationSeconds >= MICRO_SESSION_SECONDS,
  );
  let n = 0;
  for (let i = 1; i < relevant.length; i++) {
    const cur = relevant[i];
    const prevRow = relevant[i - 1];
    if (!cur || !prevRow) continue;
    if (cur.domain !== prevRow.domain) n += 1;
  }
  return n;
}

function countDeepFocus(rows: { durationSeconds: number }[]): number {
  return rows.filter((r) => r.durationSeconds >= DEEP_FOCUS_MIN_SECONDS).length;
}

function countScatteredPeriods(
  sessions: { domain: string; durationSeconds: number; startedAt: Date }[],
  timezone: string,
): number {
  const relevant = sessions.filter(
    (r) => r.durationSeconds >= MICRO_SESSION_SECONDS,
  );
  if (relevant.length < 2) return 0;

  const switchesPerHour = new Map<number, number>();
  for (let i = 1; i < relevant.length; i++) {
    const cur = relevant[i];
    const prevRow = relevant[i - 1];
    if (!cur || !prevRow) continue;
    if (cur.domain === prevRow.domain) continue;
    const hour = hourOfDayInTimezone(new Date(cur.startedAt), timezone);
    switchesPerHour.set(hour, (switchesPerHour.get(hour) ?? 0) + 1);
  }

  let periods = 0;
  for (const c of switchesPerHour.values()) {
    if (c >= SCATTERED_SWITCHES_PER_HOUR_THRESHOLD) periods += 1;
  }
  return periods;
}

export const BrowsingMetricsService = {
  async buildSnapshotsFromExtensionSessions(
    sessions: ExtensionSession[],
  ): Promise<BrowsingMetricsSessionSnapshot[]> {
    if (sessions.length === 0) return [];
    const domains = [
      ...new Set(sessions.map((s) => s.domain.trim().toLowerCase())),
    ];
    const classifications =
      await DomainClassificationRepository.findByDomains(domains);
    const byDomain = new Map(classifications.map((c) => [c.domain, c]));
    const slugs = [
      ...new Set(classifications.map((c) => c.categorySlug).filter(Boolean)),
    ];
    const categories = await BrowsingCategoryRepository.findBySlugs(slugs);
    const bySlug = new Map(categories.map((c) => [c.slug, c]));

    return sessions.map((s) => {
      const d = s.domain.trim().toLowerCase();
      const dc = byDomain.get(d);
      const slug = dc?.categorySlug ?? "other";
      const cat = bySlug.get(slug);
      const productivityType: BrowsingProductivityType =
        cat?.productivityType ?? "neutral";
      return {
        sessionId: s.sessionId,
        domain: d,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds: s.durationSeconds,
        categorySlug: slug,
        label: dc?.label ?? s.domain,
        productivityType,
      };
    });
  },

  async processIngestJob(
    userId: string,
    sessions: BrowsingMetricsSessionSnapshot[],
  ): Promise<void> {
    if (sessions.length === 0) return;

    const user = await UserRepository.findById(userId);
    if (!user) {
      logger.warn({ userId }, "Browsing metrics job: user not found");
      return;
    }

    const tz = user.timezone ?? "UTC";
    const userOid = new Types.ObjectId(userId);
    const affectedDates = new Set<string>();

    for (const s of sessions) {
      const localDate = toDateString(new Date(s.startedAt), tz);
      affectedDates.add(localDate);

      await BrowsingDomainStats.updateOne(
        { userId: userOid, date: localDate, domain: s.domain },
        {
          $inc: {
            totalActiveTime: s.durationSeconds,
            visitCount: 1,
          },
          $max: { longestSession: s.durationSeconds },
          $set: {
            timezone: tz,
            label: s.label,
            categorySlug: s.categorySlug,
            productivityType: s.productivityType,
            updatedAt: new Date(),
          },
          // No path may appear in more than one update operator (`$set` / `$inc` / `$max` / `$setOnInsert`).
          $setOnInsert: {
            userId: userOid,
            date: localDate,
            domain: s.domain,
          },
        },
        { upsert: true },
      ).exec();
    }

    for (const dateStr of affectedDates) {
      await BrowsingMetricsService.rebuildDailyAndCategoryForDate(
        userId,
        tz,
        dateStr,
      );
    }

    await BrowsingMetricsService.rebuildUserBrowsingMetrics(userId, tz);

    logger.info(
      {
        userId,
        sessionCount: sessions.length,
        affectedDatesCount: affectedDates.size,
      },
      "browsing-metrics: processIngestJob finished (stats + user rollup updated)",
    );
  },

  async rebuildDailyAndCategoryForDate(
    userId: string,
    tz: string,
    dateStr: string,
  ): Promise<void> {
    const userOid = new Types.ObjectId(userId);
    const domains = await BrowsingDomainStats.find({
      userId: userOid,
      date: dateStr,
    })
      .lean()
      .exec();

    let totalActiveTime = 0;
    let productiveTime = 0;
    let distractingTime = 0;
    let neutralTime = 0;
    let longestSession = 0;

    for (const d of domains) {
      totalActiveTime += d.totalActiveTime;
      longestSession = Math.max(longestSession, d.longestSession);
      if (d.productivityType === "productive")
        productiveTime += d.totalActiveTime;
      else if (d.productivityType === "distracting")
        distractingTime += d.totalActiveTime;
      else neutralTime += d.totalActiveTime;
    }

    const focusScore = calculateFocusScore(productiveTime, distractingTime);
    const sitesVisited = domains.length;

    const sessions = await BrowsingSessionRepository.findForLocalDate(
      userId,
      tz,
      dateStr,
    );
    const forSwitch = sessions.map((x) => ({
      domain: x.domain,
      durationSeconds: x.durationSeconds,
    }));
    const contextSwitches = countContextSwitches(forSwitch);
    const deepFocusSessions = countDeepFocus(
      sessions.map((x) => ({ durationSeconds: x.durationSeconds })),
    );
    const sessionCount = sessions.length;
    const scatteredPeriods = countScatteredPeriods(
      sessions.map((x) => ({
        domain: x.domain,
        durationSeconds: x.durationSeconds,
        startedAt: new Date(x.startedAt),
      })),
      tz,
    );

    await BrowsingDailyStats.findOneAndUpdate(
      { userId: userOid, date: dateStr },
      {
        $set: {
          timezone: tz,
          totalActiveTime,
          productiveTime,
          distractingTime,
          neutralTime,
          focusScore,
          sitesVisited,
          longestSession,
          contextSwitches,
          deepFocusSessions,
          sessionCount,
          scatteredPeriods,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    ).exec();

    const byCat = new Map<
      string,
      { time: number; rows: { domain: string; label: string; time: number }[] }
    >();

    for (const d of domains) {
      const cur = byCat.get(d.categorySlug) ?? { time: 0, rows: [] };
      cur.time += d.totalActiveTime;
      cur.rows.push({
        domain: d.domain,
        label: d.label,
        time: d.totalActiveTime,
      });
      byCat.set(d.categorySlug, cur);
    }

    for (const [categorySlug, v] of byCat) {
      const top = v.rows.reduce((a, b) => (a.time >= b.time ? a : b));
      await BrowsingCategoryStats.findOneAndUpdate(
        { userId: userOid, date: dateStr, categorySlug },
        {
          $set: {
            timezone: tz,
            totalActiveTime: v.time,
            sitesVisited: v.rows.length,
            topDomain: top.domain,
            topDomainLabel: top.label,
            topDomainTime: top.time,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      ).exec();
    }
  },

  async rebuildUserBrowsingMetrics(userId: string, tz: string): Promise<void> {
    const userOid = new Types.ObjectId(userId);
    const now = new Date();
    const todayStr = toDateString(now, tz);
    const weekStart = getMondayString(now, tz);
    const monthStart = getMonthStartString(now, tz);

    const todayRow = await BrowsingDailyStats.findOne({
      userId: userOid,
      date: todayStr,
    })
      .lean()
      .exec();

    const topDomainRow = await BrowsingDomainStats.findOne({
      userId: userOid,
      date: todayStr,
    })
      .sort({ totalActiveTime: -1 })
      .lean()
      .exec();

    const sessionsToday = await BrowsingSessionRepository.findForLocalDate(
      userId,
      tz,
      todayStr,
    );

    const sessionCountFromSessions = sessionsToday.length;
    const scatteredFromSessions = countScatteredPeriods(
      sessionsToday.map((x) => ({
        domain: x.domain,
        durationSeconds: x.durationSeconds,
        startedAt: new Date(x.startedAt),
      })),
      tz,
    );

    let sumFromSessions = 0;
    let longest = 0;
    let longestStart: string | null = null;
    let longestEnd: string | null = null;
    for (const s of sessionsToday) {
      sumFromSessions += s.durationSeconds;
      if (s.durationSeconds > longest) {
        longest = s.durationSeconds;
        longestStart = new Date(s.startedAt).toISOString();
        longestEnd = new Date(s.endedAt).toISOString();
      }
    }

    const uniqueSitesToday = new Set(sessionsToday.map((s) => s.domain)).size;

    const forSwitch = sessionsToday.map((x) => ({
      domain: x.domain,
      durationSeconds: x.durationSeconds,
    }));
    const contextSwitchesFromSessions = countContextSwitches(forSwitch);
    const deepFocusFromSessions = countDeepFocus(
      sessionsToday.map((x) => ({ durationSeconds: x.durationSeconds })),
    );

    /**
     * `totalActiveTime` / per-domain aggregates in BrowsingDailyStats can drift from raw
     * BrowsingSession rows (ordering, partial rebuilds). Longest session was taken from
     * sessions while total came from daily — impossible states like total < longest.
     * When we have sessions for today, totals + longest + sites + switch counts come from
     * that single list; productivity split is scaled from daily when possible.
     */
    let today: IUserBrowsingMetricsToday;

    if (todayRow && sessionsToday.length > 0) {
      if (sumFromSessions !== todayRow.totalActiveTime) {
        logger.warn(
          {
            userId,
            date: todayStr,
            sumFromSessions,
            dailyTotalActiveTime: todayRow.totalActiveTime,
          },
          "browsing metrics: today totalActiveTime reconciled from sessions (daily mismatch)",
        );
      }

      let productiveTime = todayRow.productiveTime;
      let distractingTime = todayRow.distractingTime;
      let neutralTime = todayRow.neutralTime;
      const splitSum = productiveTime + distractingTime + neutralTime;

      if (todayRow.totalActiveTime > 0 && splitSum > 0) {
        const scale = sumFromSessions / todayRow.totalActiveTime;
        productiveTime = Math.round(todayRow.productiveTime * scale);
        distractingTime = Math.round(todayRow.distractingTime * scale);
        neutralTime = Math.max(
          0,
          sumFromSessions - productiveTime - distractingTime,
        );
      } else if (sumFromSessions > 0) {
        productiveTime = 0;
        distractingTime = 0;
        neutralTime = sumFromSessions;
      }

      const focusScore = calculateFocusScore(productiveTime, distractingTime);

      today = {
        totalActiveTime: sumFromSessions,
        sitesVisited: uniqueSitesToday,
        topSite: topDomainRow?.domain ?? null,
        topSiteLabel: topDomainRow?.label ?? null,
        topSiteTime: topDomainRow?.totalActiveTime ?? 0,
        focusScore,
        longestSession: longest,
        longestSessionStart: longestStart,
        longestSessionEnd: longestEnd,
        productiveTime,
        distractingTime,
        neutralTime,
        contextSwitches: contextSwitchesFromSessions,
        deepFocusSessions: deepFocusFromSessions,
        sessionCount: sessionCountFromSessions,
        scatteredPeriods: scatteredFromSessions,
        topCategorySlug: null,
      };
    } else if (todayRow) {
      today = {
        totalActiveTime: todayRow.totalActiveTime,
        sitesVisited: todayRow.sitesVisited,
        topSite: topDomainRow?.domain ?? null,
        topSiteLabel: topDomainRow?.label ?? null,
        topSiteTime: topDomainRow?.totalActiveTime ?? 0,
        focusScore: todayRow.focusScore,
        longestSession: todayRow.longestSession,
        longestSessionStart: longestStart,
        longestSessionEnd: longestEnd,
        productiveTime: todayRow.productiveTime,
        distractingTime: todayRow.distractingTime,
        neutralTime: todayRow.neutralTime,
        contextSwitches: todayRow.contextSwitches,
        deepFocusSessions: todayRow.deepFocusSessions,
        sessionCount: todayRow.sessionCount ?? 0,
        scatteredPeriods: todayRow.scatteredPeriods ?? 0,
        topCategorySlug: null,
      };
    } else if (sessionsToday.length > 0) {
      today = {
        totalActiveTime: sumFromSessions,
        sitesVisited: uniqueSitesToday,
        topSite: topDomainRow?.domain ?? null,
        topSiteLabel: topDomainRow?.label ?? null,
        topSiteTime: topDomainRow?.totalActiveTime ?? 0,
        focusScore: null,
        longestSession: longest,
        longestSessionStart: longestStart,
        longestSessionEnd: longestEnd,
        productiveTime: 0,
        distractingTime: 0,
        neutralTime: sumFromSessions,
        contextSwitches: contextSwitchesFromSessions,
        deepFocusSessions: deepFocusFromSessions,
        sessionCount: sessionCountFromSessions,
        scatteredPeriods: scatteredFromSessions,
        topCategorySlug: null,
      };
    } else {
      today = emptyToday();
    }

    if (topDomainRow && today.topCategorySlug === null) {
      today.topCategorySlug = topDomainRow.categorySlug;
    }

    const dailiesWeek = await BrowsingDailyStats.find({
      userId: userOid,
      date: { $gte: weekStart, $lte: todayStr },
    })
      .lean()
      .exec();

    const week = aggregatePeriodFromDailies(dailiesWeek);
    week.sitesVisited = (
      await BrowsingSessionRepository.distinctDomainsInLocalDateRange(
        userId,
        tz,
        weekStart,
        todayStr,
      )
    ).length;

    const topWeek = await BrowsingDomainStats.aggregate<{
      _id: string;
      totalActiveTime: number;
      label: string;
    }>([
      {
        $match: {
          userId: userOid,
          date: { $gte: weekStart, $lte: todayStr },
        },
      },
      {
        $group: {
          _id: "$domain",
          totalActiveTime: { $sum: "$totalActiveTime" },
          label: { $first: "$label" },
        },
      },
      { $sort: { totalActiveTime: -1 } },
      { $limit: 1 },
    ]);
    if (topWeek[0]) {
      week.topSite = topWeek[0]._id;
      week.topSiteLabel = topWeek[0].label;
    }

    const dailiesMonth = await BrowsingDailyStats.find({
      userId: userOid,
      date: { $gte: monthStart, $lte: todayStr },
    })
      .lean()
      .exec();

    const month = aggregatePeriodFromDailies(dailiesMonth);
    month.sitesVisited = (
      await BrowsingSessionRepository.distinctDomainsInLocalDateRange(
        userId,
        tz,
        monthStart,
        todayStr,
      )
    ).length;

    const topMonth = await BrowsingDomainStats.aggregate<{
      _id: string;
      totalActiveTime: number;
      label: string;
    }>([
      {
        $match: {
          userId: userOid,
          date: { $gte: monthStart, $lte: todayStr },
        },
      },
      {
        $group: {
          _id: "$domain",
          totalActiveTime: { $sum: "$totalActiveTime" },
          label: { $first: "$label" },
        },
      },
      { $sort: { totalActiveTime: -1 } },
      { $limit: 1 },
    ]);
    if (topMonth[0]) {
      month.topSite = topMonth[0]._id;
      month.topSiteLabel = topMonth[0].label;
    }

    const existing = await UserBrowsingMetricsRepository.findByUserId(userId);

    const prevMerged: IUserBrowsingMetricsPrev = {
      ...DEFAULT_USER_BROWSING_PREV,
      ...(existing?.prev as IUserBrowsingMetricsPrev | undefined),
    };

    await UserBrowsingMetricsRepository.upsertFull(userId, {
      todayDate: todayStr,
      weekStart,
      monthStart,
      today,
      week,
      month,
      prev: prevMerged,
    });
  },

  async getMetricsForUser(userId: string) {
    const doc = await UserBrowsingMetricsRepository.findByUserId(userId);
    if (!doc) return null;
    const out = serializeUserBrowsingMetrics(doc) as Record<string, unknown>;
    const today = out.today as Record<string, unknown> | undefined;
    const totalActiveTime = Number(today?.totalActiveTime ?? 0);
    const storedSessionCount = Number(today?.sessionCount ?? 0);

    /** Legacy / partial rollups can miss `sessionCount` while other today fields are set. */
    if (today && totalActiveTime > 0 && storedSessionCount === 0) {
      const user = await UserRepository.findById(userId);
      const tz = user?.timezone ?? "UTC";
      const todayStr = toDateString(new Date(), tz);
      const n = await BrowsingSessionRepository.countForLocalDate(
        userId,
        tz,
        todayStr,
      );
      if (n > 0) {
        out.today = { ...today, sessionCount: n };
      }
    }

    return out;
  },

  async getDailyTrend(
    userId: string,
    timezone: string,
    periodRaw: number,
  ): Promise<
    {
      date: string;
      totalActiveTime: number;
      productiveTime: number;
      distractingTime: number;
      neutralTime: number;
      focusScore: number | null;
      sitesVisited: number;
    }[]
  > {
    const period = assertTrendPeriod(periodRaw);
    const keys = browsingTrendDateKeys(timezone, period);
    const start = keys[0] ?? toDateString(new Date(), timezone);
    const end = keys[keys.length - 1] ?? start;

    const rows = await BrowsingDailyStatsRepository.findByUserAndDateRange(
      userId,
      start,
      end,
    );
    const byDate = new Map(rows.map((r) => [r.date, r]));

    return keys.map((date) => {
      const r = byDate.get(date);
      const productiveTime = r?.productiveTime ?? 0;
      const distractingTime = r?.distractingTime ?? 0;
      return {
        date,
        totalActiveTime: r?.totalActiveTime ?? 0,
        productiveTime,
        distractingTime,
        neutralTime: r?.neutralTime ?? 0,
        focusScore:
          r?.focusScore === undefined || r?.focusScore === null
            ? calculateFocusScore(productiveTime, distractingTime)
            : r.focusScore,
        sitesVisited: r?.sitesVisited ?? 0,
      };
    });
  },

  async getDomainsForStatsPeriod(
    userId: string,
    timezone: string,
    period: BrowsingStatsPeriod,
    limit?: number,
    anchorDate?: string,
  ): Promise<{
    domains: BrowsingDomainStatsPeriodRow[];
    totalActiveTime: number;
  }> {
    const { from, to } = getStatsPeriodDateBounds(period, timezone, anchorDate);
    const endDateLabel = to ?? toDateString(new Date(), timezone);
    const { rows, totalActiveTime } =
      await BrowsingDomainStatsRepository.aggregateTopByUserAndPeriod(
        userId,
        from,
        to,
        endDateLabel,
        limit,
      );
    const domainKeys = [...new Set(rows.map((r) => r.domain))];
    const classifications =
      await DomainClassificationRepository.findByDomains(domainKeys);
    const brandByDomain = new Map(classifications.map((c) => [c.domain, c]));

    const domains: BrowsingDomainStatsPeriodRow[] = rows.map((r) => {
      const c = brandByDomain.get(r.domain);
      return {
        _id: r._id,
        userId: r.userId,
        date: r.date,
        timezone: r.timezone,
        domain: r.domain,
        label: r.label,
        categorySlug: r.categorySlug,
        productivityType: r.productivityType,
        totalActiveTime: r.totalActiveTime,
        visitCount: r.visitCount,
        longestSession: r.longestSession,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        domainLogo: c?.domainLogo ?? null,
        domainColor: c?.domainColor ?? null,
      };
    });

    return { domains, totalActiveTime };
  },

  async getCategoriesForStatsPeriod(
    userId: string,
    timezone: string,
    period: BrowsingStatsPeriod,
    limit?: number,
    anchorDate?: string,
  ) {
    const { from, to } = getStatsPeriodDateBounds(period, timezone, anchorDate);
    const endDateLabel = to ?? toDateString(new Date(), timezone);
    const rows =
      await BrowsingCategoryStatsRepository.aggregateTopByUserAndPeriod(
        userId,
        from,
        to,
        endDateLabel,
        limit,
      );
    const catalog = await BrowsingCategoryRepository.findAllActive();
    const catBySlug = new Map(catalog.map((c) => [c.slug, c]));

    const totalTime = rows.reduce((s, r) => s + r.totalActiveTime, 0);

    return rows.map((r) => {
      const meta = catBySlug.get(r.categorySlug);
      const percentage =
        totalTime > 0 ? Math.round((r.totalActiveTime / totalTime) * 100) : 0;
      return {
        categorySlug: r.categorySlug,
        name: meta?.name ?? r.categorySlug,
        icon: meta?.icon ?? "Globe",
        color: meta?.color ?? "#6B7280",
        productivityType: meta?.productivityType ?? "neutral",
        totalActiveTime: r.totalActiveTime,
        sitesVisited: r.sitesVisited,
        topDomain: r.topDomain,
        topDomainLabel: r.topDomainLabel,
        topDomainTime: r.topDomainTime,
        percentage,
      };
    });
  },

  /**
   * After AI classifies a domain, existing `BrowsingDomainStats` may still show the
   * ingest-time category (e.g. "other" → neutral). Copy the new slug + productivity
   * from `BrowsingCategory` and rebuild daily / user rollups for affected users.
   */
  async syncStatsAfterDomainClassification(domain: string): Promise<void> {
    const normalized = domain.trim().toLowerCase();
    const dc = await DomainClassificationRepository.findByDomain(normalized);
    if (!dc?.categorySlug) {
      logger.warn(
        { domain: normalized },
        "syncStatsAfterDomainClassification: no classification doc",
      );
      return;
    }

    const cats = await BrowsingCategoryRepository.findBySlugs([
      dc.categorySlug,
    ]);
    const cat = cats[0];
    const productivityType: BrowsingProductivityType =
      cat?.productivityType ?? "neutral";
    const categorySlug = dc.categorySlug;

    const updateResult = await BrowsingDomainStats.updateMany(
      { domain: normalized },
      {
        $set: {
          categorySlug,
          productivityType,
          label: dc.label ?? normalized,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return;
    }

    const pairs = await BrowsingDomainStats.aggregate<{
      _id: { userId: Types.ObjectId; date: string };
    }>([
      { $match: { domain: normalized } },
      { $group: { _id: { userId: "$userId", date: "$date" } } },
    ]);

    const userIdsToRebuild = new Set<string>();

    for (const row of pairs) {
      const userId = String(row._id.userId);
      const dateStr = row._id.date;
      const user = await UserRepository.findById(userId);
      const tz = user?.timezone ?? "UTC";
      userIdsToRebuild.add(userId);
      await BrowsingMetricsService.rebuildDailyAndCategoryForDate(
        userId,
        tz,
        dateStr,
      );
    }

    for (const userId of userIdsToRebuild) {
      const user = await UserRepository.findById(userId);
      const tz = user?.timezone ?? "UTC";
      await BrowsingMetricsService.rebuildUserBrowsingMetrics(userId, tz);
    }

    logger.info(
      {
        domain: normalized,
        pairs: pairs.length,
        users: userIdsToRebuild.size,
      },
      "browsing metrics: synced domain stats after classification",
    );
  },
};

function aggregatePeriodFromDailies(
  rows: {
    totalActiveTime: number;
    productiveTime: number;
    distractingTime: number;
    neutralTime: number;
    longestSession: number;
    sitesVisited: number;
  }[],
): IUserBrowsingMetricsPeriod {
  if (rows.length === 0) return emptyPeriod();
  let totalActiveTime = 0;
  let productiveTime = 0;
  let distractingTime = 0;
  let neutralTime = 0;
  let longestSession = 0;
  for (const r of rows) {
    totalActiveTime += r.totalActiveTime;
    productiveTime += r.productiveTime;
    distractingTime += r.distractingTime;
    neutralTime += r.neutralTime;
    longestSession = Math.max(longestSession, r.longestSession);
  }
  return {
    totalActiveTime,
    sitesVisited: 0,
    focusScore: calculateFocusScore(productiveTime, distractingTime),
    productiveTime,
    distractingTime,
    neutralTime,
    topSite: null,
    topSiteLabel: null,
    topCategorySlug: null,
    longestSession,
  };
}
