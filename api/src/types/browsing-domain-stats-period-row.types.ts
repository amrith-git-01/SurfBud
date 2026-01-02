import type { Types } from "mongoose";
import type { BrowsingProductivityType } from "../models/browsing-category.model";

/**
 * Plain object shape for aggregated domain stats + optional brand fields.
 * Not a Mongoose document — avoids assigning spread aggregates to `IBrowsingDomainStats`.
 */
export interface BrowsingDomainStatsPeriodRow {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;
  timezone: string;
  domain: string;
  label: string;
  categorySlug: string;
  productivityType: BrowsingProductivityType;
  totalActiveTime: number;
  visitCount: number;
  longestSession: number;
  createdAt: Date;
  updatedAt: Date;
  domainLogo: string | null;
  domainColor: string | null;
}
