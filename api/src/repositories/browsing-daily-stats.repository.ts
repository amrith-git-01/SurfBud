import { Types } from "mongoose";
import {
  BrowsingDailyStats,
  type IBrowsingDailyStats,
} from "../models/browsing-daily-stats.model";

export const BrowsingDailyStatsRepository = {
  async findByUserAndDateRange(
    userId: string,
    fromDate: string,
    toDateInclusive: string,
  ): Promise<IBrowsingDailyStats[]> {
    return BrowsingDailyStats.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: fromDate, $lte: toDateInclusive },
    })
      .sort({ date: 1 })
      .lean()
      .exec() as Promise<IBrowsingDailyStats[]>;
  },
};
