import {
  type IDownloadEvent,
  DownloadEvent,
} from "../models/download-event.model";

export type DownloadStatus = "new" | "duplicate";

export const DownloadEventRepository = {
  async createEvent(data: {
    userId: string;
    fileId: string;
    filename: string;
    sourceDomain?: string;
    status: DownloadStatus;
    duration?: number;
    isRemoved?: boolean;
    removedAt?: Date;
  }): Promise<IDownloadEvent> {
    return DownloadEvent.create({
      userId: data.userId,
      fileId: data.fileId,
      filename: data.filename,
      sourceDomain: data.sourceDomain,
      status: data.status,
      duration: data.duration,
      isRemoved: data.isRemoved ?? false,
      removedAt: data.removedAt,
    });
  },
};
