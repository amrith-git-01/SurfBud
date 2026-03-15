import { Schema, model } from "mongoose";
import type { Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    timezone: { type: String, default: "UTC" },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>("User", UserSchema);