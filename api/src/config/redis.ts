import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

const redisUrl = env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ — do not remove
  enableReadyCheck: false, // required by BullMQ — do not remove
  lazyConnect: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err: Error) =>
  logger.error({ error: err.message }, "Redis error"),
);
redis.on("close", () => logger.warn("Redis connection closed"));

/** Connection options for BullMQ (avoids ioredis version mismatch) */
export function getBullMQConnection(): {
  host: string;
  port: number;
  maxRetriesPerRequest: null;
  enableReadyCheck: false;
} {
  try {
    const url = new URL(
      redisUrl.startsWith("redis://")
        ? redisUrl.replace(/^redis:\/\//, "http://")
        : redisUrl,
    );
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port || "6379", 10),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}
