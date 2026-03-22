import { Worker } from "bullmq";
import { Types } from "mongoose";
import { redis, getBullMQConnection } from "../../config/redis";
import { QUEUE_NAMES } from "../queues";
import { UserModel } from "../../models/user.model";
import { UserDownloadMetrics } from "../../models/download-metrics.model";
import { UserBrowsingMetrics } from "../../models/user-browsing-metrics.model";
import {
  EMPTY_USER_BROWSING_PERIOD,
  EMPTY_USER_BROWSING_TODAY,
} from "../../constants/user-browsing-metrics-rollup.defaults";
import {
  isAtMidnight,
  toDateString,
  getMondayString,
  getMonthStartString,
} from "../../utils/date.utils";
import { logger } from "../../utils/logger";

type LeanUserBrowsingMetrics = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  todayDate?: string;
  weekStart?: string;
  monthStart?: string;
  today?: {
    totalActiveTime?: number;
    focusScore?: number | null;
    sitesVisited?: number;
    longestSession?: number;
    productiveTime?: number;
    contextSwitches?: number;
    sessionCount?: number;
    deepFocusSessions?: number;
    scatteredPeriods?: number;
  };
  week?: {
    totalActiveTime?: number;
    focusScore?: number | null;
  };
  month?: {
    totalActiveTime?: number;
    focusScore?: number | null;
  };
};

export const metricsRollupWorker = new Worker(
  QUEUE_NAMES.METRICS_ROLLUP,
  async () => {
    const activeZones: string[] = JSON.parse(
      (await redis.get("active:timezones")) ?? "[]",
    );
    const midnightZones = activeZones.filter((tz) => isAtMidnight(tz));

    if (midnightZones.length === 0) return;

    const users = await UserModel.find(
      { timezone: { $in: midnightZones } },
      { _id: 1, timezone: 1 },
    )
      .lean()
      .exec();
    if (users.length === 0) return;

    const timezoneMap = Object.fromEntries(
      users.map((u) => [u._id.toString(), u.timezone ?? "UTC"]),
    );
    const userIds = users.map((u) => u._id);

    const metricsDocs = await UserDownloadMetrics.find({
      userId: { $in: userIds },
    })
      .lean()
      .exec();

    const browsingDocs = (await UserBrowsingMetrics.find({
      userId: { $in: userIds },
    })
      .lean()
      .exec()) as LeanUserBrowsingMetrics[];

    if (metricsDocs.length === 0 && browsingDocs.length === 0) {
      logger.info(
        { zonesProcessed: midnightZones.length },
        "metrics-rollup: no download or browsing metrics docs for midnight users",
      );
      return;
    }

    if (metricsDocs.length > 0) {
      const downloadBulkOps = metricsDocs.map((doc) => {
        const tz =
          timezoneMap[(doc.userId as { toString(): string }).toString()] ??
          "UTC";
        const today = toDateString(new Date(), tz);
        const weekStart = getMondayString(new Date(), tz);
        const monthStart = getMonthStartString(new Date(), tz);
        const set: Record<string, unknown> = { updatedAt: new Date() };

        if (doc.todayDate !== today) {
          set.prevTodayCount = doc.todayCount;
          set.todayCount = 0;
          set.todayDate = today;
        }
        if (doc.weekStart !== weekStart) {
          set.prevWeekCount = doc.weekCount;
          set.weekCount = 0;
          set.weekStart = weekStart;
        }
        if (doc.monthStart !== monthStart) {
          set.prevMonthCount = doc.monthCount;
          set.monthCount = 0;
          set.monthStart = monthStart;
        }

        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: set },
          },
        };
      });

      await UserDownloadMetrics.bulkWrite(downloadBulkOps, { ordered: false });
    }

    if (browsingDocs.length > 0) {
      const browsingBulkOps = browsingDocs.map((doc) => {
        const tz = timezoneMap[String(doc.userId)] ?? "UTC";
        const today = toDateString(new Date(), tz);
        const weekStart = getMondayString(new Date(), tz);
        const monthStart = getMonthStartString(new Date(), tz);
        const set: Record<string, unknown> = { updatedAt: new Date() };

        const t = doc.today ?? {};
        const w = doc.week ?? {};
        const m = doc.month ?? {};

        if ((doc.todayDate ?? "") !== today) {
          set["prev.todayTotalTime"] = t.totalActiveTime ?? 0;
          set["prev.todayFocusScore"] =
            t.focusScore === undefined ? null : t.focusScore;
          set["prev.todaySitesVisited"] = t.sitesVisited ?? 0;
          set["prev.todayLongestSession"] = t.longestSession ?? 0;
          set["prev.todayProductiveTime"] = t.productiveTime ?? 0;
          set["prev.todayContextSwitches"] = t.contextSwitches ?? 0;
          set["prev.todaySessionCount"] = t.sessionCount ?? 0;
          set["prev.todayDeepFocusSessions"] = t.deepFocusSessions ?? 0;
          set["prev.todayScatteredPeriods"] = t.scatteredPeriods ?? 0;
          set.today = { ...EMPTY_USER_BROWSING_TODAY };
          set.todayDate = today;
        }

        if ((doc.weekStart ?? "") !== weekStart) {
          set["prev.weekTotalTime"] = w.totalActiveTime ?? 0;
          set["prev.weekFocusScore"] =
            w.focusScore === undefined ? null : w.focusScore;
          set.week = { ...EMPTY_USER_BROWSING_PERIOD };
          set.weekStart = weekStart;
        }

        if ((doc.monthStart ?? "") !== monthStart) {
          set["prev.monthTotalTime"] = m.totalActiveTime ?? 0;
          set["prev.monthFocusScore"] =
            m.focusScore === undefined ? null : m.focusScore;
          set.month = { ...EMPTY_USER_BROWSING_PERIOD };
          set.monthStart = monthStart;
        }

        const meaningfulKeys = Object.keys(set).filter((k) => k !== "updatedAt");
        if (meaningfulKeys.length === 0) {
          return null;
        }

        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: set },
          },
        };
      });

      const browsingWrites = browsingBulkOps.filter(
        (op): op is NonNullable<typeof op> => op !== null,
      );

      if (browsingWrites.length > 0) {
        await UserBrowsingMetrics.bulkWrite(
          browsingWrites as Parameters<
            typeof UserBrowsingMetrics.bulkWrite
          >[0],
          { ordered: false },
        );
      }
    }

    logger.info(
      {
        zonesProcessed: midnightZones.length,
        downloadUsersProcessed: metricsDocs.length,
        browsingUsersProcessed: browsingDocs.length,
      },
      "metrics-rollup complete",
    );
  },
  { connection: getBullMQConnection(), concurrency: 1 },
);

metricsRollupWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, error: err?.message },
    "metrics-rollup job failed",
  );
});
