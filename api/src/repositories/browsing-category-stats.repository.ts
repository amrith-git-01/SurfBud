import { Types, type PipelineStage } from "mongoose";
import {
  BrowsingCategoryStats,
  type IBrowsingCategoryStats,
} from "../models/browsing-category-stats.model";

function categoryMatchClause(
  from: string | null,
  to: string | null,
): Record<string, unknown> {
  if (from !== null && to !== null) {
    if (from === to) {
      return { date: from };
    }
    return { date: { $gte: from, $lte: to } };
  }
  return {};
}

export const BrowsingCategoryStatsRepository = {
  async findByUserAndDate(
    userId: string,
    date: string,
    limit: number,
  ): Promise<IBrowsingCategoryStats[]> {
    return BrowsingCategoryStats.find({
      userId: new Types.ObjectId(userId),
      date,
    })
      .sort({ totalActiveTime: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<IBrowsingCategoryStats[]>;
  },

  /**
   * Aggregates per-category stats over a date range (or all time).
   * Metadata (top domain, etc.) comes from the most recent day in range ($sort + $first).
   */
  async aggregateTopByUserAndPeriod(
    userId: string,
    from: string | null,
    to: string | null,
    limit?: number,
    endDateLabel: string,
  ): Promise<IBrowsingCategoryStats[]> {
    const oid = new Types.ObjectId(userId);
    const dateFilter = categoryMatchClause(from, to);
    const match: Record<string, unknown> = { userId: oid, ...dateFilter };

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: "$categorySlug",
          userId: { $first: "$userId" },
          totalActiveTime: { $sum: "$totalActiveTime" },
          sitesVisited: { $sum: "$sitesVisited" },
          topDomain: { $first: "$topDomain" },
          topDomainLabel: { $first: "$topDomainLabel" },
          topDomainTime: { $first: "$topDomainTime" },
          timezone: { $first: "$timezone" },
        },
      },
      { $sort: { totalActiveTime: -1 } },
      ...(typeof limit === "number" ? ([{ $limit: limit }] as PipelineStage[]) : []),
    ];

    const agg = await BrowsingCategoryStats.aggregate<{
      _id: string;
      userId: Types.ObjectId;
      totalActiveTime: number;
      sitesVisited: number;
      topDomain: string | null;
      topDomainLabel: string | null;
      topDomainTime: number;
      timezone: string;
    }>(pipeline).exec();

    const now = new Date();
    return agg.map(
      (c) =>
        ({
          _id: new Types.ObjectId(),
          userId: c.userId,
          date: endDateLabel,
          timezone: c.timezone,
          categorySlug: c._id,
          totalActiveTime: c.totalActiveTime,
          sitesVisited: c.sitesVisited,
          topDomain: c.topDomain,
          topDomainLabel: c.topDomainLabel,
          topDomainTime: c.topDomainTime,
          createdAt: now,
          updatedAt: now,
        }) as IBrowsingCategoryStats,
    );
  },
};
