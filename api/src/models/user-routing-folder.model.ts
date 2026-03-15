import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUserRoutingFolder extends Document {
  userId: Types.ObjectId;
  folderName: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userRoutingFolderSchema = new Schema<IUserRoutingFolder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    folderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    category: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userRoutingFolderSchema.index({ userId: 1 });

userRoutingFolderSchema.index(
  { userId: 1, category: 1 },
  {
    unique: true,
    sparse: true,
  },
);

export const UserRoutingFolderModel = mongoose.model<IUserRoutingFolder>(
  "UserRoutingFolder",
  userRoutingFolderSchema,
);