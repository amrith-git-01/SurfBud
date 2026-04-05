import mongoose, { Document, Schema, Types } from "mongoose";

export type StreakDayStatus =
  | "met"
  | "partial"
  | "missed"
  | "skipped"
  | "inactive";

export interface IStreakDayLog extends Document {
  userId: Types.ObjectId;
  streakId: Types.ObjectId;
  date: string;
  seconds: number;
  minSeconds: number;
  status: StreakDayStatus;
  createdAt: Date;
  updatedAt: Date;
}

const streakDayLogSchema = new Schema<IStreakDayLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    streakId: {
      type: Schema.Types.ObjectId,
      ref: "UserStreak",
      required: true,
    },
    date: { type: String, required: true },
    seconds: { type: Number, required: true, min: 0 },
    minSeconds: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["met", "partial", "missed", "skipped", "inactive"],
    },
  },
  { timestamps: true },
);

streakDayLogSchema.index({ userId: 1, streakId: 1, date: -1 });
streakDayLogSchema.index({ streakId: 1, date: 1 }, { unique: true });

export const StreakDayLogModel = mongoose.model<IStreakDayLog>(
  "StreakDayLog",
  streakDayLogSchema,
);
