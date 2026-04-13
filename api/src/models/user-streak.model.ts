import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUserStreak extends Document {
  userId: Types.ObjectId;
  label: string;
  domain: string;
  minMinutes: number;
  activeDays: number[];
  currentStreak: number;
  longestStreak: number;
  todaySeconds: number;
  todayDate: string;
  lastMetAt: string | null;
  skipsUsed: number;
  isActive: boolean;
  evolvedUrls: string[];
  evolvedAt: Date | null;
  tabEvolutionEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userStreakSchema = new Schema<IUserStreak>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    domain: { type: String, required: true, trim: true, lowercase: true },
    minMinutes: { type: Number, required: true, min: 1, max: 480 },
    activeDays: {
      type: [Number],
      required: true,
      default: [0, 1, 2, 3, 4, 5, 6],
      validate: [
        {
          validator: (days: number[]) => days.length >= 1,
          message: "activeDays must contain at least one day",
        },
        {
          validator: (days: number[]) =>
            days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
          message: "activeDays must contain values between 0 and 6",
        },
      ],
    },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    todaySeconds: { type: Number, default: 0, min: 0 },
    todayDate: { type: String, required: true, default: "" },
    lastMetAt: { type: String, default: null },
    skipsUsed: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    evolvedUrls: { type: [String], default: [] },
    evolvedAt: { type: Date, default: null },
    tabEvolutionEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userStreakSchema.index({ userId: 1 });
userStreakSchema.index({ userId: 1, domain: 1 });
userStreakSchema.index({ userId: 1, isActive: 1 });

export const UserStreakModel = mongoose.model<IUserStreak>(
  "UserStreak",
  userStreakSchema,
);
