import type { ICategoryStats } from "../models/category-stats.model";
import { CategoryStats } from "../models/category-stats.model";
import { Types } from "mongoose";

export const CategoryStatsRepository = {
  async findByUserId(
    userId: string,
    limit?: number,
  ): Promise<ICategoryStats[]> {
    return CategoryStats.find({ userId: new Types.ObjectId(userId) })
      .sort({ totalCount: -1 })
      .limit(limit ?? 50)
      .lean()
      .exec();
  },

  async upsertOnDownload(
    userId: string,
    category: string,
    status: "new" | "duplicate",
    size: number,
  ): Promise<void> {
    const inc: Record<string, number> = {
      totalCount: 1,
      newCount: status === "new" ? 1 : 0,
      dupCount: status === "duplicate" ? 1 : 0,
      newSize: status === "new" ? size : 0,
      dupSize: status === "duplicate" ? size : 0,
      totalSize: size,
    };

    await CategoryStats.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), category },
      { $inc: inc },
      { upsert: true },
    ).exec();
  },
};
