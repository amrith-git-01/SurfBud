import { Types, type PipelineStage } from "mongoose";
import {
  type IDownloadEvent,
  DownloadEvent,
} from "../models/download-event.model";
import { File } from "../models/file.model";

export interface CreateDownloadEventDto {
  userId: string;
  fileId: string;
  filename: string;
  sourceDomain?: string;
  status: "new" | "duplicate";
  duration?: number;
}

export interface QueryOptions {
  page: number;
  limit: number;
  status?: "new" | "duplicate";
  category?: string;
  search?: string;
  period?: "today" | "week" | "month" | "all";
}

export interface PaginatedResult {
  events: IDownloadEvent[];
  total: number;
}

export interface DuplicateGroup {
  filename: string;
  dupCount: number;
  totalSize: number;
}

export interface TrendBucket {
  date: string;
  total: number;
  newFiles: number;
  duplicates: number;
}

function getStartOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getFirstOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const DownloadEventRepository = {
  async create(data: CreateDownloadEventDto): Promise<IDownloadEvent> {
    const doc = await DownloadEvent.create({
      ...data,
      fileId: new Types.ObjectId(data.fileId),
      userId: new Types.ObjectId(data.userId),
    });
    return doc.toObject() as IDownloadEvent;
  },

  async findRecent(userId: string, limit: number): Promise<IDownloadEvent[]> {
    return DownloadEvent.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("fileId", "fileCategory fileExtension mimeType")
      .lean()
      .exec() as Promise<IDownloadEvent[]>;
  },

  async findByUserId(
    userId: string,
    options: QueryOptions,
  ): Promise<PaginatedResult> {
    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (options.status) match.status = options.status;
    if (options.search) match.filename = new RegExp(options.search, "i");

    if (options.period && options.period !== "all") {
      const now = new Date();
      let start: Date;
      if (options.period === "today") start = getStartOfToday();
      else if (options.period === "week") start = getMondayOfWeek(now);
      else start = getFirstOfMonth(now);
      match.createdAt = { $gte: start };
    }

    const skip = (options.page - 1) * options.limit;

    let pipeline: Record<string, unknown>[] = [{ $match: match }];

    if (options.category) {
      pipeline.push({
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "fileDoc",
        },
      });
      pipeline.push({
        $match: { "fileDoc.fileCategory": options.category },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: options.limit });

    const events = await DownloadEvent.aggregate(
      pipeline as unknown as PipelineStage[],
    ).exec();

    const countMatch = options.category
      ? await DownloadEvent.aggregate([
          { $match: match },
          {
            $lookup: {
              from: "files",
              localField: "fileId",
              foreignField: "_id",
              as: "fileDoc",
            },
          },
          { $match: { "fileDoc.fileCategory": options.category } },
          { $count: "total" },
        ] as unknown as PipelineStage[]).exec()
      : null;

    const total = options.category
      ? (countMatch?.[0]?.total ?? 0)
      : await DownloadEvent.countDocuments(match).exec();

    const fileIds = events.map((e) => e.fileId).filter(Boolean);
    const files = await File.find({ _id: { $in: fileIds } })
      .select("fileCategory fileExtension mimeType")
      .lean()
      .exec();
    const fileMap = new Map(files.map((f) => [String(f._id), f]));

    const enriched = events.map((e) => ({
      ...e,
      fileId: fileMap.get(String(e.fileId)) ?? e.fileId,
    }));

    return { events: enriched as IDownloadEvent[], total };
  },

  async findByFileId(
    fileId: string,
    userId: string,
  ): Promise<IDownloadEvent[]> {
    return DownloadEvent.find({
      fileId: new Types.ObjectId(fileId),
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<IDownloadEvent[]>;
  },

  async markRemoved(
    eventId: string,
    userId: string,
  ): Promise<IDownloadEvent | null> {
    const doc = await DownloadEvent.findOneAndUpdate(
      { _id: eventId, userId: new Types.ObjectId(userId) },
      { isRemoved: true, removedAt: new Date() },
      { new: true },
    )
      .lean()
      .exec();
    return doc as IDownloadEvent | null;
  },

  async getDuplicateGroups(userId: string): Promise<DuplicateGroup[]> {
    const results = await DownloadEvent.aggregate<{
      _id: string;
      dupCount: number;
      fileId: Types.ObjectId;
    }>([
      { $match: { userId: new Types.ObjectId(userId), status: "duplicate" } },
      {
        $group: {
          _id: "$filename",
          dupCount: { $sum: 1 },
          fileId: { $first: "$fileId" },
        },
      },
      { $sort: { dupCount: -1 } },
      { $limit: 20 },
    ]).exec();

    const fileIds = results.map((r) => r.fileId).filter(Boolean);
    const files = await File.find({ _id: { $in: fileIds } })
      .select("size")
      .lean()
      .exec();
    const sizeMap = new Map(files.map((f) => [String(f._id), f.size ?? 0]));

    return results.map((r) => ({
      filename: r._id,
      dupCount: r.dupCount,
      totalSize: (sizeMap.get(String(r.fileId)) ?? 0) * r.dupCount,
    }));
  },

  async getTrend(userId: string, days: number): Promise<TrendBucket[]> {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const raw = await DownloadEvent.aggregate<{
      _id: string;
      total: number;
      newFiles: number;
      duplicates: number;
    }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: 1 },
          newFiles: {
            $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
          },
          duplicates: {
            $sum: { $cond: [{ $eq: ["$status", "duplicate"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    const filled: TrendBucket[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = raw.find((r) => r._id === dateStr);
      filled.push({
        date: dateStr,
        total: found?.total ?? 0,
        newFiles: found?.newFiles ?? 0,
        duplicates: found?.duplicates ?? 0,
      });
    }
    return filled;
  },
};
