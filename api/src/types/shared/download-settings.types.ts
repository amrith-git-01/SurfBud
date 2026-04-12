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

export interface RoutingFolder {
  _id: string;
  folderName: string;
  category: FileCategory | null;
}

export interface DownloadSettings {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  routingEnabled: boolean;
  routingFolders: RoutingFolder[];
}

export interface DownloadSettingsSyncPayload {
  settings: DownloadSettings;
  syncedAt: string;
  source: "dashboard" | "extension-fetch";
}
