import type { IBrowsingCategory } from "../models/browsing-category.model";
import { BrowsingCategory } from "../models/browsing-category.model";

export const BrowsingCategoryRepository = {
  async findAllActive(): Promise<IBrowsingCategory[]> {
    return BrowsingCategory.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
      .exec() as Promise<IBrowsingCategory[]>;
  },

  async findBySlugs(slugs: string[]): Promise<IBrowsingCategory[]> {
    const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()))];
    if (unique.length === 0) return [];
    return BrowsingCategory.find({ slug: { $in: unique } })
      .lean()
      .exec() as Promise<IBrowsingCategory[]>;
  },
};
