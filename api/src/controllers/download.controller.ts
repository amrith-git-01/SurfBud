import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { DownloadService } from "../services/download.service";
import { DownloadMetricsService } from "../services/download-metrics.service";
import { NotFoundError } from "../utils/errors";

export const DownloadController = {
  processDownload: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await DownloadService.processDownload(userId, req.body);
    res.status(201).json({ success: true, data: result });
  }),

  markRemoved: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const eventId = req.params.id as string;
    const event = await DownloadService.markRemoved(userId, eventId);
    res.json({ success: true, data: { event } });
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const metrics = await DownloadMetricsService.getStats(userId);
    res.json({ success: true, data: { metrics } });
  }),

  getTrend: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validatedQuery = res.locals.validatedQuery || {};
    const period = Number(validatedQuery.period ?? "7");
    const trend = await DownloadService.getTrend(userId, period);
    res.json({ success: true, data: { trend } });
  }),

  getRecentEvents: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const events = await DownloadService.getRecentEvents(userId, 10);
    res.json({ success: true, data: { events } });
  }),

  getEvents: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const timezone = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as Record<string, unknown>;
    const result = await DownloadService.getEvents(
      userId,
      {
        page: Number(q.page ?? 1),
        limit: Number(q.limit ?? 10),
        status: q.status as "new" | "duplicate" | undefined,
        category: q.category as string | undefined,
        search: q.search as string | undefined,
        period: (q.period as "today" | "week" | "month" | "all") ?? "all",
      },
      timezone,
    );
    res.json({ success: true, data: result });
  }),

  getDuplicateGroups: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const groups = await DownloadService.getDuplicateGroups(userId);
    res.json({ success: true, data: { groups } });
  }),

  getCategories: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const categories = await DownloadMetricsService.getCategories(userId);
    res.json({ success: true, data: { categories } });
  }),

  getDomains: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const domains = await DownloadMetricsService.getDomains(userId);
    res.json({ success: true, data: { domains } });
  }),

  getFileById: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const fileId = req.params.id as string;
    const file = await DownloadService.getFileById(userId, fileId);
    if (!file) throw new NotFoundError("File not found");
    res.json({ success: true, data: { file } });
  }),

  getFileTimeline: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const fileId = req.params.id as string;
    const events = await DownloadService.getFileTimeline(userId, fileId);
    res.json({ success: true, data: { events } });
  }),
};
