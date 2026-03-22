import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBrowsingCategoryStats extends Document {
  userId: Types.ObjectId;
  date: string;
  timezone: string;
  categorySlug: string;
  totalActiveTime: number;
  sitesVisited: number;
  topDomain: string | null;
  topDomainLabel: string | null;
  topDomainTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const browsingCategoryStatsSchema = new Schema<IBrowsingCategoryStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    timezone: { type: String, required: true },
    categorySlug: { type: String, required: true, trim: true, lowercase: true },
    totalActiveTime: { type: Number, default: 0, min: 0 },
    sitesVisited: { type: Number, default: 0, min: 0 },
    topDomain: { type: String, default: null },
    topDomainLabel: { type: String, default: null },
    topDomainTime: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

browsingCategoryStatsSchema.index({ userId: 1, date: -1 });
browsingCategoryStatsSchema.index(
  { userId: 1, date: 1, categorySlug: 1 },
  { unique: true },
);

export const BrowsingCategoryStats = mongoose.model<IBrowsingCategoryStats>(
  "BrowsingCategoryStats",
  browsingCategoryStatsSchema,
);
