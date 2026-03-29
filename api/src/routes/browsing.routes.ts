import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate, validateQuery } from "../middleware/validate.middleware";
import { BrowsingController } from "../controllers/browsing.controller";
import {
  BrowsingDrawerQuerySchema,
  BrowsingSessionBatchSchema,
  BrowsingMetricsTrendQuerySchema,
  BrowsingStatsDateLimitQuerySchema,
  BrowsingTimelineQuerySchema,
} from "../schemas/browsing.schemas";

export const browsingRouter = Router();

browsingRouter.use(authenticate);

browsingRouter.get("/category-catalog", BrowsingController.getCategoryCatalog);

browsingRouter.get(
  "/categories",
  validateQuery(BrowsingStatsDateLimitQuerySchema),
  BrowsingController.getCategories,
);

browsingRouter.get(
  "/domains",
  validateQuery(BrowsingStatsDateLimitQuerySchema),
  BrowsingController.getDomains,
);

browsingRouter.get("/stats", BrowsingController.getStats);

browsingRouter.get(
  "/trend",
  validateQuery(BrowsingMetricsTrendQuerySchema),
  BrowsingController.getTrend,
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
  validateQuery(BrowsingDrawerQuerySchema),
  BrowsingController.getSessions,
);
