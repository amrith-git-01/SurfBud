import { type IFile, File } from "../models/file.model";

export const FileRepository = {
  async findByUserAndHash(userId: string, hash: string): Promise<IFile | null> {
    return File.findOne({ userId, hash }).exec();
  },

  async create(data: {
    userId: string;
    hash: string;
    filename: string;
    url?: string;
    size?: number;
    fileExtension?: string;
    fileCategory?: string;
    mimeType?: string;
    sourceDomain?: string;
  }): Promise<IFile> {
    return File.create(data);
  },
};
