import mongoose, { Schema, Document, Types } from "mongoose";

export interface IFile extends Document {
  userId: Types.ObjectId;
  hash: string;
  filename: string;
  url: string;
  savedPath?: string;
  size?: number;
  fileExtension?: string;
  fileCategory?: string;
  mimeType?: string;
  sourceDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hash: { type: String, required: true },
    filename: { type: String, required: true },
    url: { type: String, default: "" },
    savedPath: { type: String },
    size: { type: Number },
    fileExtension: { type: String },
    fileCategory: { type: String },
    mimeType: { type: String },
    sourceDomain: { type: String },
  },
  { timestamps: true },
);

fileSchema.index({ userId: 1, hash: 1 }, { unique: true });
fileSchema.index({ userId: 1, fileCategory: 1 });
fileSchema.index({ userId: 1, sourceDomain: 1 });

export const File = mongoose.model<IFile>("File", fileSchema);
