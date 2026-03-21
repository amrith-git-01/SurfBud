import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { BrowsingSessionService } from "../services/browsing-session.service";
import type { BrowsingSessionBatchPayload } from "../types/shared/browsing.types";

export const BrowsingController = {
  ingestBatch: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const body = req.body as BrowsingSessionBatchPayload;

    const result = await BrowsingSessionService.ingestBatch(
      userId,
      body.sessions,
    );

    res.status(202).json({
      success: true,
      data: result,
    });
  }),

  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await BrowsingSessionService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  }),

  getRecentSessions: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validatedQuery = (res.locals.validatedQuery ?? {}) as {
      limit?: number;
    };
    const limit = validatedQuery.limit ?? 50;

    const sessions = await BrowsingSessionService.getRecent(userId, limit);

    res.json({
      success: true,
      data: { sessions },
    });
  }),
};
