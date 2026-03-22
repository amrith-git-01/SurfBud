// api/src/index.ts
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { rootRouter } from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { connectDB } from "./config/db";
import { redis } from "./config/redis";
import { startScheduler } from "./jobs/scheduler";
import { logger } from "./utils/logger";
import { socketManager } from "./websocket/socket.manager";

import "./jobs/workers/metrics-rollup.worker";
import "./jobs/workers/removal.worker";
import "./jobs/workers/browsing-metrics.worker";
import "./jobs/workers/domain-classification.worker";

const app = express();
const httpServer = createServer(app);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin === env.DASHBOARD_ORIGIN) return callback(null, true);
      if (origin.startsWith("chrome-extension://"))
        return callback(null, true);
      if (env.EXTENSION_ORIGIN && origin === env.EXTENSION_ORIGIN)
        return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    customLogLevel(_req, res) {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    serializers: {
      req(req) {
        return { method: req.method, url: req.url };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api", rootRouter);
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  await redis.connect();
  await connectDB();
  await startScheduler();

  socketManager.initialize(httpServer);

  httpServer.listen(env.PORT, () =>
    logger.info(`Server running on port ${env.PORT}`),
  );
}

void bootstrap();