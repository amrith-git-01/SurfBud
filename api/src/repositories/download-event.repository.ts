// api/src/repositories/download-event.repository.ts
import { Types, type PipelineStage } from "mongoose";
import {
  type IDownloadEvent,
  DownloadEvent,
} from "../models/download-event.model";
import { File } from "../models/file.model";
import {
  toDateString,
  getMondayString,
  getMonthStartString,
  startOfDateInTimezone,
} from "../utils/date.utils";

export interface CreateDownloadEventDto {
  userId: string;
  fileId: string;
  filename: string;
  hash?: string | null;
  savedPath?: string;
  sourceDomain?: string;
  status: "new" | "duplicate";
  duration?: number;
}

export interface QueryOptions {
  page: number;
  limit: number;
  sort?: "newest" | "oldest";
  status?: "new" | "duplicate";
  isRemoved?: boolean;
  category?: string;
  domain?: string;
  excludeDomains?: string[];
  search?: string;
  date?: string;
  period?: "today" | "week" | "month" | "all";
}

export interface PaginatedResult {
  events: IDownloadEvent[];
  total: number;
}

export interface DuplicateGroup {
  fileId: string;
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

export interface CategoryStatsRow {
  category: string;
  totalCount: number;
  newCount: number;
  dupCount: number;
  totalSize: number;
  newSize: number;
  dupSize: number;
}

export interface DomainStatsRow {
  domain: string;
  totalCount: number;
  newCount: number;
  dupCount: number;
  totalSize: number;
  newSize: number;
  dupSize: number;
}

export interface StatsPeriodOptions {
  period: "today" | "week" | "month" | "all";
  date?: string;
  timezone?: string;
  limit?: number;
}

export interface RemovalLookupInput {
  userId: string;
  hash: string;
  savedPath?: string;
}

export interface MarkRemovalScheduledInput extends RemovalLookupInput {
  jobId: string;
  scheduledAt: Date;
}

export interface MarkRemovalFailedInput extends RemovalLookupInput {
  reason?: string;
}

function getRemovalLookupFilter(input: RemovalLookupInput): {
  userId: Types.ObjectId;
  hash: string;
  status: "duplicate";
  savedPath?: string;
} {
  const filter: {
    userId: Types.ObjectId;
    hash: string;
    status: "duplicate";
    savedPath?: string;
  } = {
    userId: new Types.ObjectId(input.userId),
    hash: input.hash,
    status: "duplicate",
  };

  if (input.savedPath) {
    filter.savedPath = input.savedPath;
  }

  return filter;
}

function buildDateRangeMatch(
  options: StatsPeriodOptions,
): Record<string, unknown> | undefined {
  const timezone = options.timezone ?? "UTC";

  if (options.date) {
    const dayStart = startOfDateInTimezone(options.date, timezone);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return { $gte: dayStart, $lt: dayEnd };
  }

  if (options.period === "all") {
    return undefined;
  }

  const now = new Date();
  const boundaries = {
    today: startOfDateInTimezone(toDateString(now, timezone), timezone),
    week: startOfDateInTimezone(getMondayString(now, timezone), timezone),
    month: startOfDateInTimezone(getMonthStartString(now, timezone), timezone),
  };

  return { $gte: boundaries[options.period] };
}

export const DownloadEventRepository = {
  async create(data: CreateDownloadEventDto): Promise<IDownloadEvent> {
    const doc = await DownloadEvent.create({
      ...data,
      hash: data.hash ?? undefined,
      fileId: new Types.ObjectId(data.fileId),
      userId: new Types.ObjectId(data.userId),
    });
    return doc.toObject() as IDownloadEvent;
  },

  async findRecent(userId: string, limit: number): Promise<IDownloadEvent[]> {
    return DownloadEvent.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("fileId", "fileCategory fileExtension mimeType size")
      .lean()
      .exec() as Promise<IDownloadEvent[]>;
  },

  async findByUserId(
    userId: string,
    options: QueryOptions,
    timezone: string = "UTC",
  ): Promise<PaginatedResult> {
    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (options.status) match.status = options.status;
    if (options.isRemoved !== undefined) match.isRemoved = options.isRemoved;
    if (options.search) {
      // If search is a valid MongoDB ObjectId, search by event _id instead of filename
      if (Types.ObjectId.isValid(options.search)) {
        match._id = new Types.ObjectId(options.search);
      } else {
        const escapedSearch = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        match.filename = new RegExp(escapedSearch, "i");
      }
    }
    if (options.domain) {
      const escapedDomain = options.domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match.sourceDomain = new RegExp(`^${escapedDomain}$`, "i");
    } else if (options.excludeDomains && options.excludeDomains.length > 0) {
      const excludedRegex = options.excludeDomains.map((domain) => {
        const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`^${escapedDomain}$`, "i");
      });
      match.sourceDomain = { $nin: excludedRegex };
    }

    if (options.date) {
      const dayStart = startOfDateInTimezone(options.date, timezone);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      match.createdAt = { $gte: dayStart, $lt: dayEnd };
    } else if (options.period && options.period !== "all") {
      const now = new Date();
      const boundaries = {
        today: startOfDateInTimezone(toDateString(now, timezone), timezone),
        week: startOfDateInTimezone(getMondayString(now, timezone), timezone),
        month: startOfDateInTimezone(
          getMonthStartString(now, timezone),
          timezone,
        ),
      };
      match.createdAt = { $gte: boundaries[options.period] };
    }

    const skip = (options.page - 1) * options.limit;
    const pipeline: Record<string, unknown>[] = [{ $match: match }];

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

    const sortDirection = options.sort === "oldest" ? 1 : -1;
    pipeline.push({ $sort: { createdAt: sortDirection } });
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
      .select("fileCategory fileExtension mimeType size")
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

  async aggregateCategoriesByPeriod(
    userId: string,
    options: StatsPeriodOptions,
  ): Promise<CategoryStatsRow[]> {
    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    const createdAt = buildDateRangeMatch(options);
    if (createdAt) {
      match.createdAt = createdAt;
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "fileDoc",
        },
      },
      {
        $unwind: {
          path: "$fileDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          _category: {
            $toLower: { $ifNull: ["$fileDoc.fileCategory", "other"] },
          },
          _size: { $ifNull: ["$fileDoc.size", 0] },
        },
      },
      {
        $group: {
          _id: "$_category",
          totalCount: { $sum: 1 },
          newCount: {
            $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
          },
          dupCount: {
            $sum: { $cond: [{ $eq: ["$status", "duplicate"] }, 1, 0] },
          },
          totalSize: { $sum: "$_size" },
          newSize: {
            $sum: { $cond: [{ $eq: ["$status", "new"] }, "$_size", 0] },
          },
          dupSize: {
            $sum: {
              $cond: [{ $eq: ["$status", "duplicate"] }, "$_size", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          category: { $ifNull: ["$_id", "other"] },
          totalCount: 1,
          newCount: 1,
          dupCount: 1,
          totalSize: 1,
          newSize: 1,
          dupSize: 1,
        },
      },
      { $sort: { totalCount: -1, category: 1 } },
      ...(typeof options.limit === "number"
        ? ([{ $limit: options.limit }] as PipelineStage[])
        : []),
    ];

    return DownloadEvent.aggregate<CategoryStatsRow>(pipeline).exec();
  },

  async aggregateDomainsByPeriod(
    userId: string,
    options: StatsPeriodOptions,
  ): Promise<DomainStatsRow[]> {
    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    const createdAt = buildDateRangeMatch(options);
    if (createdAt) {
      match.createdAt = createdAt;
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "fileDoc",
        },
      },
      {
        $unwind: {
          path: "$fileDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          _domain: {
            $toLower: {
              $ifNull: [
                {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$sourceDomain", null] },
                        { $eq: ["$sourceDomain", ""] },
                      ],
                    },
                    "unknown",
                    "$sourceDomain",
                  ],
                },
                "unknown",
              ],
            },
          },
          _size: { $ifNull: ["$fileDoc.size", 0] },
        },
      },
      {
        $group: {
          _id: "$_domain",
          totalCount: { $sum: 1 },
          newCount: {
            $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
          },
          dupCount: {
            $sum: { $cond: [{ $eq: ["$status", "duplicate"] }, 1, 0] },
          },
          totalSize: { $sum: "$_size" },
          newSize: {
            $sum: { $cond: [{ $eq: ["$status", "new"] }, "$_size", 0] },
          },
          dupSize: {
            $sum: {
              $cond: [{ $eq: ["$status", "duplicate"] }, "$_size", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          domain: { $ifNull: ["$_id", "unknown"] },
          totalCount: 1,
          newCount: 1,
          dupCount: 1,
          totalSize: 1,
          newSize: 1,
          dupSize: 1,
        },
      },
      { $sort: { totalCount: -1, domain: 1 } },
      ...(typeof options.limit === "number"
        ? ([{ $limit: options.limit }] as PipelineStage[])
        : []),
    ];

    return DownloadEvent.aggregate<DomainStatsRow>(pipeline).exec();
  },

  async findLatestSavedPathByFileId(
    fileId: string,
    userId: string,
  ): Promise<string | null> {
    const event = await DownloadEvent.findOne({
      fileId: new Types.ObjectId(fileId),
      userId: new Types.ObjectId(userId),
      savedPath: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .select("savedPath")
      .lean()
      .exec();

    return event?.savedPath ?? null;
  },

  async findById(
    eventId: string,
    userId: string,
  ): Promise<IDownloadEvent | null> {
    return DownloadEvent.findOne({
      _id: new Types.ObjectId(eventId),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec() as Promise<IDownloadEvent | null>;
  },

  async markRemoved(
    eventId: string,
    userId: string,
  ): Promise<IDownloadEvent | null> {
    const now = new Date();
    const doc = await DownloadEvent.findOneAndUpdate(
      {
        _id: new Types.ObjectId(eventId),
        userId: new Types.ObjectId(userId),
        isRemoved: false,
      },
      {
        isRemoved: true,
        removedAt: now,
        removalStatus: "removed",
        removalConfirmedAt: now,
      },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    return doc as IDownloadEvent | null;
  },

  async markRemovalScheduled(
    input: MarkRemovalScheduledInput,
  ): Promise<IDownloadEvent | null> {
    const doc = await DownloadEvent.findOneAndUpdate(
      getRemovalLookupFilter(input),
      {
        $set: {
          removalStatus: "scheduled",
          removalJobId: input.jobId,
          removalScheduledAt: input.scheduledAt,
        },
      },
      { returnDocument: "after", sort: { createdAt: -1 } },
    )
      .lean()
      .exec();

    return doc as IDownloadEvent | null;
  },

  async markRemovalPending(
    input: RemovalLookupInput,
  ): Promise<IDownloadEvent | null> {
    const now = new Date();
    const doc = await DownloadEvent.findOneAndUpdate(
      getRemovalLookupFilter(input),
      {
        $set: {
          removalStatus: "pending_extension",
          removalRequestedAt: now,
        },
      },
      { returnDocument: "after", sort: { createdAt: -1 } },
    )
      .lean()
      .exec();

    return doc as IDownloadEvent | null;
  },

  async markRemovalConfirmed(
    input: RemovalLookupInput,
  ): Promise<IDownloadEvent | null> {
    const now = new Date();
    const doc = await DownloadEvent.findOneAndUpdate(
      {
        ...getRemovalLookupFilter(input),
        isRemoved: false,
      },
      {
        $set: {
          isRemoved: true,
          removedAt: now,
          removalStatus: "removed",
          removalConfirmedAt: now,
        },
      },
      { returnDocument: "after", sort: { createdAt: -1 } },
    )
      .lean()
      .exec();

    return doc as IDownloadEvent | null;
  },

  async getActiveDuplicateSize(userId: string): Promise<number> {
    const result = await DownloadEvent.aggregate<{ totalSize?: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          status: "duplicate",
          isRemoved: false,
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "fileDoc",
        },
      },
      {
        $unwind: {
          path: "$fileDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalSize: {
            $sum: {
              $ifNull: ["$fileDoc.size", 0],
            },
          },
        },
      },
    ]).exec();

    return result[0]?.totalSize ?? 0;
  },

  async getActiveTotalSize(userId: string): Promise<number> {
    const result = await DownloadEvent.aggregate<{ totalSize?: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          isRemoved: false,
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "fileDoc",
        },
      },
      {
        $unwind: {
          path: "$fileDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalSize: {
            $sum: {
              $ifNull: ["$fileDoc.size", 0],
            },
          },
        },
      },
    ]).exec();

    return result[0]?.totalSize ?? 0;
  },

  async markRemovalFailed(
    input: MarkRemovalFailedInput,
  ): Promise<IDownloadEvent | null> {
    const now = new Date();
    const doc = await DownloadEvent.findOneAndUpdate(
      getRemovalLookupFilter(input),
      {
        $set: {
          removalStatus: "failed",
          removalFailedAt: now,
          removalFailureReason: input.reason ?? "UNKNOWN_FAILURE",
        },
      },
      { returnDocument: "after", sort: { createdAt: -1 } },
    )
      .lean()
      .exec();

    return doc as IDownloadEvent | null;
  },

  async markRemovalCancelled(
    input: RemovalLookupInput,
  ): Promise<IDownloadEvent | null> {
    const now = new Date();
    const doc = await DownloadEvent.findOneAndUpdate(
      getRemovalLookupFilter(input),
      {
        $set: {
          removalStatus: "cancelled",
          keptAt: now,
        },
        $unset: {
          removalJobId: "",
          removalScheduledAt: "",
        },
      },
      { returnDocument: "after", sort: { createdAt: -1 } },
    )
      .lean()
      .exec();

    return doc as IDownloadEvent | null;
  },

  async markAllScheduledOrPendingAsCancelled(userId: string): Promise<number> {
    const result = await DownloadEvent.updateMany(
      {
        userId: new Types.ObjectId(userId),
        removalStatus: { $in: ["scheduled", "pending_extension"] },
      },
      {
        $set: {
          removalStatus: "cancelled",
          keptAt: new Date(),
        },
        $unset: {
          removalJobId: "",
          removalScheduledAt: "",
        },
      },
    ).exec();

    return result.modifiedCount;
  },

  async getDuplicateGroups(userId: string): Promise<DuplicateGroup[]> {
    const results = await DownloadEvent.aggregate<{
      _id: Types.ObjectId;
      dupCount: number;
      activeDupCount: number;
    }>([
      { $match: { userId: new Types.ObjectId(userId), status: "duplicate" } },
      {
        $group: {
          _id: "$fileId",
          dupCount: { $sum: 1 },
          activeDupCount: {
            $sum: {
              $cond: [{ $eq: ["$isRemoved", false] }, 1, 0],
            },
          },
        },
      },
      { $sort: { dupCount: -1 } },
      { $limit: 20 },
    ]).exec();

    const fileIds = results.map((r) => r._id).filter(Boolean);

    const files = await File.find({ _id: { $in: fileIds } })
      .select("filename size")
      .lean()
      .exec();

    const fileMap = new Map(
      files.map((f) => [
        String(f._id),
        { filename: f.filename, size: f.size ?? 0 },
      ]),
    );

    return results.map((r) => {
      const file = fileMap.get(String(r._id));

      return {
        fileId: String(r._id),
        filename: file?.filename ?? "Unknown file",
        dupCount: r.dupCount,
        totalSize: (file?.size ?? 0) * r.activeDupCount,
      };
    });
  },

  async getTrend(userId: string, days: number): Promise<TrendBucket[]> {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
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