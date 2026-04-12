// api/src/services/download.service.ts
import type { IDownloadEvent } from "../models/download-event.model";
import type { IFile } from "../models/file.model";
import { FileRepository } from "../repositories/file.repository";
import { DownloadEventRepository } from "../repositories/download-event.repository";
import { DownloadMetricsService } from "./download-metrics.service";
import { DownloadSettingsService } from "./download-settings.service";
import { NotFoundError } from "../utils/errors";
import { inferFileCategory } from "../utils/file-utils";
import { sseManager } from "../sse/sse.manager";

import { cancelRemovalJob } from "../jobs/queues";

export interface DownloadPayload {
  hash: string | null;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  fileExtension: string;
  fileCategory: string;
  sourceDomain: string;
  duration: number;
  savedPath?: string;
}

export interface ProcessResult {
  event: IDownloadEvent;
  file: IFile;
  isDuplicate: boolean;
}

export interface RemovalConfirmedInput {
  savedPath: string;
  hash: string;
}

export interface RemovalFailedInput {
  savedPath?: string;
  hash: string;
  reason?: string;
}

export const DownloadService = {
  async processDownload(
    userId: string,
    payload: DownloadPayload,
  ): Promise<ProcessResult | null> {
    const downloadSettings = await DownloadSettingsService.getSettings(userId);
    if (!downloadSettings.trackingEnabled) {
      return null;
    }

    const inferred = inferFileCategory({
      filename: payload.filename,
      mimeType: payload.mimeType,
    });

    const existingFile = payload.hash
      ? await FileRepository.findByHash(userId, payload.hash)
      : null;
    const status = existingFile ? "duplicate" : "new";

    let file: IFile;
    if (!existingFile) {
      file = (await FileRepository.create({
        userId,
        hash: payload.hash ?? `no-hash-${Date.now()}`,
        filename: payload.filename,
        url: payload.url,
        savedPath: payload.savedPath,
        size: payload.size,
        fileExtension: inferred.fileExtension,
        fileCategory: inferred.category,
        mimeType: payload.mimeType,
        sourceDomain: payload.sourceDomain,
      })) as IFile;
    } else {
      file = existingFile as IFile;

      if (payload.savedPath && !file.savedPath) {
        const updatedFile = await FileRepository.setSavedPathIfMissing(
          userId,
          String(file._id),
          payload.savedPath,
        );

        if (updatedFile) {
          file = updatedFile as IFile;
        }
      }
    }

    const event = await DownloadEventRepository.create({
      userId,
      fileId: String(file._id),
      filename: payload.filename,
      hash: payload.hash,
      savedPath: payload.savedPath,
      sourceDomain: payload.sourceDomain,
      status,
      duration: payload.duration,
    });

    await DownloadMetricsService.updateOnDownload(userId, file, status);

    sseManager.emitDownloadNew(userId, {
      id: String(event._id),
      filename: event.filename,
      size: file.size ?? 0,
      category: file.fileCategory ?? "other",
      status: event.status,
      sourceDomain: event.sourceDomain ?? "unknown",
      downloadedAt: event.createdAt.toISOString(),
    });

    if (status === "duplicate" && payload.hash && payload.savedPath) {
      const decision = await DownloadSettingsService.getRemovalDecision(userId);

      if (decision.shouldAutoRemove) {
        await DownloadEventRepository.markRemovalPending({
          userId,
          hash: payload.hash,
          savedPath: payload.savedPath,
        });

        sseManager.emitRemoveFile(userId, {
          type: "remove:file",
          savedPath: payload.savedPath,
          hash: payload.hash,
        });
      }
    }

    return {
      event,
      file,
      isDuplicate: status === "duplicate",
    };
  },

  async markRemoved(userId: string, eventId: string): Promise<IDownloadEvent> {
    const event = await DownloadEventRepository.markRemoved(eventId, userId);
    if (!event) {
      const existingEvent = await DownloadEventRepository.findById(
        eventId,
        userId,
      );
      if (existingEvent) {
        return existingEvent;
      }

      throw new NotFoundError("Download event not found");
    }

    if (event.status === "duplicate") {
      await DownloadMetricsService.reconcileDuplicateSize(userId);
    }

    sseManager.emitDownloadUpdated(userId, {
      id: String(event._id),
      removed: true,
      filename: event.filename,
    });

    return event;
  },

  async cancelRemoval(userId: string, hash: string): Promise<void> {
    await cancelRemovalJob(userId, hash);
    await DownloadEventRepository.markRemovalCancelled({ userId, hash });
  },

  async markRemovalConfirmed(
    userId: string,
    input: RemovalConfirmedInput,
  ): Promise<void> {
    const event = await DownloadEventRepository.markRemovalConfirmed({
      userId,
      hash: input.hash,
      savedPath: input.savedPath,
    });

    if (event) {
      await DownloadMetricsService.reconcileDuplicateSize(userId);

      sseManager.emitDownloadUpdated(userId, {
        id: String(event._id),
        removed: true,
        filename: event.filename,
      });
    }
  },

  async markRemovalFailed(
    userId: string,
    input: RemovalFailedInput,
  ): Promise<void> {
    await DownloadEventRepository.markRemovalFailed({
      userId,
      hash: input.hash,
      savedPath: input.savedPath,
      reason: input.reason,
    });
  },

  async listPendingRemovals(userId: string): Promise<{
    items: { savedPath: string; hash: string }[];
  }> {
    const items =
      await DownloadEventRepository.listPendingExtensionRemovals(userId);
    return { items };
  },

  async getFileById(userId: string, fileId: string): Promise<IFile | null> {
    const file = await FileRepository.findById(userId, fileId);

    if (!file) {
      return null;
    }

    if (file.savedPath?.trim()) {
      return file;
    }

    const fallbackSavedPath =
      await DownloadEventRepository.findLatestSavedPathByFileId(fileId, userId);

    if (!fallbackSavedPath) {
      return file;
    }

    void FileRepository.setSavedPathIfMissing(
      userId,
      fileId,
      fallbackSavedPath,
    );

    return {
      ...file,
      savedPath: fallbackSavedPath,
    } as IFile;
  },

  async getFileTimeline(
    userId: string,
    fileId: string,
  ): Promise<IDownloadEvent[]> {
    return DownloadEventRepository.findByFileId(fileId, userId);
  },

  async getTrend(userId: string, period: number) {
    return DownloadEventRepository.getTrend(userId, period);
  },

  async getRecentEvents(userId: string, limit: number) {
    return DownloadEventRepository.findRecent(userId, limit);
  },

  async getEvents(
    userId: string,
    options: {
      page: number;
      limit: number;
      sort?: "newest" | "oldest";
      status?: "new" | "duplicate";
      isRemoved?: boolean;
      category?: string;
      domain?: string;
      excludeDomains?: string[];
      search?: string;
      date?: string;
      period?: "today" | "week" | "month" | "all";
    },
    timezone: string = "UTC",
  ) {
    return DownloadEventRepository.findByUserId(userId, options, timezone);
  },

  async getDuplicateGroups(userId: string) {
    return DownloadEventRepository.getDuplicateGroups(userId);
  },
};
