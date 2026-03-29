import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { BrowsingSessionService } from "../services/browsing-session.service";
import { BrowsingMetricsService } from "../services/browsing-metrics.service";
import { BrowsingTimelineService } from "../services/browsing-timeline.service";
import { BrowsingSettingsService } from "../services/browsing-settings.service";
import type {
  BrowsingDrawerQueryInput,
  BrowsingStatsPeriod,
} from "../schemas/browsing.schemas";
import type { BrowsingSessionBatchPayload } from "../types/shared/browsing.types";
import { logger } from "../utils/logger";

function toApiProductivityType<T extends string | null | undefined>(
  productivityType: T,
): T {
  if (productivityType == null) {
    return productivityType;
  }
  return (productivityType === "distracting"
    ? "distractive"
    : productivityType) as T;
}

function mapRowProductivity<T extends { productivityType?: string | null }>(
  row: T,
): T {
  return {
    ...row,
    productivityType: toApiProductivityType(row.productivityType),
  };
}

function mapTimelineProductivity<T extends { productivity: string }>(
  block: T,
): T {
  return {
    ...block,
    productivity: toApiProductivityType(block.productivity),
  };
}

export const BrowsingController = {
  getSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await BrowsingSettingsService.getSettings(userId);
    res.json({ success: true, data: settings });
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await BrowsingSettingsService.updateSettings(
      userId,
      req.body,
    );
    res.json({ success: true, data: settings });
  }),

  getDomainRules: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const domainRules = await BrowsingSettingsService.getDomainRules(userId);
    res.json({ success: true, data: { domainRules } });
  }),

  createDomainRule: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await BrowsingSettingsService.createDomainRule(
      userId,
      req.body,
    );
    res.status(201).json({ success: true, data: settings });
  }),

  updateDomainRule: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await BrowsingSettingsService.updateDomainRule(
      userId,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: settings });
  }),

  deleteDomainRule: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await BrowsingSettingsService.deleteDomainRule(
      userId,
      req.params.id as string,
    );
    res.json({ success: true, data: settings });
  }),

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
      data: categories.map((category) => mapRowProductivity(category)),
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
    res.json({
      success: true,
      data: {
        domains: domains.map((domain) => mapRowProductivity(domain)),
        totalActiveTime,
      },
    });
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
    res.json({
      success: true,
      data: {
        categories: categories.map((category) => mapRowProductivity(category)),
      },
    });
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
          sessions: sessions.map((session) => mapRowProductivity(session)),
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
      data: {
        ...result,
        sessions: result.sessions.map((session) => mapRowProductivity(session)),
      },
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
    res.json({
      success: true,
      data: {
        domains: domains.map((domain) => mapRowProductivity(domain)),
        totalActiveTime,
      },
    });
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
      data: {
        date: dateStr,
        timezone: tz,
        blocks: blocks.map((block) => mapTimelineProductivity(block)),
      },
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
    res.json({
      success: true,
      data: {
        categories: categories.map((category) => mapRowProductivity(category)),
      },
    });
  }),
};
