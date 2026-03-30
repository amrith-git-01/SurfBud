import type { BrowsingSessionRow } from "@/api/browsing.api";
import type { BrowsingStatsPeriod } from "@/api/browsing.api";

export type BrowsingDrawerTrigger =
  | { type: "time-online" }
  | { type: "all-sessions" }
  | { type: "sites-visited" }
  | { type: "top-site"; domain: string; label: string }
  | { type: "focus-score" }
  | { type: "longest-session" }
  | { type: "chart-bar"; date: string; formattedDate: string }
  | { type: "feed-session"; session: BrowsingSessionRow }
  | {
      type: "site-breakdown";
      domain: string;
      label: string;
      period: BrowsingStatsPeriod;
    }
  | {
      type: "site-breakdown-others";
      excludedDomains: string[];
      period: BrowsingStatsPeriod;
    }
  | {
      type: "category-breakdown";
      categorySlug: string;
      categoryName: string;
      period: BrowsingStatsPeriod;
    }
  | {
      type: "timeline-block";
      startIso: string;
      endIso: string;
      timeLabel: string;
      productivity: string;
    }
  | {
      type: "productivity-segment";
      productivityType: "productive" | "distracting" | "neutral";
      seconds: number;
    };
