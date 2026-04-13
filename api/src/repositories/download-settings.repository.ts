import { Types } from "mongoose";
import {
  type IUserDownloadSettings,
  UserDownloadSettingsModel,
} from "../models/user-download-settings.model";

export interface CreateDefaultDownloadSettingsDto {
  userId: string;
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  routingEnabled: boolean;
}

export interface UpdateDownloadSettingsDto {
  trackingEnabled?: boolean;
  autoRemoveEnabled?: boolean;
  routingEnabled?: boolean;
}

export const DownloadSettingsRepository = {
  async findByUserId(userId: string): Promise<IUserDownloadSettings | null> {
    return UserDownloadSettingsModel.findOne({
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async ensureByUserId(
    data: CreateDefaultDownloadSettingsDto,
  ): Promise<IUserDownloadSettings> {
    const doc = await UserDownloadSettingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(data.userId) },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(data.userId),
          trackingEnabled: data.trackingEnabled,
          autoRemoveEnabled: data.autoRemoveEnabled,
          routingEnabled: data.routingEnabled,
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

    return doc as IUserDownloadSettings;
  },

  async updateByUserId(
    userId: string,
    patch: UpdateDownloadSettingsDto,
  ): Promise<IUserDownloadSettings> {
    const doc = await UserDownloadSettingsModel.findOneAndUpdate(
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

    return doc as IUserDownloadSettings;
  },
};
