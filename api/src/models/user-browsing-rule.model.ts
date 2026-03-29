import mongoose, { Document, Schema, Types } from "mongoose";

export type BrowsingRuleType = "domain";
export type BrowsingRuleValue = "track" | "dont_track";

export interface IUserBrowsingRule extends Document {
  userId: Types.ObjectId;
  ruleType: BrowsingRuleType;
  domain: string | null;
  rule: BrowsingRuleValue;
  createdAt: Date;
  updatedAt: Date;
}

const userBrowsingRuleSchema = new Schema<IUserBrowsingRule>(
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
      enum: ["track", "dont_track"],
      required: true,
    },
  },
  { timestamps: true },
);

userBrowsingRuleSchema.index({ userId: 1, ruleType: 1 });

userBrowsingRuleSchema.index(
  { userId: 1, domain: 1 },
  {
    unique: true,
    partialFilterExpression: { ruleType: "domain" },
  },
);

export const UserBrowsingRuleModel = mongoose.model<IUserBrowsingRule>(
  "UserBrowsingRule",
  userBrowsingRuleSchema,
);