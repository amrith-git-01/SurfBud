import type { Request, Response } from "express";
import { FocusSessionService } from "../services/focus-session.service";
import { ProductivityUserSettingsService } from "../services/productivity-user-settings.service";
import { StreakService } from "../services/streak.service";
import { ProductivityTabGroupService } from "../services/tab-group-mode.service";
import { asyncHandler } from "../utils/asyncHandler";

export const ProductivityController = {
  getProductivityUserSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await ProductivityUserSettingsService.getSettings(userId);
    res.json({ success: true, data: { settings } });
  }),

  updateProductivityUserSettings: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await ProductivityUserSettingsService.updateSettings(
      userId,
      req.body,
    );
    res.json({ success: true, data: { settings } });
  }),

  getTabGroups: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroups = await ProductivityTabGroupService.getTabGroups(userId);
    res.json({ success: true, data: { tabGroups } });
  }),

  getTabGroupLaunchUrls: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroupId = req.params.id as string;
    const urls = await ProductivityTabGroupService.getLaunchUrls(userId, tabGroupId);
    res.json({ success: true, data: { urls } });
  }),

  createTabGroup: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroup = await ProductivityTabGroupService.createTabGroup(userId, req.body);
    res.status(201).json({ success: true, data: { tabGroup } });
  }),

  updateTabGroup: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroupId = req.params.id as string;
    const tabGroup = await ProductivityTabGroupService.updateTabGroup(
      userId,
      tabGroupId,
      req.body,
    );
    res.json({ success: true, data: { tabGroup } });
  }),

  deleteTabGroup: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroupId = req.params.id as string;
    await ProductivityTabGroupService.deleteTabGroup(userId, tabGroupId);
    res.json({ success: true, data: { deleted: true } });
  }),

  activateTabGroup: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroupId = req.params.id as string;
    const { event, launchUrls } = await ProductivityTabGroupService.logTabGroupActivation(
      userId,
      tabGroupId,
    );
    res.status(201).json({ success: true, data: { event, launchUrls } });
  }),

  saveTabEvolution: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tabGroupId = req.params.id as string;
    const body = req.body as { urls: string[] };
    const tabGroup = await ProductivityTabGroupService.saveTabEvolution(
      userId,
      tabGroupId,
      body,
    );
    res.json({ success: true, data: { tabGroup } });
  }),

  getRecentTabGroupActivations: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const q = (res.locals.validatedQuery ?? {}) as { limit?: number };
    const events = await ProductivityTabGroupService.getRecentTabGroupActivations(
      userId,
      q.limit ?? 10,
    );
    res.json({ success: true, data: { events } });
  }),

  getStreaks: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const streaks = await StreakService.getStreaks(userId);
    res.json({ success: true, data: { streaks } });
  }),

  createStreak: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const streak = await StreakService.createStreak(userId, req.body);
    res.status(201).json({ success: true, data: { streak } });
  }),

  updateStreak: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const streakId = req.params.id as string;
    const streak = await StreakService.updateStreak(userId, streakId, req.body);
    res.json({ success: true, data: { streak } });
  }),

  deleteStreak: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const streakId = req.params.id as string;
    await StreakService.deleteStreak(userId, streakId);
    res.json({ success: true, data: { deleted: true } });
  }),

  getStreakCalendar: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const streakId = req.params.id as string;
    const query = (res.locals.validatedQuery ?? {}) as { days?: number };
    const data = await StreakService.getCalendar(userId, streakId, {
      days: query.days ?? 90,
    });
    res.json({ success: true, data });
  }),

  getActiveFocusSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const session = await FocusSessionService.getActiveSession(userId);
    res.json({ success: true, data: { session } });
  }),

  getFocusDrafts: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const q = (res.locals.validatedQuery ?? {}) as { limit?: number };
    const data = await FocusSessionService.listDrafts(userId, {
      limit: q.limit ?? 100,
    });
    res.json({ success: true, data });
  }),

  startFocusSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const session = await FocusSessionService.startSession(userId, req.body);
    res.status(201).json({ success: true, data: { session } });
  }),

  saveFocusDraft: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const session = await FocusSessionService.saveDraft(userId, req.body);
    res.status(201).json({ success: true, data: { session } });
  }),

  activateFocusDraft: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const session = await FocusSessionService.activateDraftSession(
      userId,
      sessionId,
      req.body ?? {},
    );
    res.json({ success: true, data: { session } });
  }),

  endFocusSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const session = await FocusSessionService.endSession(userId, sessionId, req.body);
    res.json({ success: true, data: { session } });
  }),

  getFocusHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const q = (res.locals.validatedQuery ?? {}) as { page?: number; limit?: number };
    const data = await FocusSessionService.getHistory(userId, {
      page: q.page ?? 1,
      limit: q.limit ?? 10,
    });
    res.json({ success: true, data });
  }),

  updateFocusSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const session = await FocusSessionService.updateSession(
      userId,
      sessionId,
      req.body,
    );
    res.json({ success: true, data: { session } });
  }),

  deleteFocusSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    await FocusSessionService.deleteSession(userId, sessionId);
    res.json({ success: true, data: { deleted: true } });
  }),
};
