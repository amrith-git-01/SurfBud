import type { Response } from "express";
import { logger } from "../utils/logger";
import type {
  DownloadNewPayload,
  DownloadUpdatedPayload,
  DownloadDeletedPayload,
  MetricsDeltaPayload,
  RemoveFilePayload,
  TabGroupsUpdatedPayload,
  BrowsingSessionsSyncedPayload,
} from "../types/shared/websocket.types";

interface SseClient {
  userId: string;
  res: Response;
  isExtension: boolean;
}

const HEARTBEAT_MS = 25_000;

class SseManager {
  private clients = new Set<SseClient>();
  private heartbeats = new Map<SseClient, ReturnType<typeof setInterval>>();

  add(client: SseClient): () => void {
    this.clients.add(client);

    const timer = setInterval(() => {
      try {
        client.res.write(": heartbeat\n\n");
      } catch {
        this.remove(client);
      }
    }, HEARTBEAT_MS);

    this.heartbeats.set(client, timer);
    logger.info(
      { userId: client.userId, isExtension: client.isExtension },
      "SSE client connected",
    );

    return () => this.remove(client);
  }

  private remove(client: SseClient): void {
    const timer = this.heartbeats.get(client);
    if (timer) {
      clearInterval(timer);
      this.heartbeats.delete(client);
    }
    this.clients.delete(client);
    logger.info({ userId: client.userId }, "SSE client disconnected");
  }

  private send(res: Response, event: string, data: unknown): void {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // client disconnected mid-write; cleaned up on request close
    }
  }

  private broadcastToUser(
    userId: string,
    event: string,
    data: unknown,
    extensionOnly = false,
  ): void {
    for (const client of this.clients) {
      if (client.userId !== userId) continue;
      if (extensionOnly && !client.isExtension) continue;
      this.send(client.res, event, data);
    }
  }

  emitDownloadNew(userId: string, data: DownloadNewPayload): void {
    this.broadcastToUser(userId, "dashboard:download:new", data);
  }

  emitDownloadUpdated(userId: string, data: DownloadUpdatedPayload): void {
    this.broadcastToUser(userId, "dashboard:download:updated", data);
  }

  emitDownloadDeleted(userId: string, data: DownloadDeletedPayload): void {
    this.broadcastToUser(userId, "dashboard:download:deleted", data);
  }

  emitMetricsDelta(userId: string, data: MetricsDeltaPayload): void {
    this.broadcastToUser(userId, "dashboard:metrics:delta", data);
  }

  emitRemoveFile(userId: string, data: RemoveFilePayload): void {
    this.broadcastToUser(userId, "remove:file", data, true);
  }

  emitTabGroupsUpdated(userId: string, data: TabGroupsUpdatedPayload): void {
    this.broadcastToUser(userId, "productivity:tab-groups:updated", data);
  }

  emitBrowsingSynced(userId: string, data: BrowsingSessionsSyncedPayload): void {
    this.broadcastToUser(userId, "dashboard:browsing:synced", data);
  }
}

export const sseManager = new SseManager();
