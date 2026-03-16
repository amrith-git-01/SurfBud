// api/src/jobs/queues.ts
import { Queue, type JobsOptions } from "bullmq";
import { getBullMQConnection } from "../config/redis";
import { logger } from "../utils/logger";

export const QUEUE_NAMES = {
  AI_INSIGHTS: "ai-insights",
  METRICS_ROLLUP: "metrics-rollup",
  STREAK_CHECK: "streak-check",
  EMAIL_DIGEST: "email-digest",
  DOWNLOAD_REMOVAL: "download-removal",
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

export function getRemovalJobId(userId: string, hash: string): string {
  return `remove:${userId}:${hash}`;
}

export async function scheduleRemoval(
  userId: string,
  savedPath: string,
  hash: string,
  gracePeriod: number,
): Promise<string> {
  const jobId = getRemovalJobId(userId, hash);
  const existing = await removalQueue.getJob(jobId);

  if (existing) {
    await existing.remove();
  }

  await removalQueue.add(
    "remove-duplicate",
    { userId, savedPath, hash },
    {
      jobId,
      delay: gracePeriod * 60 * 1000,
    },
  );

  return jobId;
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