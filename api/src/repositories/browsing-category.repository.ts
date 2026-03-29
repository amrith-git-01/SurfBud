import type { BrowsingProductivityType } from "../models/browsing-category.model";
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

  async findSlugsByProductivityType(
    productivityType: BrowsingProductivityType,
  ): Promise<string[]> {
    const rows = await BrowsingCategory.find({
      isActive: true,
      productivityType,
    })
      .select({ slug: 1 })
      .lean()
      .exec();
    return rows.map((r) => r.slug as string);
  },
};
