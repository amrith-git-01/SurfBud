import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBrowsingDailyStats extends Document {
  userId: Types.ObjectId;
  date: string;
  timezone: string;
  totalActiveTime: number;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  focusScore: number | null;
  sitesVisited: number;
  longestSession: number;
  createdAt: Date;
  updatedAt: Date;
}

const browsingDailyStatsSchema = new Schema<IBrowsingDailyStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    timezone: { type: String, required: true },
    totalActiveTime: { type: Number, default: 0, min: 0 },
    productiveTime: { type: Number, default: 0, min: 0 },
    distractingTime: { type: Number, default: 0, min: 0 },
    neutralTime: { type: Number, default: 0, min: 0 },
    focusScore: { type: Number, default: null, min: 0, max: 100 },
    sitesVisited: { type: Number, default: 0, min: 0 },
    longestSession: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
browsingDailyStatsSchema.index({ userId: 1, date: -1 });
browsingDailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true });
export const BrowsingDailyStats = mongoose.model<IBrowsingDailyStats>(
  "BrowsingDailyStats",
  browsingDailyStatsSchema,
);
