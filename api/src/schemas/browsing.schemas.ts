import { z } from "zod";

const BrowsingInteractionsSchema = z.object({
  keypresses: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  scrollEvents: z.number().int().nonnegative().default(0),
});

export const BrowsingSessionSchema = z
  .object({
    sessionId: z.string().uuid("Invalid sessionId"),
    domain: z.string().trim().min(1, "domain is required"),
    startedAt: z.string().datetime("Invalid startedAt"),
    endedAt: z.string().datetime("Invalid endedAt"),
    durationSeconds: z.number().int().nonnegative(),
    interactions: BrowsingInteractionsSchema,
  })
  .refine(
    (value) =>
      new Date(value.endedAt).getTime() >= new Date(value.startedAt).getTime(),
    { message: "endedAt must be greater than or equal to startedAt" },
  );

export const BrowsingSessionBatchSchema = z.object({
  sessions: z.array(BrowsingSessionSchema).min(1).max(500),
});

export const BrowsingListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const BrowsingMetricsTrendQuerySchema = z.object({
  period: z.enum(["7", "15", "30"]).default("7"),
});
export const BrowsingStatsPeriodEnum = z.enum([
  "today",
  "week",
  "month",
  "all",
]);
export type BrowsingStatsPeriod = z.infer<typeof BrowsingStatsPeriodEnum>;

export const BrowsingStatsDateLimitQuerySchema = z.object({
  period: BrowsingStatsPeriodEnum.default("today"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/** 30-minute daily activity timeline (§9.1). Defaults to today in user TZ. */
export const BrowsingTimelineQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});
