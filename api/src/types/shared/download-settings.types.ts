export type DownloadRuleValue = "dont_track" | "track_keep" | "track_remove";
export type GracePeriodType = "immediate" | "delayed";
export type GracePeriodMinutes = 15 | 30 | 60;

export type FileCategory =
  | "document"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "image"
  | "text"
  | "executable"
  | "other";

export interface DomainRule {
  _id: string;
  domain: string;
  rule: DownloadRuleValue;
}

export interface CategoryRule {
  _id: string;
  category: FileCategory;
  rule: DownloadRuleValue;
}

export interface RoutingFolder {
  _id: string;
  folderName: string;
  category: FileCategory | null;
}

export interface DownloadSettings {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  gracePeriodType: GracePeriodType;
  gracePeriodMinutes: GracePeriodMinutes;
  routingEnabled: boolean;
  domainRules: DomainRule[];
  categoryRules: CategoryRule[];
  routingFolders: RoutingFolder[];
}

export interface DownloadSettingsSyncPayload {
  settings: DownloadSettings;
  syncedAt: string;
  source: "dashboard" | "extension-fetch";
}
