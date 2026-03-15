import { Worker } from "bullmq";
import { redis, getBullMQConnection } from "../../config/redis";
import { QUEUE_NAMES } from "../queues";
import { UserModel } from "../../models/user.model";
import { UserDownloadMetrics } from "../../models/download-metrics.model";
import {
  isAtMidnight,
  toDateString,
  getMondayString,
  getMonthStartString,
} from "../../utils/date.utils";
import { logger } from "../../utils/logger";

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
    if (metricsDocs.length === 0) return;

    const bulkOps = metricsDocs.map((doc) => {
      const tz =
        timezoneMap[(doc.userId as { toString(): string }).toString()] ?? "UTC";
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

    await UserDownloadMetrics.bulkWrite(bulkOps, { ordered: false });

    logger.info(
      {
        zonesProcessed: midnightZones.length,
        usersProcessed: metricsDocs.length,
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
