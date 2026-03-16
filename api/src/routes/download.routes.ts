// api/src/routes/download.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware";
import { DownloadController } from "../controllers/download.controller";
import {
  DomainRuleCreateSchema,
  DomainRuleUpdateSchema,
  EventsQuerySchema,
  HashParamSchema,
  ObjectIdParamSchema,
  ProcessDownloadSchema,
  RemovalConfirmedSchema,
  RemovalFailedSchema,
  RoutingFolderCreateSchema,
  RoutingFolderUpdateSchema,
  TrendQuerySchema,
  UpdateDownloadSettingsSchema,
} from "../schemas/download.schemas";

export const downloadRouter = Router();

downloadRouter.use(authenticate);

downloadRouter.get("/settings", DownloadController.getSettings);
downloadRouter.patch(
  "/settings",
  validate(UpdateDownloadSettingsSchema),
  DownloadController.updateSettings,
);

downloadRouter.get(
  "/settings/rules/domains",
  DownloadController.getDomainRules,
);
downloadRouter.post(
  "/settings/rules/domains",
  validate(DomainRuleCreateSchema),
  DownloadController.createDomainRule,
);
downloadRouter.patch(
  "/settings/rules/domains/:id",
  validateParams(ObjectIdParamSchema),
  validate(DomainRuleUpdateSchema),
  DownloadController.updateDomainRule,
);
downloadRouter.delete(
  "/settings/rules/domains/:id",
  validateParams(ObjectIdParamSchema),
  DownloadController.deleteDomainRule,
);

downloadRouter.get(
  "/settings/routing/folders",
  DownloadController.getRoutingFolders,
);
downloadRouter.post(
  "/settings/routing/folders",
  validate(RoutingFolderCreateSchema),
  DownloadController.createRoutingFolder,
);
downloadRouter.patch(
  "/settings/routing/folders/:id",
  validateParams(ObjectIdParamSchema),
  validate(RoutingFolderUpdateSchema),
  DownloadController.updateRoutingFolder,
);
downloadRouter.delete(
  "/settings/routing/folders/:id",
  validateParams(ObjectIdParamSchema),
  DownloadController.deleteRoutingFolder,
);

downloadRouter.delete(
  "/removal/:hash",
  validateParams(HashParamSchema),
  DownloadController.cancelRemoval,
);
downloadRouter.patch(
  "/removal-confirmed",
  validate(RemovalConfirmedSchema),
  DownloadController.markRemovalConfirmed,
);
downloadRouter.patch(
  "/removal-failed",
  validate(RemovalFailedSchema),
  DownloadController.markRemovalFailed,
);

downloadRouter.post(
  "/",
  validate(ProcessDownloadSchema),
  DownloadController.processDownload,
);

downloadRouter.patch(
  "/:id/remove",
  validateParams(ObjectIdParamSchema),
  DownloadController.markRemoved,
);

downloadRouter.get("/stats", DownloadController.getStats);
downloadRouter.get(
  "/trend",
  validateQuery(TrendQuerySchema),
  DownloadController.getTrend,
);
downloadRouter.get("/recent", DownloadController.getRecentEvents);
downloadRouter.get(
  "/events",
  validateQuery(EventsQuerySchema),
  DownloadController.getEvents,
);
downloadRouter.get("/duplicates", DownloadController.getDuplicateGroups);
downloadRouter.get("/categories", DownloadController.getCategories);
downloadRouter.get("/domains", DownloadController.getDomains);
downloadRouter.get(
  "/files/:id/timeline",
  validateParams(ObjectIdParamSchema),
  DownloadController.getFileTimeline,
);
downloadRouter.get(
  "/files/:id",
  validateParams(ObjectIdParamSchema),
  DownloadController.getFileById,
);