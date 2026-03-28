import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUserBrowsingSettings extends Document {
  userId: Types.ObjectId;
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const userBrowsingSettingsSchema = new Schema<IUserBrowsingSettings>(
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
    interactionTrackingEnabled: {
      type: Boolean,
      default: true,
    },
    minSessionDurationSeconds: {
      type: Number,
      default: 10,
      min: 1,
      max: 300,
    },
    mergeGapSeconds: {
      type: Number,
      default: 30,
      min: 5,
      max: 600,
    },
  },
  { timestamps: true },
);

userBrowsingSettingsSchema.index({ userId: 1 }, { unique: true });

export const UserBrowsingSettingsModel =
  mongoose.model<IUserBrowsingSettings>(
    "UserBrowsingSettings",
    userBrowsingSettingsSchema,
  );