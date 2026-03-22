import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate, validateQuery } from "../middleware/validate.middleware";
import { BrowsingController } from "../controllers/browsing.controller";
import {
  BrowsingListQuerySchema,
  BrowsingSessionBatchSchema,
  BrowsingMetricsTrendQuerySchema,
  BrowsingStatsDateLimitQuerySchema,
  BrowsingTimelineQuerySchema,
} from "../schemas/browsing.schemas";

export const browsingRouter = Router();

browsingRouter.use(authenticate);

browsingRouter.get("/categories", BrowsingController.getCategories);

browsingRouter.get("/metrics", BrowsingController.getMetrics);

browsingRouter.get(
  "/stats/daily",
  validateQuery(BrowsingMetricsTrendQuerySchema),
  BrowsingController.getStatsDaily,
);

browsingRouter.get(
  "/stats/timeline",
  validateQuery(BrowsingTimelineQuerySchema),
  BrowsingController.getStatsTimeline,
);

browsingRouter.get(
  "/stats/domains",
  validateQuery(BrowsingStatsDateLimitQuerySchema),
  BrowsingController.getStatsDomains,
);

browsingRouter.get(
  "/stats/categories",
  validateQuery(BrowsingStatsDateLimitQuerySchema),
  BrowsingController.getStatsCategories,
);

browsingRouter.post(
  "/sessions/batch",
  validate(BrowsingSessionBatchSchema),
  BrowsingController.ingestBatch,
);

browsingRouter.get(
  "/sessions",
  validateQuery(BrowsingListQuerySchema),
  BrowsingController.getRecentSessions,
);
