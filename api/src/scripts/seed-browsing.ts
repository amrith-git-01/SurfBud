import crypto from "node:crypto";
import mongoose from "mongoose";
import { Types } from "mongoose";
import { connectDB } from "../config/db";
import { UserModel } from "../models/user.model";
import { BrowsingCategory } from "../models/browsing-category.model";
import { BrowsingSession } from "../models/browsing-session.model";
import { BrowsingDomainStats } from "../models/browsing-domain-stats.model";
import { BrowsingDailyStats } from "../models/browsing-daily-stats.model";
import { BrowsingCategoryStats } from "../models/browsing-category-stats.model";
import { UserBrowsingMetrics } from "../models/user-browsing-metrics.model";
import { DomainClassification } from "../models/domain-classification.model";
import { BrowsingMetricsService } from "../services/browsing-metrics.service";
import { startOfDateInTimezone, toDateString } from "../utils/date.utils";
import type { ExtensionSession } from "../types/shared/browsing.types";

const DEFAULT_USER_ID = "69bd655d20a69c46f855417d";
const DEFAULT_TIMEZONE = "Asia/Calcutta";
const DEFAULT_DAYS = 30;
const MIN_SESSIONS_PER_DAY = 5;
const MAX_SESSIONS_PER_DAY = 13;
const MIN_DURATION_SECONDS = 20;
const MAX_DURATION_SECONDS = 35 * 60;
const MAX_START_MINUTE = 23 * 60 + 30;

interface SeedArgs {
  userId: string;
  timezone: string;
  days: number;
  reset: boolean;
}

interface DomainSeed {
  domain: string;
  label: string;
  description: string;
  categorySlug: string;
  domainColor: string | null;
  domainLogo: string | null;
}

const DOMAIN_SEEDS: DomainSeed[] = [
  {
    domain: "claude.ai",
    label: "Claude AI",
    description: "Conversational AI assistant",
    categorySlug: "ai-tools",
    domainColor: "#D97757",
    domainLogo: "https://www.google.com/s2/favicons?domain=claude.ai&sz=128",
  },
  {
    domain: "developers.brandfetch.com",
    label: "Brandfetch Developers",
    description: "Brandfetch API docs and developer portal",
    categorySlug: "reference",
    domainColor: "#3B82F6",
    domainLogo:
      "https://www.google.com/s2/favicons?domain=developers.brandfetch.com&sz=128",
  },
  {
    domain: "brandfetch.com",
    label: "Brandfetch",
    description: "Brand assets and company profiles",
    categorySlug: "ai-tools",
    domainColor: "#2563EB",
    domainLogo: "https://www.google.com/s2/favicons?domain=brandfetch.com&sz=128",
  },
  {
    domain: "github.com",
    label: "GitHub",
    description: "Code hosting and collaboration",
    categorySlug: "development",
    domainColor: "#111827",
    domainLogo: "https://www.google.com/s2/favicons?domain=github.com&sz=128",
  },
  {
    domain: "stackoverflow.com",
    label: "Stack Overflow",
    description: "Developer Q&A",
    categorySlug: "development",
    domainColor: "#F97316",
    domainLogo:
      "https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=128",
  },
  {
    domain: "notion.so",
    label: "Notion",
    description: "Notes and docs",
    categorySlug: "productivity",
    domainColor: "#171717",
    domainLogo: "https://www.google.com/s2/favicons?domain=notion.so&sz=128",
  },
  {
    domain: "youtube.com",
    label: "YouTube",
    description: "Video content platform",
    categorySlug: "video",
    domainColor: "#DC2626",
    domainLogo: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
  },
  {
    domain: "x.com",
    label: "X",
    description: "Social network",
    categorySlug: "social-media",
    domainColor: "#111827",
    domainLogo: "https://www.google.com/s2/favicons?domain=x.com&sz=128",
  },
  {
    domain: "news.ycombinator.com",
    label: "Hacker News",
    description: "Tech news community",
    categorySlug: "news",
    domainColor: "#F59E0B",
    domainLogo:
      "https://www.google.com/s2/favicons?domain=news.ycombinator.com&sz=128",
  },
  {
    domain: "localhost",
    label: "Localhost",
    description: "Local development host",
    categorySlug: "development",
    domainColor: "#6B7280",
    domainLogo: null,
  },
];

function parseArgs(): SeedArgs {
  const args = process.argv.slice(2);
  const userIdArg = args.find((arg) => !arg.startsWith("--"));
  const userId = userIdArg ?? DEFAULT_USER_ID;

  const timezoneArg =
    args.find((arg) => arg.startsWith("--timezone="))?.split("=")[1] ??
    DEFAULT_TIMEZONE;
  const daysArgRaw = args
    .find((arg) => arg.startsWith("--days="))
    ?.split("=")[1];
  const parsedDays = daysArgRaw ? Number(daysArgRaw) : DEFAULT_DAYS;
  const days = Number.isFinite(parsedDays)
    ? Math.max(1, Math.min(90, Math.floor(parsedDays)))
    : DEFAULT_DAYS;
  const reset = !args.includes("--no-reset");

  return { userId, timezone: timezoneArg, days, reset };
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickOne<T>(arr: readonly T[], rng: () => number): T {
  const index = randInt(0, arr.length - 1, rng);
  return arr[index]!;
}

function dateStringShift(dateStr: string, deltaDays: number): string {
  const [year, month, day] = dateStr.split("-").map((v) => Number(v));
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildSeedSessions(days: number, timezone: string, rng: () => number) {
  const now = new Date();
  const today = toDateString(now, timezone);
  const sessions: ExtensionSession[] = [];

  for (let delta = days - 1; delta >= 0; delta -= 1) {
    const dayStr = dateStringShift(today, -delta);
    const dayStart = startOfDateInTimezone(dayStr, timezone);
    const count = randInt(MIN_SESSIONS_PER_DAY, MAX_SESSIONS_PER_DAY, rng);

    let cursorMinute = randInt(5, 50, rng);
    for (let i = 0; i < count; i += 1) {
      const domain = pickOne(DOMAIN_SEEDS, rng).domain;
      const startMinute = Math.min(
        cursorMinute + randInt(4, 120, rng),
        MAX_START_MINUTE,
      );
      cursorMinute = startMinute;

      const durationSeconds = randInt(MIN_DURATION_SECONDS, MAX_DURATION_SECONDS, rng);
      const startedAt = new Date(dayStart.getTime() + startMinute * 60 * 1000);
      const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      const session: ExtensionSession = {
        sessionId: crypto.randomUUID(),
        domain,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds,
        interactions: {
          keypresses: randInt(0, 90, rng),
          clicks: randInt(0, 80, rng),
          scrollEvents: randInt(0, 220, rng),
        },
      };
      sessions.push(session);
    }
  }

  sessions.sort(
    (a, b) =>
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  return sessions;
}

async function ensureCategoriesSeeded(): Promise<void> {
  const count = await BrowsingCategory.countDocuments().exec();
  if (count > 0) return;
  throw new Error(
    "BrowsingCategory collection is empty. Run `npm run seed:browsing-categories` first.",
  );
}

async function seedDomainClassifications(now: Date): Promise<void> {
  for (const domainSeed of DOMAIN_SEEDS) {
    await DomainClassification.updateOne(
      { domain: domainSeed.domain },
      {
        $set: {
          label: domainSeed.label,
          description: domainSeed.description,
          categorySlug: domainSeed.categorySlug,
          confidence: "ai",
          domainColor: domainSeed.domainColor,
          domainLogo: domainSeed.domainLogo,
          classifiedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          domain: domainSeed.domain,
          verifiedCount: 1,
          createdAt: now,
        },
      },
      { upsert: true },
    ).exec();
  }
}

async function clearUserBrowsingData(userObjectId: Types.ObjectId): Promise<void> {
  await Promise.all([
    BrowsingSession.deleteMany({ userId: userObjectId }).exec(),
    BrowsingDomainStats.deleteMany({ userId: userObjectId }).exec(),
    BrowsingDailyStats.deleteMany({ userId: userObjectId }).exec(),
    BrowsingCategoryStats.deleteMany({ userId: userObjectId }).exec(),
    UserBrowsingMetrics.deleteMany({ userId: userObjectId }).exec(),
  ]);
}

async function main(): Promise<void> {
  const { userId, timezone, days, reset } = parseArgs();
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error(`Invalid userId: ${userId}`);
  }

  await connectDB();
  await ensureCategoriesSeeded();

  const user = await UserModel.findById(userId).lean().exec();
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const userObjectId = new Types.ObjectId(userId);
  if (reset) {
    await clearUserBrowsingData(userObjectId);
  }

  const now = new Date();
  await seedDomainClassifications(now);

  const rng = createRng(hashString(`${userId}-browsing-seed-v1-${timezone}`));
  const sessions = buildSeedSessions(days, timezone, rng);

  const docs = sessions.map((s) => ({
    userId: userObjectId,
    sessionId: s.sessionId,
    domain: s.domain.trim().toLowerCase(),
    startedAt: new Date(s.startedAt),
    endedAt: new Date(s.endedAt),
    durationSeconds: s.durationSeconds,
    interactions: s.interactions,
    createdAt: now,
    updatedAt: now,
  }));
  await BrowsingSession.insertMany(docs, { ordered: false });

  const snapshots = await BrowsingMetricsService.buildSnapshotsFromExtensionSessions(
    sessions,
  );
  await BrowsingMetricsService.processIngestJob(userId, snapshots);

  const uniqueDomains = new Set(sessions.map((s) => s.domain)).size;
  const first = sessions[0]?.startedAt ?? "-";
  const last = sessions[sessions.length - 1]?.endedAt ?? "-";

  console.log("Browsing seed completed successfully.");
  console.log(`User ID: ${userId}`);
  console.log(`User timezone (profile): ${user.timezone ?? "UTC"}`);
  console.log(`Generation timezone (seed): ${timezone}`);
  console.log(`Days seeded: ${days}`);
  console.log(`Sessions created: ${sessions.length}`);
  console.log(`Unique domains: ${uniqueDomains}`);
  console.log(`Date range: ${first} -> ${last}`);
  console.log("Included localhost sessions: yes");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("seed-browsing failed:", message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
