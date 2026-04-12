import { Types } from "mongoose";
import { type IUserStreak, UserStreakModel } from "../models/user-streak.model";

export interface CreateUserStreakDto {
  userId: string;
  label: string;
  domain: string;
  minMinutes: number;
  activeDays: number[];
  todayDate: string;
}

export interface UpdateUserStreakDto {
  label?: string;
  domain?: string;
  minMinutes?: number;
  activeDays?: number[];
}

export interface StreakDerivedUpdate {
  currentStreak: number;
  longestStreak: number;
  todaySeconds: number;
  todayDate: string;
  lastMetAt: string | null;
}

export const UserStreakRepository = {
  async findByUserId(userId: string): Promise<IUserStreak[]> {
    return UserStreakModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec() as Promise<IUserStreak[]>;
  },

  async findById(userId: string, streakId: string): Promise<IUserStreak | null> {
    return UserStreakModel.findOne({
      _id: new Types.ObjectId(streakId),
      userId: new Types.ObjectId(userId),
    })
      .lean()
      .exec();
  },

  async create(data: CreateUserStreakDto): Promise<IUserStreak> {
    const doc = await UserStreakModel.create({
      userId: new Types.ObjectId(data.userId),
      label: data.label,
      domain: data.domain,
      minMinutes: data.minMinutes,
      activeDays: data.activeDays,
      currentStreak: 0,
      longestStreak: 0,
      todaySeconds: 0,
      todayDate: data.todayDate,
      lastMetAt: null,
      skipsUsed: 0,
      isActive: true,
      evolvedUrls: [],
      evolvedAt: null,
    });

    return doc.toObject() as IUserStreak;
  },

  async update(
    userId: string,
    streakId: string,
    data: UpdateUserStreakDto,
  ): Promise<IUserStreak | null> {
    return UserStreakModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(streakId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    )
      .lean()
      .exec() as Promise<IUserStreak | null>;
  },

  async softDelete(userId: string, streakId: string): Promise<boolean> {
    const result = await UserStreakModel.updateOne(
      {
        _id: new Types.ObjectId(streakId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
    ).exec();

    return result.modifiedCount > 0;
  },

  async updateDerived(streakId: string, data: StreakDerivedUpdate): Promise<void> {
    await UserStreakModel.updateOne(
      { _id: new Types.ObjectId(streakId) },
      {
        $set: {
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          todaySeconds: data.todaySeconds,
          todayDate: data.todayDate,
          lastMetAt: data.lastMetAt,
          updatedAt: new Date(),
        },
      },
    ).exec();
  },
};
