import mongoose, { Schema, Document, Types } from "mongoose";
import type { BrowsingProductivityType } from "./browsing-category.model";

export interface IBrowsingDomainStats extends Document {
  userId: Types.ObjectId;
  date: string;
  timezone: string;
  domain: string;
  label: string;
  categorySlug: string;
  productivityType: BrowsingProductivityType;
  totalActiveTime: number;
  visitCount: number;
  longestSession: number;
  createdAt: Date;
  updatedAt: Date;
}

const browsingDomainStatsSchema = new Schema<IBrowsingDomainStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    timezone: { type: String, required: true },
    domain: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    categorySlug: { type: String, required: true, trim: true, lowercase: true },
    productivityType: {
      type: String,
      required: true,
      enum: ["productive", "distracting", "neutral"],
    },
    totalActiveTime: { type: Number, default: 0, min: 0 },
    visitCount: { type: Number, default: 0, min: 0 },
    longestSession: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

browsingDomainStatsSchema.index({ userId: 1, date: -1 });
browsingDomainStatsSchema.index(
  { userId: 1, date: 1, domain: 1 },
  { unique: true },
);
browsingDomainStatsSchema.index({
  userId: 1,
  date: 1,
  totalActiveTime: -1,
});

export const BrowsingDomainStats = mongoose.model<IBrowsingDomainStats>(
  "BrowsingDomainStats",
  browsingDomainStatsSchema,
);
