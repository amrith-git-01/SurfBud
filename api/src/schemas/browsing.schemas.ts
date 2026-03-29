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

export const BrowsingDrawerQuerySchema = z
  .preprocess((input) => {
    if (!input || typeof input !== "object") return input;
    const raw = input as Record<string, unknown>;
    if (
      raw.excludeDomains === undefined &&
      raw["excludeDomains[]"] !== undefined
    ) {
      return {
        ...raw,
        excludeDomains: raw["excludeDomains[]"],
      };
    }
    return input;
  }, z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    period: z.enum(["today", "week", "month", "all"]).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
      .optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    domain: z.string().optional(),
    excludeDomains: z
      .preprocess((value) => {
        if (Array.isArray(value)) {
          return value
            .map((item) => String(item).trim().toLowerCase())
            .filter((item) => item.length > 0);
        }
        if (typeof value === "string") {
          return value
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter((item) => item.length > 0);
        }
        return undefined;
      }, z.array(z.string().min(1)).max(100))
      .optional(),
    categorySlug: z.string().optional(),
    productivityType: z
      .enum(["productive", "distracting", "neutral"])
      .optional(),
    sort: z.enum(["newest", "oldest", "longest"]).default("newest"),
  }))
  .superRefine((data, ctx) => {
    const hasFrom = data.from != null && data.from.length > 0;
    const hasTo = data.to != null && data.to.length > 0;
    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from and to must be provided together",
        path: hasFrom ? ["to"] : ["from"],
      });
    }
    const hasWindow = hasFrom && hasTo;
    const hasDate = data.date != null && data.date.length > 0;
    const hasPeriod = data.period != null;
    const scopeCount = [hasWindow, hasDate, hasPeriod].filter(Boolean).length;
    if (scopeCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use only one of: period, date, or from+to",
        path: ["period"],
      });
    }
  });

export type BrowsingDrawerQueryInput = z.infer<typeof BrowsingDrawerQuerySchema>;

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
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** 30-minute daily activity timeline (§9.1). Defaults to today in user TZ. */
export const BrowsingTimelineQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});
