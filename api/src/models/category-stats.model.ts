import mongoose, { Schema, Document, Types } from "mongoose";
import { FILE_CATEGORIES, type FileCategory } from "../utils/file-utils";

export interface ICategoryStats extends Document {
  userId: Types.ObjectId;
  category: FileCategory;
  totalCount: number;
  newCount: number;
  dupCount: number;
  totalSize: number;
  newSize: number;
  dupSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const categoryStatsSchema = new Schema<ICategoryStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: FILE_CATEGORIES,
    },
    totalCount: { type: Number, default: 0 },
    newCount: { type: Number, default: 0 },
    dupCount: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    newSize: { type: Number, default: 0 },
    dupSize: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categoryStatsSchema.index({ userId: 1, category: 1 }, { unique: true });
categoryStatsSchema.index({ userId: 1, totalCount: -1 });

export const CategoryStats = mongoose.model<ICategoryStats>(
  "CategoryStats",
  categoryStatsSchema,
);
