import { Router, type Request, type Response } from "express";
import { verify } from "jsonwebtoken";
import { env } from "../config/env";
import { sseManager } from "../sse/sse.manager";
import { DownloadEventRepository } from "../repositories/download-event.repository";
import { logger } from "../utils/logger";
import type { JwtPayload } from "../types/shared/auth.types";

export const sseRouter = Router();

sseRouter.get("/", (req: Request, res: Response): void => {
  const queryToken = req.query["token"] as string | undefined;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const token = queryToken ?? headerToken;

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  let userId: string;
  try {
    const decoded = verify(token, env.JWT_SECRET) as JwtPayload;
    if (!decoded.sub) throw new Error("no sub");
    userId = decoded.sub;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const isExtension = req.query["client"] === "extension";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(
    `event: connection:ack\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`,
  );

  const removeClient = sseManager.add({ userId, res, isExtension });

  if (isExtension) {
    void (async () => {
      try {
        const pending =
          await DownloadEventRepository.listPendingExtensionRemovals(userId);
        for (const p of pending) {
          res.write(
            `event: remove:file\ndata: ${JSON.stringify({ type: "remove:file", savedPath: p.savedPath, hash: p.hash })}\n\n`,
          );
        }
      } catch (err) {
        logger.error(
          { userId, err: (err as Error).message },
          "pending removal flush failed",
        );
      }
    })();
  }

  req.on("close", removeClient);
});
