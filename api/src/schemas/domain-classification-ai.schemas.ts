import { z } from "zod";

export const GroqDomainClassificationRowSchema = z.object({
  domain: z.string().min(1),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  categorySlug: z.string().min(1).max(64),
});

export const GroqDomainClassificationResponseSchema = z.object({
  classifications: z.array(GroqDomainClassificationRowSchema).min(1),
});
