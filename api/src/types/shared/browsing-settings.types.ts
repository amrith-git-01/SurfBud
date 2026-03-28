export type BrowsingRuleValue = "track" | "dont_track";

export interface BrowsingDomainRule {
  _id: string;
  domain: string;
  rule: BrowsingRuleValue;
}

export interface BrowsingSettings {
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  domainRules: BrowsingDomainRule[];
}

export interface BrowsingSettingsSyncPayload {
  settings: BrowsingSettings;
  syncedAt: string;
  source: "dashboard" | "extension-fetch";
}