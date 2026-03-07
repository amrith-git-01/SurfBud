import { UserModel } from "../models/user.model";
import type { IUser } from "../models/user.model";

export const UserRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  },

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  },

  async create(data: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<IUser> {
    return UserModel.create(data);
  },
};
