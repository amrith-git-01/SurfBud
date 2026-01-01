import { BrowsingCategoryRepository } from "../repositories/browsing-category.repository";
import { DomainClassificationRepository } from "../repositories/domain-classification.repository";
import { DomainClassificationAIService } from "./domain-classification-ai.service";
import { BrowsingMetricsService } from "./browsing-metrics.service";
import { BrandfetchService } from "./brandfetch.service";
import { logger } from "../utils/logger";
import type { DomainClassificationJobData } from "../types/domain-classification-job.types";

const PENDING_DRAIN_LIMIT = 30;

export const DomainClassificationService = {
  async processJob(data: DomainClassificationJobData): Promise<void> {
    const pending = data.domains?.length
      ? await DomainClassificationRepository.findPendingInDomains(data.domains)
      : await DomainClassificationRepository.findPendingLimited(
          PENDING_DRAIN_LIMIT,
        );

    if (pending.length === 0) {
      logger.info("domain-classification: no pending domains — skipping Groq");
      return;
    }

    const categories = await BrowsingCategoryRepository.findAllActive();
    const allowedSlugs = categories.map((c) => c.slug);

    const domainList = pending.map((p) => p.domain);
    const results = await DomainClassificationAIService.classifyDomains(
      domainList,
      allowedSlugs,
    );

    if (results.length === 0) {
      logger.warn(
        { count: pending.length },
        "domain-classification: Groq returned no usable rows",
      );
      return;
    }

    const byDomain = new Map(results.map((r) => [r.domain, r]));
    let applied = 0;
    const domainsToSync = new Set<string>();
    for (const p of pending) {
      const row = byDomain.get(p.domain);
      if (!row) continue;
      await DomainClassificationRepository.applyAiClassification(p.domain, {
        label: row.label,
        description: row.description,
        categorySlug: row.categorySlug,
      });
      applied += 1;
      domainsToSync.add(p.domain.trim().toLowerCase());
    }

    logger.info(
      { applied },
      "domain-classification: applied AI classifications",
    );

    for (const domain of domainsToSync) {
      try {
        const existing =
          await DomainClassificationRepository.findByDomain(domain);
        const hasBoth =
          Boolean(existing?.domainLogo?.trim()) &&
          Boolean(existing?.domainColor?.trim());
        if (!hasBoth) {
          const assets =
            await BrandfetchService.fetchBrandAssetsForDomain(domain);
          await DomainClassificationRepository.applyBrandAssets(domain, assets);
        }
      } catch (err) {
        logger.error(
          { domain, error: (err as Error).message },
          "domain-classification: brandfetch enrich failed",
        );
      }
    }

    for (const domain of domainsToSync) {
      try {
        await BrowsingMetricsService.syncStatsAfterDomainClassification(domain);
      } catch (err) {
        logger.error(
          { domain, error: (err as Error).message },
          "domain-classification: failed to sync browsing stats after classification",
        );
      }
    }
  },
};
