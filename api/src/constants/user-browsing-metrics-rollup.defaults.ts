import type {
  IUserBrowsingMetricsPeriod,
  IUserBrowsingMetricsToday,
} from "../models/user-browsing-metrics.model";

/** Embedded `today` after midnight rollover — matches spec §6.2 reset. */
export const EMPTY_USER_BROWSING_TODAY: IUserBrowsingMetricsToday = {
  totalActiveTime: 0,
  sitesVisited: 0,
  topSite: null,
  topSiteLabel: null,
  topSiteTime: 0,
  focusScore: null,
  longestSession: 0,
  longestSessionStart: null,
  longestSessionEnd: null,
  productiveTime: 0,
  distractingTime: 0,
  neutralTime: 0,
  contextSwitches: 0,
  deepFocusSessions: 0,
  sessionCount: 0,
  scatteredPeriods: 0,
  topCategorySlug: null,
};

/** Embedded `week` / `month` after period rollover. */
export const EMPTY_USER_BROWSING_PERIOD: IUserBrowsingMetricsPeriod = {
  totalActiveTime: 0,
  sitesVisited: 0,
  focusScore: null,
  productiveTime: 0,
  distractingTime: 0,
  neutralTime: 0,
  topSite: null,
  topSiteLabel: null,
  topCategorySlug: null,
  longestSession: 0,
};
