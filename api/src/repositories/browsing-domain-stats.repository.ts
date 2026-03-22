import { Types, type PipelineStage } from "mongoose";
import {
  BrowsingDomainStats,
  type IBrowsingDomainStats,
} from "../models/browsing-domain-stats.model";

function domainMatchClause(
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

export const BrowsingDomainStatsRepository = {
  async findTopByUserAndDate(
    userId: string,
    date: string,
    limit: number,
  ): Promise<IBrowsingDomainStats[]> {
    return BrowsingDomainStats.find({
      userId: new Types.ObjectId(userId),
      date,
    })
      .sort({ totalActiveTime: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<IBrowsingDomainStats[]>;
  },

  /**
   * Aggregates per-domain stats over a date range (or all time) and returns
   * total active seconds in the same match (for "Others" / total bar).
   */
  async aggregateTopByUserAndPeriod(
    userId: string,
    from: string | null,
    to: string | null,
    limit: number,
    endDateLabel: string,
  ): Promise<{
    rows: IBrowsingDomainStats[];
    totalActiveTime: number;
  }> {
    const oid = new Types.ObjectId(userId);
    const dateFilter = domainMatchClause(from, to);
    const match: Record<string, unknown> = { userId: oid, ...dateFilter };

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $facet: {
          totalAgg: [
            {
              $group: {
                _id: null,
                totalActiveTime: { $sum: "$totalActiveTime" },
              },
            },
          ],
          dom: [
            { $sort: { date: -1 } },
            {
              $group: {
                _id: "$domain",
                userId: { $first: "$userId" },
                totalActiveTime: { $sum: "$totalActiveTime" },
                visitCount: { $sum: "$visitCount" },
                longestSession: { $max: "$longestSession" },
                label: { $first: "$label" },
                categorySlug: { $first: "$categorySlug" },
                productivityType: { $first: "$productivityType" },
                timezone: { $first: "$timezone" },
              },
            },
            { $sort: { totalActiveTime: -1 } },
            { $limit: limit },
          ],
        },
      },
    ];

    const agg = await BrowsingDomainStats.aggregate<{
      totalAgg: { totalActiveTime: number }[];
      dom: {
        _id: string;
        userId: Types.ObjectId;
        totalActiveTime: number;
        visitCount: number;
        longestSession: number;
        label: string;
        categorySlug: string;
        productivityType: string;
        timezone: string;
      }[];
    }>(pipeline).exec();

    const first = agg[0];
    const totalActiveTime = first?.totalAgg?.[0]?.totalActiveTime ?? 0;
    const dom = first?.dom ?? [];

    const now = new Date();
    const rows: IBrowsingDomainStats[] = dom.map((d) => ({
      _id: new Types.ObjectId(),
      userId: d.userId,
      date: endDateLabel,
      timezone: d.timezone,
      domain: d._id,
      label: d.label,
      categorySlug: d.categorySlug,
      productivityType: d.productivityType,
      totalActiveTime: d.totalActiveTime,
      visitCount: d.visitCount,
      longestSession: d.longestSession,
      createdAt: now,
      updatedAt: now,
    })) as IBrowsingDomainStats[];

    return { rows, totalActiveTime };
  },
};
