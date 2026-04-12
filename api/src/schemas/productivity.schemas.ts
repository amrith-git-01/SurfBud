import { z } from "zod";

const TAB_GROUP_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
export const TAB_EVOLUTION_MAX_URLS = 30;

export const ProductivityObjectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid ID format"),
});

export const CreateTabGroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  color: z
    .string()
    .regex(TAB_GROUP_COLOR_REGEX, "Color must be a valid hex value"),
  icon: z.string().trim().min(1, "Icon is required").max(50),
  urls: z.array(z.string().trim().url().max(2048)).min(1).max(10),
});

export const UpdateTabGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z
      .string()
      .regex(TAB_GROUP_COLOR_REGEX, "Color must be a valid hex value")
      .optional(),
    icon: z.string().trim().min(1).max(50).optional(),
    urls: z.array(z.string().trim().url().max(2048)).min(1).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const TabGroupActivationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const TabEvolutionSchema = z.object({
  urls: z
    .array(z.string().trim().url().max(2048))
    .min(1)
    .max(TAB_EVOLUTION_MAX_URLS),
});

export const UpdateProductivityUserSettingsSchema = z
  .object({
    tabEvolutionEnabled: z.boolean().optional(),
    streakTabEvolutionEnabled: z.boolean().optional(),
    trackNewTabsInTabGroupEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const CreateStreakSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100),
  domain: z.string().trim().min(1, "Domain is required").max(255),
  minMinutes: z.coerce.number().int().min(1).max(480),
  activeDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "At least one active day is required")
    .max(7)
    .transform((days) => [...new Set(days)]),
});

export const UpdateStreakSchema = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
    domain: z.string().trim().min(1).max(255).optional(),
    minMinutes: z.coerce.number().int().min(1).max(480).optional(),
    activeDays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .transform((days) => [...new Set(days)])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const StreakCalendarQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(90),
});

export const StartFocusSessionSchema = z.object({
  domain: z.string().trim().min(1, "Domain is required").max(255),
  plannedMins: z.coerce.number().int().min(1).max(480).nullable().default(null),
});

export const SaveFocusDraftSchema = z.object({
  domain: z.string().trim().min(1, "Domain is required").max(255),
  plannedMins: z.coerce.number().int().min(1).max(480).nullable().default(null),
  label: z.string().trim().min(1).max(100).optional(),
});

export const ActivateFocusDraftSchema = z.object({
  plannedMins: z.coerce.number().int().min(1).max(480).nullable().optional(),
});

export const EndFocusSessionSchema = z.object({
  status: z.enum(["completed", "abandoned"]),
});

export const UpdateFocusSessionSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(100).optional(),
    domain: z.string().trim().min(1, "Domain is required").max(255).optional(),
    plannedMins: z
      .union([z.null(), z.coerce.number().int().min(1).max(480)])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const FocusHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const FocusDraftsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100),
});
