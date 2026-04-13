import mongoose, { Document, Schema, Types } from "mongoose";

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export interface ITabGroupMode extends Document {
  userId: Types.ObjectId;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  urls: string[];
  evolvedUrls: string[];
  evolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tabGroupModeSchema = new Schema<ITabGroupMode>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    urls: {
      type: [String],
      required: true,
      validate: [
        {
          validator: (value: string[]) => value.length >= 1 && value.length <= 10,
          message: "Mode must contain between 1 and 10 URLs",
        },
        {
          validator: (value: string[]) => value.every((url) => isValidHttpUrl(url)),
          message: "All URLs must be valid HTTP/HTTPS URLs",
        },
      ],
    },
    evolvedUrls: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (value: string[]) => value.length <= 30,
          message: "Evolved tab list cannot exceed 30 URLs",
        },
        {
          validator: (value: string[]) =>
            value.length === 0 || value.every((url) => isValidHttpUrl(url)),
          message: "Evolved URLs must be valid HTTP/HTTPS URLs",
        },
      ],
    },
    evolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

tabGroupModeSchema.index({ userId: 1 });

export const TabGroupModeModel = mongoose.model<ITabGroupMode>(
  "TabGroupMode",
  tabGroupModeSchema,
);
