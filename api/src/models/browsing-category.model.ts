import mongoose, { Schema, Document, Types } from "mongoose";

export type BrowsingProductivityType = "productive" | "distracting" | "neutral";

export interface IBrowsingCategory extends Document {
  name: string;
  slug: string;
  icon: string;
  color: string;
  productivityType: BrowsingProductivityType;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const browsingCategorySchema = new Schema<IBrowsingCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    icon: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    productivityType: {
      type: String,
      required: true,
      enum: ["productive", "distracting", "neutral"],
    },
    description: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);
browsingCategorySchema.index({ isActive: 1, sortOrder: 1 });
export const BrowsingCategory = mongoose.model<IBrowsingCategory>(
  "BrowsingCategory",
  browsingCategorySchema,
);
