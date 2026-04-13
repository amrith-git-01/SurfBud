import { Worker } from "bullmq";
import { getBullMQConnection } from "../../config/redis";
import { StreakService } from "../../services/streak.service";
import type { StreakCheckJobData } from "../../types/streak-check-job.types";
import { logger } from "../../utils/logger";
import { QUEUE_NAMES } from "../queues";

export const streakCheckWorker = new Worker<StreakCheckJobData>(
  QUEUE_NAMES.STREAK_CHECK,
  async (job) => {
    const startedAt = Date.now();
    logger.info(
      {
        queue: QUEUE_NAMES.STREAK_CHECK,
        jobId: job.id,
        userId: job.data.userId,
        domainCount: job.data.domains.length,
      },
      "streak-check job: processing",
    );

    await StreakService.evaluateAfterBatch(
      job.data.userId,
      job.data.domains,
      job.data.timezone,
    );

    logger.info(
      {
        queue: QUEUE_NAMES.STREAK_CHECK,
        jobId: job.id,
        userId: job.data.userId,
        domainCount: job.data.domains.length,
        durationMs: Date.now() - startedAt,
      },
      "streak-check job: completed",
    );
  },
  { connection: getBullMQConnection(), concurrency: 4 },
);

streakCheckWorker.on("failed", (job, err) => {
  logger.error(
    {
      queue: QUEUE_NAMES.STREAK_CHECK,
      jobId: job?.id,
      userId: job?.data.userId,
      domainCount: job?.data.domains.length,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    },
    "streak-check job failed",
  );
});
