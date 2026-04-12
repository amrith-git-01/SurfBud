// api/src/jobs/workers/removal.worker.ts
import { Worker, type Job } from "bullmq";
import { getBullMQConnection } from "../../config/redis";
import { QUEUE_NAMES, type RemovalJobData } from "../queues";
import { DownloadEventRepository } from "../../repositories/download-event.repository";
import { sseManager } from "../../sse/sse.manager";
import { logger } from "../../utils/logger";

export const removalWorker = new Worker<RemovalJobData>(
  QUEUE_NAMES.DOWNLOAD_REMOVAL,
  async (job: Job<RemovalJobData>) => {
    const { userId, savedPath, hash } = job.data;

    await DownloadEventRepository.markRemovalPending({
      userId,
      hash,
      savedPath,
    });

    sseManager.emitRemoveFile(userId, {
      type: "remove:file",
      savedPath,
      hash,
    });
  },
  { connection: getBullMQConnection(), concurrency: 20 },
);

removalWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err?.message,
    },
    "download-removal job failed",
  );
});
