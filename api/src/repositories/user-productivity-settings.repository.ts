import { Types } from "mongoose";
import {
  type IUserProductivitySettings,
  UserProductivitySettingsModel,
} from "../models/user-productivity-settings.model";

export interface CreateDefaultUserProductivitySettingsDto {
  userId: string;
  tabEvolutionEnabled: boolean;
  streakTabEvolutionEnabled: boolean;
  trackNewTabsInTabGroupEnabled: boolean;
}

export interface UpdateUserProductivitySettingsDto {
  tabEvolutionEnabled?: boolean;
  streakTabEvolutionEnabled?: boolean;
  trackNewTabsInTabGroupEnabled?: boolean;
}

export const UserProductivitySettingsRepository = {
  async findByUserId(userId: string): Promise<IUserProductivitySettings | null> {
    return UserProductivitySettingsModel.findOne({
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async ensureByUserId(
    data: CreateDefaultUserProductivitySettingsDto,
  ): Promise<IUserProductivitySettings> {
    const doc = await UserProductivitySettingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(data.userId) },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(data.userId),
          tabEvolutionEnabled: data.tabEvolutionEnabled,
          streakTabEvolutionEnabled: data.streakTabEvolutionEnabled,
          trackNewTabsInTabGroupEnabled: data.trackNewTabsInTabGroupEnabled,
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

    return doc as IUserProductivitySettings;
  },

  async updateByUserId(
    userId: string,
    patch: UpdateUserProductivitySettingsDto,
  ): Promise<IUserProductivitySettings> {
    const doc = await UserProductivitySettingsModel.findOneAndUpdate(
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

    return doc as IUserProductivitySettings;
  },
};
