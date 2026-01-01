import Groq from "groq-sdk";
import { env } from "../config/env";
import { GroqDomainClassificationResponseSchema } from "../schemas/domain-classification-ai.schemas";
import { chatCompletionWithModelFallback } from "../utils/groq-with-fallback";
import { logger } from "../utils/logger";

const MAX_DOMAINS_PER_CALL = 24;

export const DomainClassificationAIService = {
  async classifyDomains(
    domains: string[],
    allowedSlugs: string[],
  ): Promise<
    {
      domain: string;
      label: string;
      description: string;
      categorySlug: string;
    }[]
  > {
    if (!env.GROQ_API_KEY) {
      logger.warn("GROQ_API_KEY missing — skipping Groq classification");
      return [];
    }

    const batch = domains.slice(0, MAX_DOMAINS_PER_CALL);
    const slugList = allowedSlugs.join(", ");

    const prompt = `You classify website domains for a productivity app.
For each domain, return a short human label (e.g. "GitHub"), a one-sentence description, and exactly one categorySlug from this allowed list (use the slug string exactly): ${slugList}

Respond with JSON only, shape:
{"classifications":[{"domain":"...","label":"...","description":"...","categorySlug":"..."}]}

Domains to classify:
${batch.map((d) => `- ${d}`).join("\n")}`;

    const groq = new Groq({ apiKey: env.GROQ_API_KEY });

    const completion = await chatCompletionWithModelFallback(groq, {
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      logger.error("Groq returned empty content after fallback chain");
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error({ raw }, "Groq JSON parse failed");
      return [];
    }

    const decoded = GroqDomainClassificationResponseSchema.safeParse(parsed);
    if (!decoded.success) {
      logger.error(
        { issues: decoded.error.flatten() },
        "Groq response failed schema validation",
      );
      return [];
    }

    const allowed = new Set(allowedSlugs.map((s) => s.toLowerCase()));
    return decoded.data.classifications.map((row) => ({
      ...row,
      domain: row.domain.trim().toLowerCase(),
      categorySlug: allowed.has(row.categorySlug.toLowerCase())
        ? row.categorySlug.toLowerCase()
        : "other",
    }));
  },
};
