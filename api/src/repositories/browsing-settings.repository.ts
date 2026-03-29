import { Types } from "mongoose";
import {
  type IUserBrowsingSettings,
  UserBrowsingSettingsModel,
} from "../models/user-browsing-settings.model";

export interface CreateDefaultBrowsingSettingsDto {
  userId: string;
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
}

export interface UpdateBrowsingSettingsDto {
  trackingEnabled?: boolean;
  interactionTrackingEnabled?: boolean;
  minSessionDurationSeconds?: number;
  mergeGapSeconds?: number;
}

export const BrowsingSettingsRepository = {
  async findByUserId(userId: string): Promise<IUserBrowsingSettings | null> {
    return UserBrowsingSettingsModel.findOne({
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async ensureByUserId(
    data: CreateDefaultBrowsingSettingsDto,
  ): Promise<IUserBrowsingSettings> {
    const doc = await UserBrowsingSettingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(data.userId) },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(data.userId),
          trackingEnabled: data.trackingEnabled,
          interactionTrackingEnabled: data.interactionTrackingEnabled,
          minSessionDurationSeconds: data.minSessionDurationSeconds,
          mergeGapSeconds: data.mergeGapSeconds,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    )
      .lean()
      .exec();

    return doc as IUserBrowsingSettings;
  },

  async updateByUserId(
    userId: string,
    patch: UpdateBrowsingSettingsDto,
  ): Promise<IUserBrowsingSettings> {
    const doc = await UserBrowsingSettingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: patch,
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      },
    )
      .lean()
      .exec();

    return doc as IUserBrowsingSettings;
  },
};