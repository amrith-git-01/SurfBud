import { NotFoundError, ValidationError } from "../utils/errors";
import { DownloadSettingsRepository } from "../repositories/download-settings.repository";
import { RoutingFolderRepository } from "../repositories/routing-folder.repository";
import { DownloadEventRepository } from "../repositories/download-event.repository";
import { cancelAllRemovalJobsForUser } from "../jobs/queues";
import type { FileCategory } from "../utils/file-utils";

const DEFAULT_DOWNLOAD_SETTINGS = {
  trackingEnabled: true,
  autoRemoveEnabled: false,
  routingEnabled: false,
};

const INVALID_FOLDER_CHARS_REGEX = /[\\/:*?"<>|]/g;

export interface DownloadSettingsResponse {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  routingEnabled: boolean;
  routingFolders: Array<{
    _id: string;
    folderName: string;
    category: FileCategory | null;
  }>;
}

export interface UpdateDownloadSettingsInput {
  trackingEnabled?: boolean;
  autoRemoveEnabled?: boolean;
  routingEnabled?: boolean;
}

export interface CreateRoutingFolderInput {
  folderName: string;
}

export interface UpdateRoutingFolderInput {
  folderName?: string;
  category?: FileCategory | null;
}

export interface RemovalDecision {
  shouldAutoRemove: boolean;
}

function sanitizeFolderName(input: string): string {
  const sanitized = input
    .replace(INVALID_FOLDER_CHARS_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    throw new ValidationError("Folder name cannot be empty");
  }

  if (sanitized.length > 50) {
    throw new ValidationError("Folder name must be 50 characters or fewer");
  }

  return sanitized;
}

export const DownloadSettingsService = {
  async getSettings(userId: string): Promise<DownloadSettingsResponse> {
    await DownloadSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_DOWNLOAD_SETTINGS,
    });

    const [settings, folders] = await Promise.all([
      DownloadSettingsRepository.findByUserId(userId),
      RoutingFolderRepository.findByUserId(userId),
    ]);

    const scalarSettings = settings ?? DEFAULT_DOWNLOAD_SETTINGS;

    const routingFolders = folders.map((folder) => ({
      _id: String(folder._id),
      folderName: folder.folderName,
      category: (folder.category as FileCategory | null) ?? null,
    }));

    return {
      trackingEnabled: scalarSettings.trackingEnabled,
      autoRemoveEnabled: scalarSettings.autoRemoveEnabled,
      routingEnabled: scalarSettings.routingEnabled,
      routingFolders,
    };
  },

  async updateSettings(
    userId: string,
    patch: UpdateDownloadSettingsInput,
  ): Promise<DownloadSettingsResponse> {
    await DownloadSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_DOWNLOAD_SETTINGS,
    });

    await DownloadSettingsRepository.updateByUserId(userId, patch);

    if (patch.trackingEnabled === false || patch.autoRemoveEnabled === false) {
      await Promise.all([
        cancelAllRemovalJobsForUser(userId),
        DownloadEventRepository.markAllScheduledOrPendingAsCancelled(userId),
      ]);
    }

    return this.getSettings(userId);
  },

  async getRoutingFolders(
    userId: string,
  ): Promise<DownloadSettingsResponse["routingFolders"]> {
    const folders = await RoutingFolderRepository.findByUserId(userId);

    return folders.map((folder) => ({
      _id: String(folder._id),
      folderName: folder.folderName,
      category: (folder.category as FileCategory | null) ?? null,
    }));
  },

  async createRoutingFolder(
    userId: string,
    input: CreateRoutingFolderInput,
  ): Promise<DownloadSettingsResponse> {
    const folderCount = await RoutingFolderRepository.countByUserId(userId);

    if (folderCount >= 10) {
      throw new ValidationError("Maximum of 10 folders allowed");
    }

    const folderName = sanitizeFolderName(input.folderName);

    await RoutingFolderRepository.create({
      userId,
      folderName,
      category: null,
    });

    return this.getSettings(userId);
  },

  async updateRoutingFolder(
    userId: string,
    id: string,
    input: UpdateRoutingFolderInput,
  ): Promise<DownloadSettingsResponse> {
    const existing = await RoutingFolderRepository.findById(userId, id);

    if (!existing) {
      throw new NotFoundError("Routing folder not found");
    }

    const patch: UpdateRoutingFolderInput = {};

    if (input.folderName !== undefined) {
      patch.folderName = sanitizeFolderName(input.folderName);
    }

    if (input.category !== undefined) {
      if (input.category !== null) {
        await RoutingFolderRepository.clearCategoryMapping(
          userId,
          input.category,
          id,
        );
      }

      patch.category = input.category;
    }

    await RoutingFolderRepository.updateById(userId, id, patch);

    return this.getSettings(userId);
  },

  async deleteRoutingFolder(
    userId: string,
    id: string,
  ): Promise<DownloadSettingsResponse> {
    const existing = await RoutingFolderRepository.findById(userId, id);

    if (!existing) {
      throw new NotFoundError("Routing folder not found");
    }

    await RoutingFolderRepository.deleteById(userId, id);

    return this.getSettings(userId);
  },

  async getRemovalDecision(userId: string): Promise<RemovalDecision> {
    await DownloadSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_DOWNLOAD_SETTINGS,
    });

    const settings =
      (await DownloadSettingsRepository.findByUserId(userId)) ??
      DEFAULT_DOWNLOAD_SETTINGS;

    if (!settings.trackingEnabled || !settings.autoRemoveEnabled) {
      return { shouldAutoRemove: false };
    }

    return { shouldAutoRemove: true };
  },
};
