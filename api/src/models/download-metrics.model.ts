import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserDownloadMetrics extends Document {
  userId: Types.ObjectId;
  todayCount: number;
  todayDate: string;
  weekCount: number;
  weekStart: string;
  monthCount: number;
  monthStart: string;
  totalNew: number;
  totalDuplicates: number;
  totalSize: number;
  duplicateSize: number;
  updatedAt: Date;
}

const userDownloadMetricsSchema = new Schema<IUserDownloadMetrics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    todayCount: { type: Number, default: 0 },
    todayDate: { type: String, default: "" },
    weekCount: { type: Number, default: 0 },
    weekStart: { type: String, default: "" },
    monthCount: { type: Number, default: 0 },
    monthStart: { type: String, default: "" },
    totalNew: { type: Number, default: 0 },
    totalDuplicates: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    duplicateSize: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userDownloadMetricsSchema.index({ userId: 1 }, { unique: true });
export const UserDownloadMetrics = mongoose.model<IUserDownloadMetrics>(
  "UserDownloadMetrics",
  userDownloadMetricsSchema,
);
