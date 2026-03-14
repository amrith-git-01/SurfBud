import { Queue } from "bullmq";
import { getBullMQConnection } from "../config/redis";

export const QUEUE_NAMES = {
  AI_INSIGHTS: "ai-insights",
  METRICS_ROLLUP: "metrics-rollup",
  STREAK_CHECK: "streak-check",
  EMAIL_DIGEST: "email-digest",
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

export const metricsRollupQueue = new Queue(QUEUE_NAMES.METRICS_ROLLUP, {
  connection: getBullMQConnection(),
  defaultJobOptions,
});
