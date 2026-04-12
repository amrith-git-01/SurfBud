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
  DownloadStatsDateLimitQuerySchema,
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

downloadRouter.get("/removals/pending", DownloadController.listPendingRemovals);

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
downloadRouter.get("/duplicate-groups", DownloadController.getDuplicateGroups);
downloadRouter.get(
  "/categories",
  validateQuery(DownloadStatsDateLimitQuerySchema),
  DownloadController.getCategories,
);
downloadRouter.get(
  "/domains",
  validateQuery(DownloadStatsDateLimitQuerySchema),
  DownloadController.getDomains,
);
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
