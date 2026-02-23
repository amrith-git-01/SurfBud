import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDownloadEvent extends Document {
  userId: Types.ObjectId;
  fileId: Types.ObjectId;
  filename: string;
  sourceDomain?: string;
  status: "new" | "duplicate";
  duration?: number;
  isRemoved: boolean;
  removedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const downloadEventSchema = new Schema<IDownloadEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    sourceDomain: { type: String },
    status: { type: String, enum: ["new", "duplicate"], required: true },
    duration: { type: Number },
    isRemoved: { type: Boolean, default: false },
    removedAt: { type: Date },
  },
  { timestamps: true },
);

downloadEventSchema.index({ userId: 1, createdAt: -1 });
downloadEventSchema.index({ userId: 1, status: 1, createdAt: -1 });
downloadEventSchema.index({ userId: 1, sourceDomain: 1 });
downloadEventSchema.index({ userId: 1, isRemoved: 1 });
downloadEventSchema.index({ fileId: 1, createdAt: -1 });

export const DownloadEvent = mongoose.model<IDownloadEvent>(
  "DownloadEvent",
  downloadEventSchema,
);
