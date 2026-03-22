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
          label: normalized,
          description: "",
          domainLogo: null,
          domainColor: null,
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

  async findByDomains(domains: string[]): Promise<IDomainClassification[]> {
    const normalized = [...new Set(domains.map((d) => d.trim().toLowerCase()))];
    if (normalized.length === 0) return [];
    return DomainClassification.find({ domain: { $in: normalized } })
      .lean()
      .exec() as Promise<IDomainClassification[]>;
  },

  async findPendingInDomains(
    domains: string[],
  ): Promise<IDomainClassification[]> {
    const normalized = [...new Set(domains.map((d) => d.trim().toLowerCase()))];
    if (normalized.length === 0) return [];
    return DomainClassification.find({
      domain: { $in: normalized },
      confidence: "pending",
    })
      .lean()
      .exec() as Promise<IDomainClassification[]>;
  },

  async findPendingLimited(limit: number): Promise<IDomainClassification[]> {
    return DomainClassification.find({ confidence: "pending" })
      .limit(limit)
      .lean()
      .exec() as Promise<IDomainClassification[]>;
  },

  async applyAiClassification(
    domain: string,
    data: {
      label: string;
      description: string;
      categorySlug: string;
    },
  ): Promise<void> {
    const normalized = domain.trim().toLowerCase();
    await DomainClassification.updateOne(
      { domain: normalized, confidence: "pending" },
      {
        $set: {
          label: data.label,
          description: data.description,
          categorySlug: data.categorySlug,
          confidence: "ai",
          classifiedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ).exec();
  },

  async applyBrandAssets(
    domain: string,
    data: { domainLogo: string | null; domainColor: string | null },
  ): Promise<void> {
    const normalized = domain.trim().toLowerCase();
    await DomainClassification.updateOne(
      { domain: normalized },
      {
        $set: {
          domainLogo: data.domainLogo,
          domainColor: data.domainColor,
          updatedAt: new Date(),
        },
      },
    ).exec();
  },
};
