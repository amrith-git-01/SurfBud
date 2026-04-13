import { Types } from "mongoose";
import {
  type ITabGroupMode,
  TabGroupModeModel,
} from "../models/tab-group-mode.model";

export interface CreateTabGroupModeDto {
  userId: string;
  name: string;
  color: string;
  icon: string;
  urls: string[];
  sortOrder?: number;
}

export interface UpdateTabGroupModeDto {
  name?: string;
  color?: string;
  icon?: string;
  urls?: string[];
  evolvedUrls?: string[];
  evolvedAt?: Date | null;
}

export const TabGroupModeRepository = {
  async findByUserId(userId: string): Promise<ITabGroupMode[]> {
    return TabGroupModeModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
      .exec() as Promise<ITabGroupMode[]>;
  },

  async findById(userId: string, tabGroupId: string): Promise<ITabGroupMode | null> {
    return TabGroupModeModel.findOne({
      _id: new Types.ObjectId(tabGroupId),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async create(data: CreateTabGroupModeDto): Promise<ITabGroupMode> {
    const doc = await TabGroupModeModel.create({
      userId: new Types.ObjectId(data.userId),
      name: data.name,
      color: data.color,
      icon: data.icon,
      urls: data.urls,
      sortOrder: data.sortOrder ?? 0,
    });

    return doc.toObject() as ITabGroupMode;
  },

  async update(
    userId: string,
    tabGroupId: string,
    data: UpdateTabGroupModeDto,
  ): Promise<ITabGroupMode | null> {
    const updateDoc: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    const doc = await TabGroupModeModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(tabGroupId),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateDoc },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    return doc as ITabGroupMode | null;
  },

  async deleteById(userId: string, tabGroupId: string): Promise<boolean> {
    const result = await TabGroupModeModel.deleteOne({
      _id: new Types.ObjectId(tabGroupId),
      userId: new Types.ObjectId(userId),
    }).exec();

    return result.deletedCount > 0;
  },

  async countCustomByUserId(userId: string): Promise<number> {
    return TabGroupModeModel.countDocuments({
      userId: new Types.ObjectId(userId),
      sortOrder: 0,
    }).exec();
  },
};
