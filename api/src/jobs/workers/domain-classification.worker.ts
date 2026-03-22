import { Worker } from "bullmq";
import { getBullMQConnection } from "../../config/redis";
import { QUEUE_NAMES } from "../queues";
import { DomainClassificationService } from "../../services/domain-classification.service";
import { logger } from "../../utils/logger";
import type { DomainClassificationJobData } from "../../types/domain-classification-job.types";

export const domainClassificationWorker = new Worker<DomainClassificationJobData>(
  QUEUE_NAMES.DOMAIN_CLASSIFICATION,
  async (job) => {
    const startedAt = Date.now();
    const scope =
      job.data.domains && job.data.domains.length > 0 ?
        "explicit-domains"
      : "pending-drain";
    logger.info(
      {
        queue: QUEUE_NAMES.DOMAIN_CLASSIFICATION,
        jobId: job.id,
        scope,
        domainHintCount: job.data.domains?.length ?? 0,
        attemptsMade: job.attemptsMade,
      },
      "domain-classification job: processing",
    );
    await DomainClassificationService.processJob(job.data);
    logger.info(
      {
        queue: QUEUE_NAMES.DOMAIN_CLASSIFICATION,
        jobId: job.id,
        scope,
        durationMs: Date.now() - startedAt,
      },
      "domain-classification job: completed",
    );
  },
  { connection: getBullMQConnection(), concurrency: 2 },
);

domainClassificationWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      scope:
        job?.data?.domains && job.data.domains.length > 0 ?
          "explicit-domains"
        : "pending-drain",
      attemptsMade: job?.attemptsMade,
      error: err?.message,
    },
    "domain-classification job failed",
  );
});
