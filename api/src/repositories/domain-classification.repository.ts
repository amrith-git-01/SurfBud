import type { IDomainClassification } from "../models/domain-classification.model";
import { DomainClassification } from "../models/domain-classification.model";

export const DomainClassificationRepository = {
  async upsertPendingAndIncrementVerified(
    domain: string,
    otherCategorySlug: string = "other",
  ): Promise<void> {
    const normalized = domain.trim().toLowerCase();

    await DomainClassification.updateOne(
      { domain: normalized },
      {
        $inc: { verifiedCount: 1 },
        $setOnInsert: {
          domain: normalized,
          label: normalized, // placeholder until Groq classification runs
          description: "",
          categorySlug: otherCategorySlug,
          confidence: "pending",
          classifiedAt: null,
        },
      },
      { upsert: true },
    ).exec();
  },

  async findByDomain(domain: string): Promise<IDomainClassification | null> {
    const normalized = domain.trim().toLowerCase();
    return DomainClassification.findOne({ domain: normalized })
      .lean()
      .exec() as Promise<IDomainClassification | null>;
  },
};
