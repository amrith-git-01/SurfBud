import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserRepository } from "../repositories/user.repository";
import { asyncHandler } from "../utils/asyncHandler";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";
import { DownloadSettingsService } from "../services/download-settings.service";

export const AuthController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, displayName, timezone } = req.body as {
      email: string;
      password: string;
      displayName: string;
      timezone?: string;
    };

    const result = await AuthService.register(
      email,
      password,
      displayName,
      timezone,
    );

    if (timezone) {
      UserRepository.updateTimezone(result.userId, timezone).catch((err) =>
        logger.warn({ userId: result.userId, err }, "timezone update failed"),
      );

      redis
        .get("active:timezones")
        .then((raw) => {
          const cached: string[] = JSON.parse(raw ?? "[]");
          if (!cached.includes(timezone)) {
            cached.push(timezone);
            return redis.set("active:timezones", JSON.stringify(cached));
          }
          return undefined;
        })
        .catch(() => { });
    }

    const settings = await DownloadSettingsService.getSettings(result.userId);

    res.status(201).json({
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        userId: result.userId,
        displayName,
        settings,
      },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, timezone } = req.body as {
      email: string;
      password: string;
      timezone?: string;
    };

    const result = await AuthService.login(email, password, timezone);

    if (timezone) {
      UserRepository.updateTimezone(result.userId, timezone).catch((err) =>
        logger.warn(
          { userId: result.userId, err },
          "timezone update failed",
        ),
      );

      redis
        .get("active:timezones")
        .then((raw) => {
          const cached: string[] = JSON.parse(raw ?? "[]");
          if (!cached.includes(timezone)) {
            cached.push(timezone);
            return redis.set("active:timezones", JSON.stringify(cached));
          }
          return undefined;
        })
        .catch(() => { });
    }

    const settings = await DownloadSettingsService.getSettings(result.userId);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        userId: result.userId,
        displayName: result.displayName,
        settings,
      },
    });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: null });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { userId: req.user?.id, email: req.user?.email },
    });
  }),
};