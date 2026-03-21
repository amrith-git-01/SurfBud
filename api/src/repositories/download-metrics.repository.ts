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
      { upsert: true, returnDocument: "after" },
    ).exec();
  },

  async setDuplicateSize(
    userId: string,
    duplicateSize: number,
    totalSize?: number,
  ): Promise<void> {
    const sizeFields: { duplicateSize: number; totalSize?: number } = {
      duplicateSize,
    };

    if (typeof totalSize === "number") {
      sizeFields.totalSize = totalSize;
    }

    await UserDownloadMetrics.updateOne(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          ...sizeFields,
          updatedAt: new Date(),
        },
      },
    ).exec();
  },
};
