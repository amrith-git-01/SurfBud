import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUserDownloadSettings extends Document {
  userId: Types.ObjectId;
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
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
