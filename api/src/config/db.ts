import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

const MAX_RETRIES = 5;

export async function connectDB(): Promise<void> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      logger.info("MongoDB connected");
      return;
    } catch (error) {
      attempt++;
      logger.error("MongoDB connection failed", {
        attempt,
        error: (error as Error).message,
      });
      if (attempt >= MAX_RETRIES) throw error;
      await new Promise((res) => setTimeout(res, 2_000 * attempt));
    }
  }
}
