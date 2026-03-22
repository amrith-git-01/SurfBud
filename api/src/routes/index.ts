import { Router } from "express";
import { authRouter } from "./auth.routes";
import { downloadRouter } from "./download.routes";
import { browsingRouter } from "./browsing.routes";

export const rootRouter = Router();

/** Lightweight liveness — no DB; use before Socket.IO so clients wait until HTTP server listens. */
rootRouter.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, status: "live" });
});

rootRouter.use("/auth", authRouter);
rootRouter.use("/downloads", downloadRouter);
rootRouter.use("/browsing", browsingRouter);
