import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { DownloadController } from "../controllers/download.controller";
const TrackDownloadSchema = z.object({
  hash: z.string().min(1, "hash is required"),
  filename: z.string().min(1, "filename is required"),
  url: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().optional(),
  sourceDomain: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  isRemoved: z.boolean().optional(),
  removedAt: z.string().datetime().optional(),
});
export const downloadRouter = Router();
// All download tracking requires authentication
downloadRouter.post(
  "/track",
  authenticate,
  validate(TrackDownloadSchema),
  DownloadController.trackDownload,
);
