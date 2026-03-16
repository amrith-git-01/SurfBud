// api/src/controllers/download.controller.ts
import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { DownloadService } from "../services/download.service";
import { DownloadMetricsService } from "../services/download-metrics.service";
import { DownloadSettingsService } from "../services/download-settings.service";
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

  cancelRemoval: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const hash = req.params.hash as string;

    await DownloadService.cancelRemoval(userId, hash);
    res.json({ success: true, data: { cancelled: true } });
  }),

  markRemovalConfirmed: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await DownloadService.markRemovalConfirmed(userId, req.body);
    res.json({ success: true, data: { confirmed: true } });
  }),

  markRemovalFailed: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await DownloadService.markRemovalFailed(userId, req.body);
    res.json({ success: true, data: { failed: true } });
  }),

  getSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.getSettings(userId);
    res.json({ success: true, data: settings });
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.updateSettings(
      userId,
      req.body,
    );
    res.json({ success: true, data: settings });
  }),

  getDomainRules: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const domainRules = await DownloadSettingsService.getDomainRules(userId);
    res.json({ success: true, data: { domainRules } });
  }),

  createDomainRule: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.createDomainRule(
      userId,
      req.body,
    );
    res.status(201).json({ success: true, data: settings });
  }),

  updateDomainRule: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.updateDomainRule(
      userId,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: settings });
  }),

  deleteDomainRule: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.deleteDomainRule(
      userId,
      req.params.id as string,
    );
    res.json({ success: true, data: settings });
  }),

  getRoutingFolders: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const routingFolders =
      await DownloadSettingsService.getRoutingFolders(userId);
    res.json({ success: true, data: { routingFolders } });
  }),

  createRoutingFolder: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.createRoutingFolder(
      userId,
      req.body,
    );
    res.status(201).json({ success: true, data: settings });
  }),

  updateRoutingFolder: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.updateRoutingFolder(
      userId,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: settings });
  }),

  deleteRoutingFolder: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await DownloadSettingsService.deleteRoutingFolder(
      userId,
      req.params.id as string,
    );
    res.json({ success: true, data: settings });
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
        isRemoved:
          typeof q.isRemoved === "boolean"
            ? (q.isRemoved as boolean)
            : undefined,
        category: q.category as string | undefined,
        domain: q.domain as string | undefined,
        excludeDomains: q.excludeDomains as string[] | undefined,
        search: q.search as string | undefined,
        date: q.date as string | undefined,
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