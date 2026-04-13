// api/src/jobs/queues.ts
import { Queue, type JobsOptions } from "bullmq";
import { getBullMQConnection } from "../config/redis";
import { logger } from "../utils/logger";
import type { BrowsingMetricsJobData } from "../types/browsing-metrics-job.types";
import type { DomainClassificationJobData } from "../types/domain-classification-job.types";
import type { StreakCheckJobData } from "../types/streak-check-job.types";

export const QUEUE_NAMES = {
  AI_INSIGHTS: "ai-insights",
  METRICS_ROLLUP: "metrics-rollup",
  STREAK_CHECK: "streak-check",
  EMAIL_DIGEST: "email-digest",
  DOWNLOAD_REMOVAL: "download-removal",
  BROWSING_METRICS: "browsing-metrics",
  DOMAIN_CLASSIFICATION: "domain-classification",
} as const;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

export interface RemovalJobData {
  userId: string;
  savedPath: string;
  hash: string;
}

export const metricsRollupQueue = new Queue(QUEUE_NAMES.METRICS_ROLLUP, {
  connection: getBullMQConnection(),
  defaultJobOptions,
});

export const removalQueue = new Queue<RemovalJobData>(
  QUEUE_NAMES.DOWNLOAD_REMOVAL,
  {
    connection: getBullMQConnection(),
    defaultJobOptions,
  },
);

export const browsingMetricsQueue = new Queue<BrowsingMetricsJobData>(
  QUEUE_NAMES.BROWSING_METRICS,
  {
    connection: getBullMQConnection(),
    defaultJobOptions,
  },
);

export const streakCheckQueue = new Queue<StreakCheckJobData>(
  QUEUE_NAMES.STREAK_CHECK,
  {
    connection: getBullMQConnection(),
    defaultJobOptions,
  },
);

export async function enqueueBrowsingMetricsJob(
  data: BrowsingMetricsJobData,
): Promise<void> {
  const job = await browsingMetricsQueue.add("recompute", data);
  const counts = await browsingMetricsQueue.getJobCounts(
    "waiting",
    "active",
    "delayed",
  );
  logger.info(
    {
      queue: QUEUE_NAMES.BROWSING_METRICS,
      jobName: "recompute",
      jobId: job.id,
      userId: data.userId,
      sessionCount: data.sessions.length,
      queueWaiting: counts.waiting,
      queueActive: counts.active,
      queueDelayed: counts.delayed,
    },
    "browsing-metrics job enqueued",
  );
}

export const domainClassificationQueue = new Queue<DomainClassificationJobData>(
  QUEUE_NAMES.DOMAIN_CLASSIFICATION,
  {
    connection: getBullMQConnection(),
    defaultJobOptions,
  },
);

export async function enqueueDomainClassificationJob(
  data: DomainClassificationJobData,
): Promise<void> {
  const job = await domainClassificationQueue.add("classify", data);
  const counts = await domainClassificationQueue.getJobCounts(
    "waiting",
    "active",
    "delayed",
  );
  const scope =
    data.domains && data.domains.length > 0
      ? "explicit-domains"
      : "pending-drain";
  logger.info(
    {
      queue: QUEUE_NAMES.DOMAIN_CLASSIFICATION,
      jobName: "classify",
      jobId: job.id,
      scope,
      domainHintCount: data.domains?.length ?? 0,
      queueWaiting: counts.waiting,
      queueActive: counts.active,
      queueDelayed: counts.delayed,
    },
    "domain-classification job enqueued",
  );
}

export async function enqueueStreakCheckJob(
  data: StreakCheckJobData,
): Promise<void> {
  const job = await streakCheckQueue.add("evaluate-streak", data);
  const counts = await streakCheckQueue.getJobCounts(
    "waiting",
    "active",
    "delayed",
  );

  logger.info(
    {
      queue: QUEUE_NAMES.STREAK_CHECK,
      jobName: "evaluate-streak",
      jobId: job.id,
      userId: data.userId,
      domainCount: data.domains.length,
      queueWaiting: counts.waiting,
      queueActive: counts.active,
      queueDelayed: counts.delayed,
    },
    "streak-check job enqueued",
  );
}

export function getRemovalJobId(userId: string, hash: string): string {
  return `remove:${userId}:${hash}`;
}

export async function cancelRemovalJob(
  userId: string,
  hash: string,
): Promise<boolean> {
  const jobId = getRemovalJobId(userId, hash);
  const job = await removalQueue.getJob(jobId);

  if (!job) return false;

  await job.remove();
  return true;
}

export async function cancelAllRemovalJobsForUser(
  userId: string,
): Promise<number> {
  const jobs = await removalQueue.getJobs([
    "waiting",
    "active",
    "delayed",
    "paused",
    "prioritized",
  ]);

  const prefix = `remove:${userId}:`;
  let removedCount = 0;

  for (const job of jobs) {
    const id = String(job.id ?? "");
    if (!id.startsWith(prefix)) continue;

    try {
      await job.remove();
      removedCount += 1;
    } catch (error) {
      logger.warn(
        { jobId: job.id, error: (error as Error).message },
        "Failed to remove BullMQ removal job",
      );
    }
  }

  return removedCount;
}
