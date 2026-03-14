import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDomainStats extends Document {
  userId: Types.ObjectId;
  domain: string;
  totalCount: number;
  newCount: number;
  dupCount: number;
  newSize: number;
  dupSize: number;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const domainStatsSchema = new Schema<IDomainStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true },
    totalCount: { type: Number, default: 0 },
    newCount: { type: Number, default: 0 },
    dupCount: { type: Number, default: 0 },
    newSize: { type: Number, default: 0 },
    dupSize: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
  },
  { timestamps: true },
);

domainStatsSchema.index({ userId: 1, domain: 1 }, { unique: true });
domainStatsSchema.index({ userId: 1, totalCount: -1 });

export const DomainStatsModel = mongoose.model<IDomainStats>(
  "DomainStats",
  domainStatsSchema,
);
