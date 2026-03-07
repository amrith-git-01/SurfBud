import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { DownloadService } from "../services/download.service";

export const DownloadController = {
  trackDownload: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing user" },
      });
      return;
    }

    const {
      hash,
      filename,
      url,
      size,
      mimeType,
      sourceDomain,
      durationMs,
      isRemoved,
      removedAt,
    } = req.body as {
      hash: string;
      filename: string;
      url?: string;
      size?: number;
      mimeType?: string;
      sourceDomain?: string;
      durationMs?: number;
      isRemoved?: boolean;
      removedAt?: string;
    };

    const result = await DownloadService.recordDownload(userId, {
      hash,
      filename,
      url,
      size,
      mimeType,
      sourceDomain,
      durationMs,
      isRemoved,
      removedAt: removedAt ? new Date(removedAt) : undefined,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  }),
};
