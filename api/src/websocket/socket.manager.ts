// api/src/websocket/socket.manager.ts
import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verify } from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { JwtPayload } from "../types/shared/auth.types";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  DownloadNewPayload,
  DownloadUpdatedPayload,
  DownloadDeletedPayload,
  MetricsDeltaPayload,
  RemoveFilePayload,
} from "../types/shared/websocket.types";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

class SocketManager {
  private io: TypedServer | null = null;

  initialize(httpServer: HttpServer): void {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      {
        cors: {
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (origin === env.DASHBOARD_ORIGIN) return callback(null, true);
            if (origin.startsWith("chrome-extension://"))
              return callback(null, true);
            callback(new Error("Not allowed by CORS"));
          },
          credentials: true,
        },
      },
    );

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) {
        return next(new Error("Authentication token required"));
      }

      try {
        const decoded = verify(token, env.JWT_SECRET) as JwtPayload;
        if (!decoded.sub) {
          return next(new Error("Invalid authentication token payload"));
        }
        (socket as { userId?: string }).userId = decoded.sub;
        next();
      } catch {
        next(new Error("Invalid authentication token"));
      }
    });

    this.io.on("connection", (socket: TypedSocket) => {
      const userId = (socket as { userId?: string }).userId as string;
      logger.info({ userId, socketId: socket.id }, "WebSocket connected");

      const roomName = `user:${userId}`;
      socket.join(roomName);

      socket.emit("dashboard:connection:ack", {
        userId,
        timestamp: new Date().toISOString(),
      });

      socket.on("disconnect", () => {
        logger.info({ userId, socketId: socket.id }, "WebSocket disconnected");
      });
    });

    logger.info("Socket.IO initialized");
  }

  emitDownloadNew(userId: string, data: DownloadNewPayload): void {
    if (!this.io) {
      logger.warn("Socket.IO not initialized, cannot emit event");
      return;
    }
    this.io.to(`user:${userId}`).emit("dashboard:download:new", data);
  }

  emitDownloadUpdated(userId: string, data: DownloadUpdatedPayload): void {
    if (!this.io) {
      logger.warn("Socket.IO not initialized, cannot emit event");
      return;
    }
    this.io.to(`user:${userId}`).emit("dashboard:download:updated", data);
  }

  emitDownloadDeleted(userId: string, data: DownloadDeletedPayload): void {
    if (!this.io) {
      logger.warn("Socket.IO not initialized, cannot emit event");
      return;
    }
    this.io.to(`user:${userId}`).emit("dashboard:download:deleted", data);
  }

  emitMetricsDelta(userId: string, data: MetricsDeltaPayload): void {
    if (!this.io) {
      logger.warn("Socket.IO not initialized, cannot emit event");
      return;
    }
    this.io.to(`user:${userId}`).emit("dashboard:metrics:delta", data);
  }

  emitRemoveFile(userId: string, data: RemoveFilePayload): void {
    if (!this.io) {
      logger.warn("Socket.IO not initialized, cannot emit event");
      return;
    }
    this.io.to(`user:${userId}`).emit("remove:file", data);
  }

  getIO(): TypedServer | null {
    return this.io;
  }
}

export const socketManager = new SocketManager();