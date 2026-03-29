import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware";
import { BrowsingController } from "../controllers/browsing.controller";
import {
  BrowsingDomainRuleCreateSchema,
  BrowsingDomainRuleUpdateSchema,
  BrowsingDrawerQuerySchema,
  BrowsingObjectIdParamSchema,
  BrowsingSettingsUpdateSchema,
  BrowsingSessionBatchSchema,
  BrowsingMetricsTrendQuerySchema,
  BrowsingStatsDateLimitQuerySchema,
  BrowsingTimelineQuerySchema,
} from "../schemas/browsing.schemas";

export const browsingRouter = Router();

browsingRouter.use(authenticate);

browsingRouter.get("/settings", BrowsingController.getSettings);
browsingRouter.patch(
  "/settings",
  validate(BrowsingSettingsUpdateSchema),
  BrowsingController.updateSettings,
);

browsingRouter.get("/settings/rules/domains", BrowsingController.getDomainRules);
browsingRouter.post(
  "/settings/rules/domains",
  validate(BrowsingDomainRuleCreateSchema),
  BrowsingController.createDomainRule,
);
browsingRouter.patch(
  "/settings/rules/domains/:id",
  validateParams(BrowsingObjectIdParamSchema),
  validate(BrowsingDomainRuleUpdateSchema),
  BrowsingController.updateDomainRule,
);
browsingRouter.delete(
  "/settings/rules/domains/:id",
  validateParams(BrowsingObjectIdParamSchema),
  BrowsingController.deleteDomainRule,
);

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
