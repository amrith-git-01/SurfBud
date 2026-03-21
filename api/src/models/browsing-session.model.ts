import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBrowsingInteractions {
  keypresses: number;
  clicks: number;
  scrollEvents: number;
}

export interface IBrowsingSession extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  domain: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  interactions: IBrowsingInteractions;
  createdAt: Date;
  updatedAt: Date;
}

const browsingInteractionsSchema = new Schema<IBrowsingInteractions>(
  {
    keypresses: { type: Number, required: true, default: 0, min: 0 },
    clicks: { type: Number, required: true, default: 0, min: 0 },
    scrollEvents: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const browsingSessionSchema = new Schema<IBrowsingSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationSeconds: { type: Number, required: true, min: 0 },
    interactions: { type: browsingInteractionsSchema, required: true },
  },
  { timestamps: true },
);

browsingSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
browsingSessionSchema.index({ userId: 1, endedAt: -1 });
export const BrowsingSession = mongoose.model<IBrowsingSession>(
  "BrowsingSession",
  browsingSessionSchema,
);
