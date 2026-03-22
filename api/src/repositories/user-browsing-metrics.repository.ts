import { Types } from "mongoose";
import {
  UserBrowsingMetrics,
  type IUserBrowsingMetrics,
} from "../models/user-browsing-metrics.model";

export const UserBrowsingMetricsRepository = {
  async upsertFull(
    userId: string,
    doc: Partial<IUserBrowsingMetrics>,
  ): Promise<void> {
    await UserBrowsingMetrics.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { ...doc, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).exec();
  },

  async findByUserId(userId: string): Promise<IUserBrowsingMetrics | null> {
    return UserBrowsingMetrics.findOne({
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec() as Promise<IUserBrowsingMetrics | null>;
  },
};
