import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { DownloadService } from "../services/download.service";
import { FileRepository } from "../repositories/file.repository";
import { DownloadEventRepository } from "../repositories/download-event.repository";
import { DownloadMetricsRepository } from "../repositories/download-metrics.repository";
import { DomainStatsRepository } from "../repositories/domain-stats.repository";
import { CategoryStatsRepository } from "../repositories/category-stats.repository";
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
    const metrics = await DownloadMetricsRepository.findByUserId(userId);
    res.json({ success: true, data: { metrics } });
  }),

  getTrend: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const period = Number(
      (req.query as { period?: string })?.period ?? "7",
    );
    const trend = await DownloadEventRepository.getTrend(userId, period);
    res.json({ success: true, data: { trend } });
  }),

  getRecentEvents: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const events = await DownloadEventRepository.findRecent(userId, 10);
    res.json({ success: true, data: { events } });
  }),

  getEvents: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const q = (req.query ?? {}) as Record<string, unknown>;
    const result = await DownloadEventRepository.findByUserId(userId, {
      page: Number(q.page ?? 1),
      limit: Number(q.limit ?? 10),
      status: q.status as "new" | "duplicate" | undefined,
      category: q.category as string | undefined,
      search: q.search as string | undefined,
      period: (q.period as "today" | "week" | "month" | "all") ?? "all",
    });
    res.json({ success: true, data: result });
  }),

  getDuplicateGroups: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const groups = await DownloadEventRepository.getDuplicateGroups(userId);
    res.json({ success: true, data: { groups } });
  }),

  getCategories: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const categories = await CategoryStatsRepository.findByUserId(userId);
    res.json({ success: true, data: { categories } });
  }),

  getDomains: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const domains = await DomainStatsRepository.findByUserId(userId);
    res.json({ success: true, data: { domains } });
  }),

  getFileById: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const fileId = req.params.id as string;
    const file = await FileRepository.findById(userId, fileId);
    if (!file) throw new NotFoundError("File not found");
    res.json({ success: true, data: { file } });
  }),

  getFileTimeline: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const fileId = req.params.id as string;
    const events = await DownloadEventRepository.findByFileId(fileId, userId);
    res.json({ success: true, data: { events } });
  }),
};
