import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate, validateQuery } from "../middleware/validate.middleware";
import { DownloadController } from "../controllers/download.controller";
import {
  ProcessDownloadSchema,
  TrendQuerySchema,
  EventsQuerySchema,
} from "../schemas/download.schemas";

export const downloadRouter = Router();

downloadRouter.use(authenticate);

downloadRouter.post(
  "/",
  validate(ProcessDownloadSchema),
  DownloadController.processDownload,
);

downloadRouter.patch("/:id/remove", DownloadController.markRemoved);

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
downloadRouter.get("/files/:id/timeline", DownloadController.getFileTimeline);
downloadRouter.get("/files/:id", DownloadController.getFileById);
