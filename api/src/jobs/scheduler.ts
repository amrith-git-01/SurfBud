import { metricsRollupQueue } from "./queues";
import { redis } from "../config/redis";
import { UserModel } from "../models/user.model";
import { logger } from "../utils/logger";

export async function startScheduler(): Promise<void> {
  const zones = await UserModel.distinct("timezone");
  await redis.set("active:timezones", JSON.stringify(zones));
  logger.info(
    { count: zones.length },
    "active:timezones cache built",
  );

  const existing = await metricsRollupQueue.getRepeatableJobs();
  for (const job of existing) {
    await metricsRollupQueue.removeRepeatableByKey(job.key);
  }

  await metricsRollupQueue.add(
    "metrics-rollup",
    {},
    {
      repeat: { pattern: "*/30 * * * *" },
      jobId: "metrics-rollup",
    },
  );

  logger.info("Scheduler started — metrics-rollup registered (every 30 min)");
}
