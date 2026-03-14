import { z } from "zod";

export const ProcessDownloadSchema = z.object({
  hash: z.string().nullable(),
  filename: z.string().min(1),
  url: z.string().default(""),
  size: z.number().nonnegative().default(0),
  mimeType: z.string().default(""),
  fileExtension: z.string().default(""),
  fileCategory: z.string().default("Other"),
  sourceDomain: z.string().default(""),
  duration: z.number().nonnegative().default(0),
  savedPath: z.string().optional(),
});

export const TrendQuerySchema = z.object({
  period: z.enum(["7", "15", "30"]).default("7"),
});

export const EventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(["new", "duplicate"]).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  period: z.enum(["today", "week", "month", "all"]).default("all"),
});
