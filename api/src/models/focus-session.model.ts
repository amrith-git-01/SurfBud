import mongoose, { Document, Schema, Types } from "mongoose";

export type FocusSessionStatus = "draft" | "active" | "completed" | "abandoned";

export interface IFocusSession extends Document {
  userId: Types.ObjectId;
  domain: string;
  label: string;
  plannedMins: number | null;
  actualMins: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  status: FocusSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const focusSessionSchema = new Schema<IFocusSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    plannedMins: { type: Number, default: null, min: 1, max: 480 },
    actualMins: { type: Number, default: null, min: 0 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ["draft", "active", "completed", "abandoned"],
      default: "draft",
    },
  },
  { timestamps: true },
);

focusSessionSchema.index({ userId: 1, startedAt: -1 });
focusSessionSchema.index({ userId: 1, status: 1 });
focusSessionSchema.index({ userId: 1, status: 1, startedAt: -1 });

export const FocusSessionModel = mongoose.model<IFocusSession>(
  "FocusSession",
  focusSessionSchema,
);
