import { z } from "zod";

const BrandfetchFormatSchema = z.object({
  src: z.string().min(1),
  format: z.enum(["svg", "webp", "png", "jpeg"]),
});
const BrandfetchLogoSchema = z.object({
  type: z.enum(["icon", "logo", "symbol", "other"]),
  formats: z.array(BrandfetchFormatSchema),
});
const BrandfetchColorSchema = z.object({
  hex: z.string(),
  type: z.enum(["accent", "dark", "light", "brand"]),
});
export const BrandfetchBrandResponseSchema = z.object({
  logos: z.array(BrandfetchLogoSchema).optional(),
  colors: z.array(BrandfetchColorSchema).optional(),
});
export type BrandfetchBrandResponse = z.infer<
  typeof BrandfetchBrandResponseSchema
>;
    