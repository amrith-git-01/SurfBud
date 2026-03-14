import { Types } from "mongoose";
import {
  type IUserRoutingFolder,
  UserRoutingFolderModel,
} from "../models/user-routing-folder.model";
import type { FileCategory } from "../utils/file-utils";

export interface CreateRoutingFolderDto {
  userId: string;
  folderName: string;
  category: FileCategory | null;
}

export interface UpdateRoutingFolderDto {
  folderName?: string;
  category?: FileCategory | null;
}

export const RoutingFolderRepository = {
  async findByUserId(userId: string): Promise<IUserRoutingFolder[]> {
    return UserRoutingFolderModel.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec() as Promise<IUserRoutingFolder[]>;
  },

  async countByUserId(userId: string): Promise<number> {
    return UserRoutingFolderModel.countDocuments({
      userId: new Types.ObjectId(userId),
    }).exec();
  },

  async findById(
    userId: string,
    id: string,
  ): Promise<IUserRoutingFolder | null> {
    return UserRoutingFolderModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async create(data: CreateRoutingFolderDto): Promise<IUserRoutingFolder> {
    const doc = await UserRoutingFolderModel.create({
      userId: new Types.ObjectId(data.userId),
      folderName: data.folderName,
      category: data.category,
    });

    return doc.toObject() as IUserRoutingFolder;
  },

  async clearCategoryMapping(
    userId: string,
    category: FileCategory,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      category,
    };

    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }

    await UserRoutingFolderModel.updateMany(
      filter,
      { $set: { category: null } },
    ).exec();
  },

  async updateById(
    userId: string,
    id: string,
    patch: UpdateRoutingFolderDto,
  ): Promise<IUserRoutingFolder | null> {
    const doc = await UserRoutingFolderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      },
      { $set: patch },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    return doc as IUserRoutingFolder | null;
  },

  async deleteById(
    userId: string,
    id: string,
  ): Promise<IUserRoutingFolder | null> {
    const doc = await UserRoutingFolderModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();

    return doc as IUserRoutingFolder | null;
  },
};