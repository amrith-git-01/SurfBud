import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { env } from "../config/env";
import { AuthError, ConflictError, ValidationError } from "../utils/errors";
import type { AuthTokens, JwtPayload } from "../types/shared/auth.types";

const BCRYPT_ROUNDS = 12;
const JWT_TTL = "7d";
const JWT_EXPIRES_SECONDS = 7 * 24 * 60 * 60;

function buildToken(userId: string, email: string): string {
  const payload: JwtPayload = { sub: userId, email };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_TTL });
}

export const AuthService = {
  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ tokens: AuthTokens; userId: string }> {
    if (password.length < 8)
      throw new ValidationError("Password must be at least 8 characters");
    const existing = await UserRepository.findByEmail(email);
    if (existing)
      throw new ConflictError("An account with this email already exists");
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await UserRepository.create({
      email,
      passwordHash,
      displayName,
    });
    const userId = String(user._id);
    const accessToken = buildToken(userId, email);
    return {
      tokens: { accessToken, expiresIn: JWT_EXPIRES_SECONDS },
      userId,
    };
  },

  async login(
    email: string,
    password: string,
  ): Promise<{
    tokens: AuthTokens;
    userId: string;
    displayName: string;
  }> {
    const user = await UserRepository.findByEmail(email);
    if (!user) throw new AuthError("Invalid email or password");

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new AuthError("Invalid email or password");

    const userId = String(user._id);
    const accessToken = buildToken(userId, user.email);
    return {
      tokens: { accessToken, expiresIn: JWT_EXPIRES_SECONDS },
      userId,
      displayName: user.displayName,
    };
  },
};
