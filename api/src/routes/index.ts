import { Router } from "express";
import { authRouter } from "./auth.routes";
import { downloadRouter } from "./download.routes";

export const rootRouter = Router();

rootRouter.use("/auth", authRouter);
rootRouter.use("/downloads", downloadRouter);
