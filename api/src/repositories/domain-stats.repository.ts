import type { IDomainStats } from "../models/domain-stats.model";
import { DomainStatsModel } from "../models/domain-stats.model";
import { Types } from "mongoose";

export const DomainStatsRepository = {
  async findByUserId(userId: string, limit?: number): Promise<IDomainStats[]> {
    return DomainStatsModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ totalCount: -1 })
      .limit(limit ?? 50)
      .lean()
      .exec();
  },

  async upsertOnDownload(
    userId: string,
    domain: string,
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

    await DomainStatsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), domain },
      { $inc: inc },
      { upsert: true },
    ).exec();
  },
};
