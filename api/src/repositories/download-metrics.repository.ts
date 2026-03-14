import type { IUserDownloadMetrics } from "../models/download-metrics.model";
import { UserDownloadMetrics } from "../models/download-metrics.model";
import { Types } from "mongoose";

export const DownloadMetricsRepository = {
  async findByUserId(userId: string): Promise<IUserDownloadMetrics | null> {
    return UserDownloadMetrics.findOne({
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async upsert(userId: string, update: Record<string, unknown>): Promise<void> {
    await UserDownloadMetrics.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      update,
      { upsert: true, new: true },
    ).exec();
  },
};
