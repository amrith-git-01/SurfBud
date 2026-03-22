import type { BrowsingProductivityType } from "../models/browsing-category.model";
import { BrowsingCategoryRepository } from "../repositories/browsing-category.repository";
import { DomainClassificationRepository } from "../repositories/domain-classification.repository";
import { BrowsingSessionRepository } from "../repositories/browsing-session.repository";
import { startOfDateInTimezone, toDateString } from "../utils/date.utils";

const SLOTS_PER_DAY = 48;
const SLOT_MINUTES = 30;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BrowsingTimelineBlock {
  /** 0–47, 30-minute slot from local midnight */
  index: number;
  /** Slot bounds (UTC instants) for display in `timezone`. */
  startIso: string;
  endIso: string;
  productivity: "productive" | "distracting" | "neutral" | "empty";
  totalSeconds: number;
  /** Top domains in this slot by time (desc). */
  domains: { domain: string; seconds: number }[];
}

function dominantProductivity(
  productive: number,
  distracting: number,
  neutral: number,
): "productive" | "distracting" | "neutral" | "empty" {
  const total = productive + distracting + neutral;
  if (total <= 0) return "empty";
  if (productive / total > 0.5) return "productive";
  if (distracting / total > 0.5) return "distracting";
  return "neutral";
}

/**
 * Builds 48 × 30-minute buckets for a calendar day in `timezone`, from raw sessions.
 * Overlap of each session with each slot is computed in wall-clock time (via UTC ms).
 */
export const BrowsingTimelineService = {
  async getDailyTimeline(
    userId: string,
    timezone: string,
    dateStr: string,
  ): Promise<BrowsingTimelineBlock[]> {
    const sessions = await BrowsingSessionRepository.findForLocalDate(
      userId,
      timezone,
      dateStr,
    );

    const domains = [...new Set(sessions.map((s) => s.domain.toLowerCase()))];
    const classifications =
      domains.length > 0
        ? await DomainClassificationRepository.findByDomains(domains)
        : [];
    const classByDomain = new Map(
      classifications.map((c) => [c.domain.toLowerCase(), c]),
    );

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

    const resolveProductivity = (domain: string): BrowsingProductivityType => {
      const dc = classByDomain.get(domain.toLowerCase());
      if (!dc?.categorySlug) return "neutral";
      return productivityBySlug.get(dc.categorySlug) ?? "neutral";
    };

    const dayStartMs = startOfDateInTimezone(dateStr, timezone).getTime();
    const dayEndMs = dayStartMs + DAY_MS;

    type Bucket = {
      p: number;
      d: number;
      n: number;
      byDomain: Map<string, number>;
    };
    const buckets: Bucket[] = Array.from({ length: SLOTS_PER_DAY }, () => ({
      p: 0,
      d: 0,
      n: 0,
      byDomain: new Map(),
    }));

    for (const s of sessions) {
      const prod = resolveProductivity(s.domain);
      const startMs = new Date(s.startedAt).getTime();
      const endMs = new Date(s.endedAt).getTime();
      const clipStart = Math.max(startMs, dayStartMs);
      const clipEnd = Math.min(endMs, dayEndMs);
      if (clipEnd <= clipStart) continue;

      const firstSlot = Math.max(
        0,
        Math.floor((clipStart - dayStartMs) / SLOT_MS),
      );
      const lastSlot = Math.min(
        SLOTS_PER_DAY - 1,
        Math.floor((clipEnd - 1 - dayStartMs) / SLOT_MS),
      );

      const dom = s.domain.toLowerCase();

      for (let i = firstSlot; i <= lastSlot; i++) {
        const slotStart = dayStartMs + i * SLOT_MS;
        const slotEnd = slotStart + SLOT_MS;
        const overlapSec =
          Math.max(
            0,
            Math.min(clipEnd, slotEnd) - Math.max(clipStart, slotStart),
          ) / 1000;
        if (overlapSec <= 0) continue;

        const b = buckets[i];
        if (!b) continue;
        if (prod === "productive") b.p += overlapSec;
        else if (prod === "distracting") b.d += overlapSec;
        else b.n += overlapSec;

        b.byDomain.set(dom, (b.byDomain.get(dom) ?? 0) + overlapSec);
      }
    }

    return buckets.map((b, index) => {
      const productivity = dominantProductivity(b.p, b.d, b.n);
      const totalSeconds = Math.round(b.p + b.d + b.n);
      const domains = [...b.byDomain.entries()]
        .map(([domain, sec]) => ({ domain, seconds: Math.round(sec) }))
        .filter((x) => x.seconds > 0)
        .sort((a, b2) => b2.seconds - a.seconds);

      const slotStartMs = dayStartMs + index * SLOT_MS;
      return {
        index,
        startIso: new Date(slotStartMs).toISOString(),
        endIso: new Date(slotStartMs + SLOT_MS).toISOString(),
        productivity,
        totalSeconds,
        domains,
      };
    });
  },

  /** Default `date` = today in user TZ. */
  resolveDateParam(date: string | undefined, timezone: string): string {
    return date ?? toDateString(new Date(), timezone);
  },
};
