import { UserModel } from "../models/user.model";
import type { IUser } from "../models/user.model";

export const UserRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  },

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id).lean();
  },

  async create(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    timezone?: string;
  }): Promise<IUser> {
    return UserModel.create(data);
  },

  async updateTimezone(userId: string, timezone: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { timezone });
  },
};
