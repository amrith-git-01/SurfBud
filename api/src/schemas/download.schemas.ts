// api/src/schemas/download.schemas.ts
import { z } from "zod";
import { FILE_CATEGORIES } from "../utils/file-utils";

const DownloadRuleValueSchema = z.enum(["dont_track", "track_keep", "track_remove"]);
const DownloadRuleInputSchema = z
  .union([DownloadRuleValueSchema, z.literal("never_auto_remove")])
  .transform((value) =>
    value === "never_auto_remove" ? "track_keep" : value,
  );
const GracePeriodTypeSchema = z.enum(["immediate", "delayed"]);
const GracePeriodMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);
const FileCategorySchema = z.enum(FILE_CATEGORIES);

export const ObjectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid ID format"),
});

export const HashParamSchema = z.object({
  hash: z.string().trim().min(1, "Hash is required").max(256),
});

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

export const RemovalConfirmedSchema = z.object({
  savedPath: z.string().trim().min(1, "savedPath is required"),
  hash: z.string().trim().min(1, "hash is required").max(256),
});

export const RemovalFailedSchema = z.object({
  savedPath: z.string().trim().min(1).optional(),
  hash: z.string().trim().min(1, "hash is required").max(256),
  reason: z.string().trim().min(1).max(200).optional(),
});

export const TrendQuerySchema = z.object({
  period: z.enum(["7", "15", "30"]).default("7"),
});

export const UpdateDownloadSettingsSchema = z
  .object({
    trackingEnabled: z.boolean().optional(),
    autoRemoveEnabled: z.boolean().optional(),
    gracePeriodType: GracePeriodTypeSchema.optional(),
    gracePeriodMinutes: GracePeriodMinutesSchema.optional(),
    routingEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const DomainRuleCreateSchema = z.object({
  domain: z.string().trim().min(1, "Domain is required"),
  rule: DownloadRuleInputSchema,
});

export const DomainRuleUpdateSchema = z.object({
  rule: DownloadRuleInputSchema,
});

export const CategoryRuleUpsertSchema = z.object({
  category: FileCategorySchema,
  rule: DownloadRuleInputSchema,
});

export const RoutingFolderCreateSchema = z.object({
  folderName: z.string().trim().min(1, "Folder name is required").max(50),
});

export const RoutingFolderUpdateSchema = z
  .object({
    folderName: z.string().trim().min(1).max(50).optional(),
    category: FileCategorySchema.nullable().optional(),
  })
  .refine(
    (data) => data.folderName !== undefined || data.category !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const EventsQuerySchema = z.preprocess(
  (input) => {
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
  },
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    status: z.enum(["new", "duplicate"]).optional(),
    category: z.string().optional(),
    domain: z.string().min(1).optional(),
    excludeDomains: z
      .preprocess((value) => {
        if (Array.isArray(value)) {
          return value
            .map((item) => String(item).trim())
            .filter((item) => item.length > 0);
        }
        if (typeof value === "string") {
          return value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        }
        return undefined;
      }, z.array(z.string().min(1)).max(100))
      .optional(),
    search: z.string().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .optional(),
    period: z.enum(["today", "week", "month", "all"]).default("all"),
  }),
);