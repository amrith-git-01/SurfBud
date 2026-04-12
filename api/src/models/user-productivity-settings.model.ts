import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUserProductivitySettings extends Document {
  userId: Types.ObjectId;
  tabEvolutionEnabled: boolean;
  streakTabEvolutionEnabled: boolean;
  trackNewTabsInTabGroupEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userProductivitySettingsSchema = new Schema<IUserProductivitySettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tabEvolutionEnabled: {
      type: Boolean,
      default: true,
    },
    streakTabEvolutionEnabled: {
      type: Boolean,
      default: true,
    },
    trackNewTabsInTabGroupEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userProductivitySettingsSchema.index({ userId: 1 }, { unique: true });

export const UserProductivitySettingsModel = mongoose.model<IUserProductivitySettings>(
  "UserProductivitySettings",
  userProductivitySettingsSchema,
);
