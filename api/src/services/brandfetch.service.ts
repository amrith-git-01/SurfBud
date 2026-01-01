import { env } from "../config/env";
import type { BrandfetchBrandResponse } from "../schemas/brandfetch.schemas";
import { BrandfetchBrandResponseSchema } from "../schemas/brandfetch.schemas";
import { logger } from "../utils/logger";
const BRANDFETCH_API_BASE = "https://api.brandfetch.io";
const LOGO_TYPE_PRIORITY = ["icon", "logo", "symbol", "other"] as const;
const FORMAT_PRIORITY = ["png", "webp", "jpeg", "svg"] as const;
const COLOR_TYPE_PRIORITY = ["accent", "brand", "dark", "light"] as const;
function normalizeHex(hex: string): string {
  const t = hex.trim();
  if (t.startsWith("#")) return t;
  return `#${t}`;
}
function pickLogoUrl(logos: BrandfetchBrandResponse["logos"]): string | null {
  if (!logos?.length) return null;
  for (const logoType of LOGO_TYPE_PRIORITY) {
    const logo = logos.find((l) => l.type === logoType);
    if (!logo?.formats?.length) continue;
    for (const fmt of FORMAT_PRIORITY) {
      const f = logo.formats.find((x) => x.format === fmt);
      if (f?.src) return f.src;
    }
    const first = logo.formats[0];
    if (first?.src) return first.src;
  }
  return null;
}
function pickColorHex(
  colors: BrandfetchBrandResponse["colors"],
): string | null {
  if (!colors?.length) return null;
  for (const ct of COLOR_TYPE_PRIORITY) {
    const c = colors.find((x) => x.type === ct);
    if (c?.hex) return normalizeHex(c.hex);
  }
  const first = colors[0];
  return first?.hex ? normalizeHex(first.hex) : null;
}
export const BrandfetchService = {
  async fetchBrandAssetsForDomain(
    domain: string,
  ): Promise<{ domainLogo: string | null; domainColor: string | null }> {
    const key = env.BRANDFETCH_API_KEY?.trim();
    if (!key) {
      return { domainLogo: null, domainColor: null };
    }
    const normalized = domain.trim().toLowerCase();
    if (!normalized) {
      return { domainLogo: null, domainColor: null };
    }
    const url = `${BRANDFETCH_API_BASE}/v2/brands/domain/${encodeURIComponent(normalized)}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status === 404) {
        logger.debug({ domain: normalized }, "brandfetch: brand not found");
        return { domainLogo: null, domainColor: null };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logger.warn(
          {
            domain: normalized,
            status: res.status,
            body: body.slice(0, 200),
          },
          "brandfetch: request failed",
        );
        return { domainLogo: null, domainColor: null };
      }
      const json: unknown = await res.json();
      const parsed = BrandfetchBrandResponseSchema.safeParse(json);
      if (!parsed.success) {
        logger.warn(
          { domain: normalized, issues: parsed.error.flatten() },
          "brandfetch: response shape unexpected",
        );
        return { domainLogo: null, domainColor: null };
      }
      return {
        domainLogo: pickLogoUrl(parsed.data.logos),
        domainColor: pickColorHex(parsed.data.colors),
      };
    } catch (err) {
      logger.error(
        { domain: normalized, error: (err as Error).message },
        "brandfetch: fetch error",
      );
      return { domainLogo: null, domainColor: null };
    }
  },
};
