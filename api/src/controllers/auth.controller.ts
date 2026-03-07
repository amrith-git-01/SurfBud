import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";

export const AuthController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, displayName } = req.body as {
      email: string;
      password: string;
      displayName: string;
    };
    const result = await AuthService.register(email, password, displayName);
    res.status(201).json({
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        userId: result.userId,
        displayName,
      },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await AuthService.login(email, password);
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        userId: result.userId,
        displayName: result.displayName,
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
