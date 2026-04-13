import { Types } from "mongoose";
import {
  type FocusSessionStatus,
  type IFocusSession,
  FocusSessionModel,
} from "../models/focus-session.model";

export interface CreateFocusSessionDto {
  userId: string;
  domain: string;
  label: string;
  plannedMins: number | null;
  startedAt: Date;
}

export interface CreateFocusDraftDto {
  userId: string;
  domain: string;
  label: string;
  plannedMins: number | null;
}

export const FocusSessionRepository = {
  async findActiveByUserId(userId: string): Promise<IFocusSession | null> {
    return FocusSessionModel.findOne({
      userId: new Types.ObjectId(userId),
      status: "active",
    })
      .lean()
      .exec() as Promise<IFocusSession | null>;
  },

  async findById(userId: string, sessionId: string): Promise<IFocusSession | null> {
    return FocusSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec() as Promise<IFocusSession | null>;
  },

  async create(data: CreateFocusSessionDto): Promise<IFocusSession> {
    const doc = await FocusSessionModel.create({
      userId: new Types.ObjectId(data.userId),
      domain: data.domain,
      label: data.label,
      plannedMins: data.plannedMins,
      actualMins: null,
      startedAt: data.startedAt,
      endedAt: null,
      status: "active",
    });

    return doc.toObject() as IFocusSession;
  },

  async findDraftByUserIdAndDomain(
    userId: string,
    domain: string,
  ): Promise<IFocusSession | null> {
    return FocusSessionModel.findOne({
      userId: new Types.ObjectId(userId),
      domain,
      startedAt: null,
      endedAt: null,
      status: { $nin: ["active", "completed", "abandoned"] },
    })
      .lean()
      .exec() as Promise<IFocusSession | null>;
  },

  async createDraft(data: CreateFocusDraftDto): Promise<IFocusSession> {
    const doc = await FocusSessionModel.create({
      userId: new Types.ObjectId(data.userId),
      domain: data.domain,
      label: data.label,
      plannedMins: data.plannedMins,
      actualMins: null,
      startedAt: null,
      endedAt: null,
      status: "draft",
    });

    return doc.toObject() as IFocusSession;
  },

  async activateDraft(
    userId: string,
    sessionId: string,
    plannedMins: number | null,
  ): Promise<IFocusSession | null> {
    const startedAt = new Date();
    return FocusSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
        startedAt: null,
        endedAt: null,
        status: { $nin: ["active", "completed", "abandoned"] },
      },
      {
        $set: {
          status: "active",
          startedAt,
          plannedMins,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    )
      .lean()
      .exec() as Promise<IFocusSession | null>;
  },

  async endSession(
    userId: string,
    sessionId: string,
    status: Extract<FocusSessionStatus, "completed" | "abandoned">,
    endedAt: Date,
    actualMins: number,
  ): Promise<IFocusSession | null> {
    return FocusSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
        status: "active",
      },
      {
        $set: {
          status,
          endedAt,
          actualMins,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    )
      .lean()
      .exec() as Promise<IFocusSession | null>;
  },

  async updateById(
    userId: string,
    sessionId: string,
    patch: { label?: string; domain?: string; plannedMins?: number | null },
  ): Promise<IFocusSession | null> {
    return FocusSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    )
      .lean()
      .exec() as Promise<IFocusSession | null>;
  },

  async deleteById(userId: string, sessionId: string): Promise<boolean> {
    const result = await FocusSessionModel.deleteOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    }).exec();
    return result.deletedCount === 1;
  },

  async findDraftsByUserId(userId: string, limit: number): Promise<IFocusSession[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    return FocusSessionModel.find({
      userId: new Types.ObjectId(userId),
      startedAt: null,
      endedAt: null,
      status: { $nin: ["active", "completed", "abandoned"] },
    })
      .sort({ updatedAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec() as Promise<IFocusSession[]>;
  },

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ sessions: IFocusSession[]; total: number; page: number; totalPages: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const skip = (safePage - 1) * safeLimit;

    const [sessions, total] = await Promise.all([
      FocusSessionModel.find({ userId: new Types.ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec() as Promise<IFocusSession[]>,
      FocusSessionModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec(),
    ]);

    const totalPages = total === 0 ? 1 : Math.ceil(total / safeLimit);
    return {
      sessions,
      total,
      page: safePage,
      totalPages,
    };
  },
};
