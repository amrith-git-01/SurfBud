import { Worker } from "bullmq";
import { getBullMQConnection } from "../../config/redis";
import { enqueueStreakCheckJob, QUEUE_NAMES } from "../queues";
import { BrowsingMetricsService } from "../../services/browsing-metrics.service";
import { UserRepository } from "../../repositories/user.repository";
import { sseManager } from "../../sse/sse.manager";
import { logger } from "../../utils/logger";
import type { BrowsingMetricsJobData } from "../../types/browsing-metrics-job.types";

export const browsingMetricsWorker = new Worker<BrowsingMetricsJobData>(
  QUEUE_NAMES.BROWSING_METRICS,
  async (job) => {
    const { userId, sessions } = job.data;
    const startedAt = Date.now();
    logger.info(
      {
        queue: QUEUE_NAMES.BROWSING_METRICS,
        jobId: job.id,
        userId,
        sessionCount: sessions.length,
        attemptsMade: job.attemptsMade,
      },
      "browsing-metrics job: processing",
    );
    await BrowsingMetricsService.processIngestJob(userId, sessions);

    sseManager.emitBrowsingSynced(userId, {
      sessionCount: sessions.length,
      syncedAt: new Date().toISOString(),
    });

    const domains = [...new Set(sessions.map((session) => session.domain))];
    const user = await UserRepository.findById(userId);
    await enqueueStreakCheckJob({
      userId,
      domains,
      timezone: user?.timezone ?? "UTC",
    });

    logger.info(
      {
        queue: QUEUE_NAMES.BROWSING_METRICS,
        jobId: job.id,
        userId,
        sessionCount: sessions.length,
        durationMs: Date.now() - startedAt,
      },
      "browsing-metrics job: completed",
    );
  },
  { connection: getBullMQConnection(), concurrency: 5 },
);

browsingMetricsWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      userId: job?.data?.userId,
      sessionCount: job?.data?.sessions?.length,
      attemptsMade: job?.attemptsMade,
      error: err?.message,
    },
    "browsing-metrics job failed",
  );
});
