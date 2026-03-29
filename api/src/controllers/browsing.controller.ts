import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { BrowsingSessionService } from "../services/browsing-session.service";
import { BrowsingMetricsService } from "../services/browsing-metrics.service";
import { BrowsingTimelineService } from "../services/browsing-timeline.service";
import type {
  BrowsingDrawerQueryInput,
  BrowsingStatsPeriod,
} from "../schemas/browsing.schemas";
import type { BrowsingSessionBatchPayload } from "../types/shared/browsing.types";
import { logger } from "../utils/logger";

export const BrowsingController = {
  ingestBatch: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const body = req.body as BrowsingSessionBatchPayload;
    const sessionCount = body.sessions?.length ?? 0;

    logger.info(
      { userId, sessionCount, route: "POST /api/browsing/sessions/batch" },
      "browsing ingest batch: request accepted",
    );

    const result = await BrowsingSessionService.ingestBatch(
      userId,
      body.sessions,
    );

    logger.info(
      {
        userId,
        sessionCount,
        accepted: result.accepted,
        upserted: result.upserted,
        modified: result.modified,
        route: "POST /api/browsing/sessions/batch",
      },
      "browsing ingest batch: persisted and background jobs enqueued",
    );

    res.status(202).json({
      success: true,
      data: result,
    });
  }),

  getCategoryCatalog: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await BrowsingSessionService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  }),

  getDomains: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tz = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as {
      period?: BrowsingStatsPeriod;
      date?: string;
      limit?: number;
    };
    const period = q.period ?? "today";
    const { domains, totalActiveTime } =
      await BrowsingMetricsService.getDomainsForStatsPeriod(
        userId,
        tz,
        period,
        q.limit,
        q.date,
      );
    res.json({ success: true, data: { domains, totalActiveTime } });
  }),

  getCategories: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tz = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as {
      period?: BrowsingStatsPeriod;
      date?: string;
      limit?: number;
    };
    const period = q.period ?? "today";
    const categories = await BrowsingMetricsService.getCategoriesForStatsPeriod(
      userId,
      tz,
      period,
      q.limit,
      q.date,
    );
    res.json({ success: true, data: { categories } });
  }),

  getSessions: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const timezone = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as BrowsingDrawerQueryInput;

    const feedOnly =
      q.page === 1 &&
      (q.sort ?? "newest") === "newest" &&
      !q.period &&
      !q.date &&
      !q.from &&
      !q.to &&
      !q.domain &&
      (!q.excludeDomains || q.excludeDomains.length === 0) &&
      !q.categorySlug &&
      !q.productivityType;

    if (feedOnly) {
      const sessions = await BrowsingSessionService.getRecent(userId, q.limit);
      res.json({
        success: true,
        data: {
          sessions,
          total: sessions.length,
          page: 1,
          totalPages: sessions.length === 0 ? 0 : 1,
        },
      });
      return;
    }

    const result = await BrowsingSessionService.getFiltered(
      userId,
      q,
      timezone,
    );

    res.json({
      success: true,
      data: result,
    });
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const metrics = await BrowsingMetricsService.getMetricsForUser(userId);
    res.json({ success: true, data: { metrics } });
  }),

  getTrend: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tz = req.user!.timezone ?? "UTC";
    const validatedQuery = res.locals.validatedQuery ?? {};
    const period = Number(
      (validatedQuery as { period?: string }).period ?? "7",
    );
    const trend = await BrowsingMetricsService.getDailyTrend(
      userId,
      tz,
      period,
    );
    res.json({ success: true, data: { trend } });
  }),

  getStatsDomains: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tz = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as {
      period?: BrowsingStatsPeriod;
      date?: string;
      limit?: number;
    };
    const period = q.period ?? "today";
    const { domains, totalActiveTime } =
      await BrowsingMetricsService.getDomainsForStatsPeriod(
        userId,
        tz,
        period,
        q.limit,
        q.date,
      );
    res.json({ success: true, data: { domains, totalActiveTime } });
  }),

  getStatsTimeline: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tz = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as { date?: string };
    const dateStr = BrowsingTimelineService.resolveDateParam(q.date, tz);
    const blocks = await BrowsingTimelineService.getDailyTimeline(
      userId,
      tz,
      dateStr,
    );
    res.json({
      success: true,
      data: { date: dateStr, timezone: tz, blocks },
    });
  }),

  getStatsCategories: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tz = req.user!.timezone ?? "UTC";
    const q = (res.locals.validatedQuery ?? {}) as {
      period?: BrowsingStatsPeriod;
      date?: string;
      limit?: number;
    };
    const period = q.period ?? "today";
    const categories = await BrowsingMetricsService.getCategoriesForStatsPeriod(
      userId,
      tz,
      period,
      q.limit,
      q.date,
    );
    res.json({ success: true, data: { categories } });
  }),
};
