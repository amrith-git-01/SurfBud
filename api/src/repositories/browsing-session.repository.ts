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
  /**
   * Most recent sessions (newest `endedAt` first), capped for filtering (e.g. drop localhost, then slice).
   */
  async findRecentCandidates(
    userId: string,
    maxScan: number,
  ): Promise<IBrowsingSession[]> {
    return BrowsingSession.find({ userId: new Types.ObjectId(userId) })
      .sort({ endedAt: -1 })
      .limit(maxScan)
      .lean()
      .exec() as Promise<IBrowsingSession[]>;
  },

  async findPaginated(
    userId: string,
    match: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ): Promise<{ sessions: IBrowsingSession[]; total: number }> {
    const uid = new Types.ObjectId(userId);
    const q = { ...match, userId: uid } as Record<string, unknown>;
    const [sessions, total] = await Promise.all([
      BrowsingSession.find(q)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<IBrowsingSession[]>,
      BrowsingSession.countDocuments(q).exec(),
    ]);
    return { sessions, total };
  },
  async findForLocalDate(
    userId: string,
    timezone: string,
    dateStr: string,
  ): Promise<IBrowsingSession[]> {
    return BrowsingSession.find({
      userId: new Types.ObjectId(userId),
      $expr: {
        $eq: [
          {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startedAt",
              timezone,
            },
          },
          dateStr,
        ],
      },
    })
      .sort({ startedAt: 1 })
      .lean()
      .exec() as Promise<IBrowsingSession[]>;
  },

  async countForLocalDate(
    userId: string,
    timezone: string,
    dateStr: string,
  ): Promise<number> {
    return BrowsingSession.countDocuments({
      userId: new Types.ObjectId(userId),
      $expr: {
        $eq: [
          {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startedAt",
              timezone,
            },
          },
          dateStr,
        ],
      },
    }).exec();
  },

  async distinctDomainsInLocalDateRange(
    userId: string,
    timezone: string,
    fromDateStr: string,
    toDateStr: string,
  ): Promise<string[]> {
    const rows = await BrowsingSession.distinct("domain", {
      userId: new Types.ObjectId(userId),
      $expr: {
        $and: [
          {
            $gte: [
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$startedAt",
                  timezone,
                },
              },
              fromDateStr,
            ],
          },
          {
            $lte: [
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$startedAt",
                  timezone,
                },
              },
              toDateStr,
            ],
          },
        ],
      },
    });
    return rows as string[];
  },
};
