import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI required"),
  REDIS_URL: z.string().min(1, "REDIS_URL required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be ≥ 32 chars"),
  DASHBOARD_ORIGIN: z.string().default("http://localhost:5173"),
  EXTENSION_ORIGIN: z.string().default("chrome-extension://"),
  GROQ_API_KEY: z.string().optional().default(""),
  BRANDFETCH_API_KEY: z.string().optional().default(""),
});

export const env = EnvSchema.parse(process.env);
