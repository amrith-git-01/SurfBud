import { isDomainExcludedFromBrowsingFeed } from "../constants/browsing-feed-domains";
import { BrowsingSessionRepository } from "../repositories/browsing-session.repository";
import { DomainClassificationRepository } from "../repositories/domain-classification.repository";
import { BrowsingCategoryRepository } from "../repositories/browsing-category.repository";
import { redis } from "../config/redis";
import {
  enqueueBrowsingMetricsJob,
  enqueueDomainClassificationJob,
} from "../jobs/queues";
import { BrowsingMetricsService } from "./browsing-metrics.service";
import { BrowsingSettingsService } from "./browsing-settings.service";
import { logger } from "../utils/logger";
import type { ExtensionSession } from "../types/shared/browsing.types";
import type { BrowsingDrawerQueryInput } from "../schemas/browsing.schemas";
import type { BrowsingProductivityType } from "../models/browsing-category.model";
import type {
  IBrowsingInteractions,
  IBrowsingSession,
} from "../models/browsing-session.model";
import {
  endOfDateInTimezone,
  getMondayString,
  getMonthStartString,
  startOfDateInTimezone,
  toDateString,
} from "../utils/date.utils";

const CATEGORIES_CACHE_KEY = "browsing:categories:v1";
const CATEGORIES_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/** Scan extra rows so we can drop ignored domains and still return `limit` items when possible. */
const RECENT_SESSIONS_MAX_SCAN = 200;

export interface EnrichedBrowsingSessionRow {
  _id: unknown;
  userId: unknown;
  sessionId: string;
  domain: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  interactions: IBrowsingInteractions;
  createdAt: Date;
  updatedAt: Date;
  label: string | null;
  domainLogo: string | null;
  domainColor: string | null;
  categorySlug: string | null;
  productivityType: BrowsingProductivityType;
}

async function enrichSessionsWithClassification(
  sessions: IBrowsingSession[],
): Promise<EnrichedBrowsingSessionRow[]> {
  if (sessions.length === 0) return [];
  const domains = [...new Set(sessions.map((s) => s.domain))];
  const classifications =
    await DomainClassificationRepository.findByDomains(domains);
  const byDomain = new Map(classifications.map((c) => [c.domain, c]));
  const slugs = [
    ...new Set(
      classifications.map((c) => c.categorySlug).filter(Boolean) as string[],
    ),
  ];
  const categories =
    slugs.length > 0
      ? await BrowsingCategoryRepository.findBySlugs(slugs)
      : [];
  const productivityBySlug = new Map(
    categories.map((c) => [c.slug, c.productivityType]),
  );
  return sessions.map((s) => {
    const c = byDomain.get(s.domain);
    const slug = c?.categorySlug ?? null;
    const productivityType: BrowsingProductivityType =
      slug && productivityBySlug.has(slug)
        ? (productivityBySlug.get(slug) ?? "neutral")
        : "neutral";
    const row: EnrichedBrowsingSessionRow = {
      _id: s._id,
      userId: s.userId,
      sessionId: s.sessionId,
      domain: s.domain,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationSeconds: s.durationSeconds,
      interactions: s.interactions,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      label: c?.label ?? null,
      domainLogo: c?.domainLogo ?? null,
      domainColor: c?.domainColor ?? null,
      categorySlug: slug,
      productivityType,
    };
    return row;
  });
}

async function buildDrawerMatch(
  params: BrowsingDrawerQueryInput,
  timezone: string,
): Promise<
  { match: Record<string, unknown>; empty: false } | { empty: true }
> {
  const match: Record<string, unknown> = {};

  if (params.from && params.to) {
    match.startedAt = { $gte: new Date(params.from) };
    match.endedAt = { $lte: new Date(params.to) };
  } else if (params.date) {
    const start = startOfDateInTimezone(params.date, timezone);
    const end = endOfDateInTimezone(params.date, timezone);
    match.startedAt = { $gte: start, $lte: end };
  } else if (params.period) {
    if (params.period === "all") {
      /* no date constraint */
    } else if (params.period === "today") {
      const todayStr = toDateString(new Date(), timezone);
      const start = startOfDateInTimezone(todayStr, timezone);
      const end = endOfDateInTimezone(todayStr, timezone);
      match.startedAt = { $gte: start, $lte: end };
    } else if (params.period === "week") {
      const todayStr = toDateString(new Date(), timezone);
      const mondayStr = getMondayString(new Date(), timezone);
      const start = startOfDateInTimezone(mondayStr, timezone);
      const end = endOfDateInTimezone(todayStr, timezone);
      match.startedAt = { $gte: start, $lte: end };
    } else if (params.period === "month") {
      const todayStr = toDateString(new Date(), timezone);
      const monthStartStr = getMonthStartString(new Date(), timezone);
      const start = startOfDateInTimezone(monthStartStr, timezone);
      const end = endOfDateInTimezone(todayStr, timezone);
      match.startedAt = { $gte: start, $lte: end };
    }
  }

  const domainExact = params.domain?.trim().toLowerCase();
  const excludedDomainSet = new Set(
    (params.excludeDomains ?? [])
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0),
  );

  let allowedDomains: string[] | null = null;
  if (params.categorySlug?.trim()) {
    const list = await DomainClassificationRepository.findDomainsByCategorySlug(
      params.categorySlug,
    );
    if (list.length === 0) return { empty: true };
    allowedDomains = list;
  }
  if (params.productivityType) {
    const slugs =
      await BrowsingCategoryRepository.findSlugsByProductivityType(
        params.productivityType,
      );
    const list =
      await DomainClassificationRepository.findDomainsByCategorySlugs(slugs);
    if (list.length === 0) return { empty: true };
    if (allowedDomains) {
      allowedDomains = allowedDomains.filter((d) => list.includes(d));
      if (allowedDomains.length === 0) return { empty: true };
    } else {
      allowedDomains = list;
    }
  }

  if (allowedDomains) {
    if (domainExact) {
      if (excludedDomainSet.has(domainExact)) return { empty: true };
      if (!allowedDomains.includes(domainExact)) return { empty: true };
      match.domain = domainExact;
    } else {
      const filteredAllowed = allowedDomains.filter(
        (d) => !excludedDomainSet.has(d),
      );
      if (filteredAllowed.length === 0) return { empty: true };
      match.domain = { $in: filteredAllowed };
    }
  } else if (domainExact) {
    if (excludedDomainSet.has(domainExact)) return { empty: true };
    match.domain = domainExact;
  } else if (excludedDomainSet.size > 0) {
    match.domain = { $nin: Array.from(excludedDomainSet) };
  }

  return { match, empty: false };
}

export const BrowsingSessionService = {
  async ingestBatch(
    userId: string,
    sessions: ExtensionSession[],
  ): Promise<{ accepted: number; upserted: number; modified: number }> {
    const trackableSessions =
      await BrowsingSettingsService.filterTrackableSessions(userId, sessions);

    if (trackableSessions.length === 0) {
      return {
        accepted: 0,
        upserted: 0,
        modified: 0,
      };
    }

    // Ensure DomainClassification exists (pending) and increment verifiedCount
    for (const session of trackableSessions) {
      await DomainClassificationRepository.upsertPendingAndIncrementVerified(
        session.domain,
        "other",
      );
    }

    const result = await BrowsingSessionRepository.upsertMany(
      userId,
      trackableSessions,
    );

    try {
      const distinct = [
        ...new Set(trackableSessions.map((s) => s.domain.trim().toLowerCase())),
      ];
      const pendingDomains =
        await DomainClassificationRepository.findPendingInDomains(distinct);
      if (pendingDomains.length > 0) {
        await enqueueDomainClassificationJob({
          domains: pendingDomains.map((p) => p.domain),
        });
      }
    } catch (err) {
      logger.error(
        { userId, error: (err as Error).message },
        "Failed to enqueue domain-classification job",
      );
    }

    try {
      const snapshots =
        await BrowsingMetricsService.buildSnapshotsFromExtensionSessions(
          trackableSessions,
        );
      await enqueueBrowsingMetricsJob({ userId, sessions: snapshots });
    } catch (err) {
      logger.error(
        { userId, error: (err as Error).message },
        "Failed to enqueue browsing-metrics job",
      );
    }

    return {
      accepted: trackableSessions.length,
      upserted: result.upserted,
      modified: result.modified,
    };
  },

  async getCategories() {
    const cached = await redis.get(CATEGORIES_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Awaited<
          ReturnType<typeof BrowsingCategoryRepository.findAllActive>
        >;
      } catch {
        // fallthrough to DB fetch
      }
    }

    const categories = await BrowsingCategoryRepository.findAllActive();
    await redis.setex(
      CATEGORIES_CACHE_KEY,
      CATEGORIES_CACHE_TTL_SECONDS,
      JSON.stringify(categories),
    );

    return categories;
  },

  async getRecent(userId: string, limit: number) {
    const candidates = await BrowsingSessionRepository.findRecentCandidates(
      userId,
      RECENT_SESSIONS_MAX_SCAN,
    );
    const filtered = candidates.filter(
      (s) => !isDomainExcludedFromBrowsingFeed(s.domain),
    );
    const sliced = filtered.slice(0, limit);
    if (sliced.length === 0) return [];
    return enrichSessionsWithClassification(sliced);
  },

  async getFiltered(
    userId: string,
    params: BrowsingDrawerQueryInput,
    timezone: string,
  ): Promise<{
    sessions: EnrichedBrowsingSessionRow[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

    const built = await buildDrawerMatch(params, timezone);
    if (built.empty) {
      return {
        sessions: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }

    const unscoped =
      !params.period &&
      !params.date &&
      !(params.from && params.to);

    let sort: Record<string, 1 | -1>;
    if (unscoped) {
      if (params.sort === "oldest") {
        sort = { endedAt: 1 };
      } else if (params.sort === "longest") {
        sort = { durationSeconds: -1 };
      } else {
        sort = { endedAt: -1 };
      }
    } else if (params.sort === "oldest") {
      sort = { startedAt: 1 };
    } else if (params.sort === "longest") {
      sort = { durationSeconds: -1 };
    } else {
      sort = { startedAt: -1 };
    }

    const { sessions, total } = await BrowsingSessionRepository.findPaginated(
      userId,
      built.match,
      sort,
      skip,
      limit,
    );
    const enriched = await enrichSessionsWithClassification(sessions);
    const totalPages =
      total === 0 ? 0 : Math.ceil(total / limit);
    return {
      sessions: enriched,
      total,
      page,
      totalPages,
    };
  },
};
