import mongoose, { Document, Schema, Types } from "mongoose";

export type DownloadRuleType = "domain";
export type DownloadRuleValue = "dont_track" | "track_keep" | "track_remove";
export type StoredDownloadRuleValue = DownloadRuleValue | "never_auto_remove";

export interface IUserDownloadRule extends Document {
  userId: Types.ObjectId;
  ruleType: DownloadRuleType;
  domain: string | null;
  rule: StoredDownloadRuleValue;
  createdAt: Date;
  updatedAt: Date;
}

const userDownloadRuleSchema = new Schema<IUserDownloadRule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ruleType: {
      type: String,
      enum: ["domain"],
      required: true,
    },
    domain: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    rule: {
      type: String,
      enum: ["dont_track", "track_keep", "track_remove", "never_auto_remove"],
      required: true,
    },
  },
  { timestamps: true },
);

userDownloadRuleSchema.index({ userId: 1, ruleType: 1 });

userDownloadRuleSchema.index(
  { userId: 1, domain: 1 },
  {
    unique: true,
    partialFilterExpression: { ruleType: "domain" },
  },
);

export const UserDownloadRuleModel = mongoose.model<IUserDownloadRule>(
  "UserDownloadRule",
  userDownloadRuleSchema,
);