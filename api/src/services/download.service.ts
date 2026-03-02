import type { IDownloadEvent } from "../models/download-event.model";
import type { IFile } from "../models/file.model";
import { FileRepository } from "../repositories/file.repository";
import { DownloadEventRepository } from "../repositories/download-event.repository";
import { DownloadMetricsService } from "./download-metrics.service";
import { NotFoundError } from "../utils/errors";
import { inferFileCategory } from "../utils/file-utils";

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

export const DownloadService = {
  async processDownload(
    userId: string,
    payload: DownloadPayload,
  ): Promise<ProcessResult> {
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
        size: payload.size,
        fileExtension: inferred.fileExtension,
        fileCategory: inferred.category,
        mimeType: payload.mimeType,
        sourceDomain: payload.sourceDomain,
      })) as IFile;
    } else {
      file = existingFile as IFile;
    }

    const event = await DownloadEventRepository.create({
      userId,
      fileId: String(file._id),
      filename: payload.filename,
      sourceDomain: payload.sourceDomain,
      status,
      duration: payload.duration,
    });

    await DownloadMetricsService.updateOnDownload(userId, file, status);

    return {
      event,
      file,
      isDuplicate: status === "duplicate",
    };
  },

  async markRemoved(userId: string, eventId: string): Promise<IDownloadEvent> {
    const event = await DownloadEventRepository.markRemoved(eventId, userId);
    if (!event) {
      throw new NotFoundError("Download event not found");
    }
    return event;
  },
};
