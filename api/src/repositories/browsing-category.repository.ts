import type { IBrowsingCategory } from "../models/browsing-category.model";
import { BrowsingCategory } from "../models/browsing-category.model";
export const BrowsingCategoryRepository = {
  async findAllActive(): Promise<IBrowsingCategory[]> {
    return BrowsingCategory.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
      .exec() as Promise<IBrowsingCategory[]>;
  },
};
