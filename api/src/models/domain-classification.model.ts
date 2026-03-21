import mongoose, { Document, Schema } from "mongoose";
export type DomainConfidence = "pending" | "ai";
export interface IDomainClassification extends Document {
  domain: string;
  label: string;
  description: string;
  categorySlug: string;
  confidence: DomainConfidence;
  verifiedCount: number;
  classifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
const domainClassificationSchema = new Schema<IDomainClassification>(
  {
    domain: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, default: "" },
    categorySlug: { type: String, required: true, trim: true, lowercase: true },
    confidence: {
      type: String,
      required: true,
      enum: ["pending", "ai"],
      default: "pending",
    },
    verifiedCount: { type: Number, required: true, default: 0, min: 0 },
    classifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
domainClassificationSchema.index({ domain: 1 }, { unique: true });
domainClassificationSchema.index({ confidence: 1 });
export const DomainClassification = mongoose.model<IDomainClassification>(
  "DomainClassification",
  domainClassificationSchema,
);
