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
import { logger } from "../utils/logger";
import type { ExtensionSession } from "../types/shared/browsing.types";

const CATEGORIES_CACHE_KEY = "browsing:categories:v1";
const CATEGORIES_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/** Scan extra rows so we can drop ignored domains and still return `limit` items when possible. */
const RECENT_SESSIONS_MAX_SCAN = 200;

export const BrowsingSessionService = {
  async ingestBatch(
    userId: string,
    sessions: ExtensionSession[],
  ): Promise<{ accepted: number; upserted: number; modified: number }> {
    // Ensure DomainClassification exists (pending) and increment verifiedCount
    for (const session of sessions) {
      await DomainClassificationRepository.upsertPendingAndIncrementVerified(
        session.domain,
        "other",
      );
    }

    const result = await BrowsingSessionRepository.upsertMany(userId, sessions);

    try {
      const distinct = [
        ...new Set(sessions.map((s) => s.domain.trim().toLowerCase())),
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
          sessions,
        );
      await enqueueBrowsingMetricsJob({ userId, sessions: snapshots });
    } catch (err) {
      logger.error(
        { userId, error: (err as Error).message },
        "Failed to enqueue browsing-metrics job",
      );
    }

    return {
      accepted: sessions.length,
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
    const domains = [...new Set(sliced.map((s) => s.domain))];
    const classifications =
      await DomainClassificationRepository.findByDomains(domains);
    const byDomain = new Map(classifications.map((c) => [c.domain, c]));
    return sliced.map((s) => {
      const c = byDomain.get(s.domain);
      return {
        ...s,
        label: c?.label ?? null,
        domainLogo: c?.domainLogo ?? null,
        domainColor: c?.domainColor ?? null,
        categorySlug: c?.categorySlug ?? null,
      };
    });
  },
};
