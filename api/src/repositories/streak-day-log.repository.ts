import { Types } from "mongoose";
import {
  type IStreakDayLog,
  type StreakDayStatus,
  StreakDayLogModel,
} from "../models/streak-day-log.model";

export interface UpsertStreakDayDto {
  userId: string;
  streakId: string;
  date: string;
  seconds: number;
  minSeconds: number;
  status: StreakDayStatus;
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const StreakDayLogRepository = {
  async findByStreakId(streakId: string, days: number): Promise<IStreakDayLog[]> {
    return StreakDayLogModel.find({
      streakId: new Types.ObjectId(streakId),
      date: { $gte: dateDaysAgo(days) },
    })
      .sort({ date: 1 })
      .lean()
      .exec() as Promise<IStreakDayLog[]>;
  },

  async upsertDay(data: UpsertStreakDayDto): Promise<void> {
    await StreakDayLogModel.findOneAndUpdate(
      {
        streakId: new Types.ObjectId(data.streakId),
        date: data.date,
      },
      {
        $set: {
          userId: new Types.ObjectId(data.userId),
          streakId: new Types.ObjectId(data.streakId),
          date: data.date,
          seconds: data.seconds,
          minSeconds: data.minSeconds,
          status: data.status,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    ).exec();
  },
};
