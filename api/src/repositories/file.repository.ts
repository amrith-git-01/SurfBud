import { type IFile, File } from "../models/file.model";
import { Types } from "mongoose";

export interface CreateFileDto {
  userId: string;
  hash: string;
  filename: string;
  url?: string;
  savedPath?: string;
  size?: number;
  fileExtension?: string;
  fileCategory?: string;
  mimeType?: string;
  sourceDomain?: string;
}

export const FileRepository = {
  async findByHash(userId: string, hash: string): Promise<IFile | null> {
    return File.findOne({ userId: new Types.ObjectId(userId), hash })
      .lean()
      .exec();
  },

  async create(data: CreateFileDto): Promise<IFile> {
    const doc = await File.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
    });
    return doc.toObject() as IFile;
  },

  async findById(userId: string, fileId: string): Promise<IFile | null> {
    return File.findOne({
      _id: new Types.ObjectId(fileId),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async setSavedPathIfMissing(
    userId: string,
    fileId: string,
    savedPath: string,
  ): Promise<IFile | null> {
    return File.findOneAndUpdate(
      {
        _id: new Types.ObjectId(fileId),
        userId: new Types.ObjectId(userId),
        $or: [{ savedPath: { $exists: false } }, { savedPath: "" }, { savedPath: null }],
      },
      { $set: { savedPath } },
      { returnDocument: "after" },
    )
      .lean()
      .exec();
  },
};
