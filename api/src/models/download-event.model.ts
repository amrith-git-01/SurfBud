// api/src/models/download-event.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export type RemovalStatus =
  | "none"
  | "scheduled"
  | "pending_extension"
  | "removed"
  | "failed"
  | "cancelled";

export interface IDownloadEvent extends Document {
  userId: Types.ObjectId;
  fileId: Types.ObjectId;
  filename: string;
  hash?: string;
  savedPath?: string;
  sourceDomain?: string;
  status: "new" | "duplicate";
  duration?: number;
  isRemoved: boolean;
  removedAt?: Date;
  removalStatus: RemovalStatus;
  removalJobId?: string;
  removalScheduledAt?: Date;
  removalRequestedAt?: Date;
  removalConfirmedAt?: Date;
  removalFailedAt?: Date;
  removalFailureReason?: string;
  keptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const downloadEventSchema = new Schema<IDownloadEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: "File",
      required: true,
    },
    filename: { type: String, required: true },
    hash: { type: String, trim: true },
    savedPath: { type: String },
    sourceDomain: { type: String },
    status: { type: String, enum: ["new", "duplicate"], required: true },
    duration: { type: Number },
    isRemoved: { type: Boolean, default: false },
    removedAt: { type: Date },

    removalStatus: {
      type: String,
      enum: [
        "none",
        "scheduled",
        "pending_extension",
        "removed",
        "failed",
        "cancelled",
      ],
      default: "none",
    },
    removalJobId: { type: String },
    removalScheduledAt: { type: Date },
    removalRequestedAt: { type: Date },
    removalConfirmedAt: { type: Date },
    removalFailedAt: { type: Date },
    removalFailureReason: { type: String },
    keptAt: { type: Date },
  },
  { timestamps: true },
);

downloadEventSchema.index({ userId: 1, createdAt: -1 });
downloadEventSchema.index({ userId: 1, status: 1, createdAt: -1 });
downloadEventSchema.index({ userId: 1, sourceDomain: 1 });
downloadEventSchema.index({ userId: 1, isRemoved: 1 });
downloadEventSchema.index({ userId: 1, hash: 1, createdAt: -1 });
downloadEventSchema.index({ fileId: 1, createdAt: -1 });

export const DownloadEvent = mongoose.model<IDownloadEvent>(
  "DownloadEvent",
  downloadEventSchema,
);