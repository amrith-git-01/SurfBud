import { Types } from "mongoose";
import {
  BrowsingSession,
  type IBrowsingSession,
} from "../models/browsing-session.model";
import type { ExtensionSession } from "../types/shared/browsing.types";

export interface UpsertBrowsingSessionsResult {
  matched: number;
  modified: number;
  upserted: number;
}

export const BrowsingSessionRepository = {
  async upsertMany(
    userId: string,
    sessions: ExtensionSession[],
  ): Promise<UpsertBrowsingSessionsResult> {
    if (sessions.length === 0) {
      return { matched: 0, modified: 0, upserted: 0 };
    }
    const userObjectId = new Types.ObjectId(userId);
    const operations = sessions.map((session) => ({
      updateOne: {
        filter: {
          userId: userObjectId,
          sessionId: session.sessionId,
        },
        update: {
          $set: {
            domain: session.domain.toLowerCase(),
            startedAt: new Date(session.startedAt),
            endedAt: new Date(session.endedAt),
            durationSeconds: session.durationSeconds,
            interactions: {
              keypresses: session.interactions.keypresses,
              clicks: session.interactions.clicks,
              scrollEvents: session.interactions.scrollEvents,
            },
          },
          $setOnInsert: {
            userId: userObjectId,
            sessionId: session.sessionId,
          },
        },
        upsert: true,
      },
    }));

    const result = await BrowsingSession.bulkWrite(operations, {
      ordered: false,
    });
    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    };
  },
  async findRecent(userId: string, limit: number): Promise<IBrowsingSession[]> {
    return BrowsingSession.find({ userId: new Types.ObjectId(userId) })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<IBrowsingSession[]>;
  },
};
