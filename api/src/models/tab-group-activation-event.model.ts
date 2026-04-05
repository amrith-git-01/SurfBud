import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITabGroupActivationEvent extends Document {
  userId: Types.ObjectId;
  tabGroupId: Types.ObjectId;
  tabGroupName: string;
  tabGroupColor: string;
  urls: string[];
  activatedAt: Date;
}

const tabGroupActivationEventSchema = new Schema<ITabGroupActivationEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tabGroupId: {
    type: Schema.Types.ObjectId,
    ref: "TabGroupMode",
    required: true,
  },
  tabGroupName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  tabGroupColor: {
    type: String,
    required: true,
    match: /^#[0-9A-Fa-f]{6}$/,
  },
  urls: {
    type: [String],
    required: true,
  },
  activatedAt: {
    type: Date,
    default: Date.now,
  },
});

tabGroupActivationEventSchema.index({ userId: 1, activatedAt: -1 });
tabGroupActivationEventSchema.index({ userId: 1, tabGroupId: 1, activatedAt: -1 });

export const TabGroupActivationEventModel = mongoose.model<ITabGroupActivationEvent>(
  "TabGroupActivationEvent",
  tabGroupActivationEventSchema,
);
