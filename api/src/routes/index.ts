import { Router } from "express";
import { authRouter } from "./auth.routes";
import { downloadRouter } from "./download.routes";
import { browsingRouter } from "./browsing.routes";
import { productivityRouter } from "./productivity.routes";
import { sseRouter } from "./sse.routes";
export const rootRouter = Router();

rootRouter.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, status: "live" });
});

rootRouter.use("/auth", authRouter);
rootRouter.use("/downloads", downloadRouter);
rootRouter.use("/browsing", browsingRouter);
rootRouter.use("/productivity", productivityRouter);
rootRouter.use("/sse", sseRouter);
