import mongoose, { Document, Schema, Types } from "mongoose";

export type GracePeriodType = "immediate" | "delayed";
export type GracePeriodMinutes = 15 | 30 | 60;

export interface IUserDownloadSettings extends Document {
  userId: Types.ObjectId;
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  gracePeriodType: GracePeriodType;
  gracePeriodMinutes: GracePeriodMinutes;
  routingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userDownloadSettingsSchema = new Schema<IUserDownloadSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trackingEnabled: {
      type: Boolean,
      default: true,
    },
    autoRemoveEnabled: {
      type: Boolean,
      default: false,
    },
    gracePeriodType: {
      type: String,
      enum: ["immediate", "delayed"],
      default: "delayed",
    },
    gracePeriodMinutes: {
      type: Number,
      enum: [15, 30, 60],
      default: 15,
    },
    routingEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userDownloadSettingsSchema.index({ userId: 1 }, { unique: true });

export const UserDownloadSettingsModel = mongoose.model<IUserDownloadSettings>(
  "UserDownloadSettings",
  userDownloadSettingsSchema,
);
