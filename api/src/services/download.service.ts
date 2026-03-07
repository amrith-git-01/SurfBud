import { FileRepository } from "../repositories/file.repository";
import {
  DownloadEventRepository,
  type DownloadStatus,
} from "../repositories/download-event.repository";
import { inferFileCategory } from "../utils/file-utils";

export interface RecordDownloadInput {
  hash: string;
  filename: string;
  url?: string;
  size?: number;
  mimeType?: string;
  sourceDomain?: string;
  durationMs?: number;
  isRemoved?: boolean;
  removedAt?: Date;
}

export const DownloadService = {
  async recordDownload(
    userId: string,
    input: RecordDownloadInput,
  ): Promise<{
    status: DownloadStatus;
    fileId: string;
    downloadEventId: string;
  }> {
    // Derive extension + canonical category using your shared util
    const { fileExtension, category } = inferFileCategory({
      filename: input.filename,
      mimeType: input.mimeType,
    });

    // 1) Look up existing File (dedupe by userId + hash)
    let file = await FileRepository.findByUserAndHash(userId, input.hash);
    let status: DownloadStatus;

    if (!file) {
      // First time we've seen this file for this user
      file = await FileRepository.create({
        userId,
        hash: input.hash,
        filename: input.filename,
        url: input.url,
        size: input.size,
        fileExtension,
        fileCategory: category,
        mimeType: input.mimeType,
        sourceDomain: input.sourceDomain,
      });
      status = "new";
    } else {
      // Already have this file for this user
      status = "duplicate";
    }

    // 2) Always create a DownloadEvent
    const event = await DownloadEventRepository.createEvent({
      userId,
      fileId: String(file._id),
      filename: input.filename,
      sourceDomain: input.sourceDomain,
      status,
      duration: input.durationMs,
      isRemoved: input.isRemoved,
      removedAt: input.removedAt,
    });

    return {
      status,
      fileId: String(file._id),
      downloadEventId: String(event._id),
    };
  },
};
