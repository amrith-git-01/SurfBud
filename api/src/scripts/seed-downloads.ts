import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db";
import { UserModel } from "../models/user.model";
import { File } from "../models/file.model";
import { DownloadEvent } from "../models/download-event.model";
import { UserDownloadMetrics } from "../models/download-metrics.model";
import { CategoryStats } from "../models/category-stats.model";
import { DomainStatsModel } from "../models/domain-stats.model";
import {
  toDateString,
  getMondayString,
  getMonthStartString,
  startOfDateInTimezone,
} from "../utils/date.utils";

type DownloadStatus = "new" | "duplicate";
type FileCategory =
  | "document"
  | "image"
  | "text"
  | "code"
  | "executable"
  | "archive"
  | "audio"
  | "video"
  | "other";

interface FileDocSeed {
  filename: string;
  category: FileCategory;
  extension: string;
  mimeType: string;
  size: number;
  sourceDomain: string;
  createdAt: Date;
}

interface EventDocSeed {
  userId: Types.ObjectId;
  fileId: Types.ObjectId;
  filename: string;
  sourceDomain: string;
  status: DownloadStatus;
  duration: number;
  isRemoved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FALLBACK_USER_ID = "69ace65423fcd0ee9f6824cf";
const SEED_START_UTC = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
const TARGET_FILE_COUNT = 320;

const DOMAIN_POOL = [
  "www.examplefile.com",
  "docs.acme.com",
  "cdn.designhub.io",
  "notes.workspace.app",
  "repo.surfbud.dev",
  "downloads.vendor.com",
  "drive.storage.io",
  "media.podcast.fm",
  "video.showcase.tv",
  "files.misc.net",
  "photos.companycdn.com",
  "slides.workspace.app",
  "assets.marketing.io",
  "export.analytics.ai",
  "learn.portal.edu",
  "api.partner.net",
  "storage.cloudbox.app",
  "reports.ops.team",
  "music.lib.zone",
  "images.snapcdn.net",
  "video.learninghub.io",
  "archive.oldfiles.org",
  "data.research.lab",
  "public.datasets.dev",
  "mobile.builds.io",
  "logs.observability.ai",
  "secure-downloads.net",
  "intranet.company.local",
  "backup.nightly.system",
  "cdn.surfbud.app",
  "resources.collab.space",
  "samples.testfiles.dev",
  "qa-artifacts.ci",
  "engineering.kb.io",
  "downloads.opensource.org",
  "media-stream.edge",
  "release-notes.platform",
  "tickets.attachment.site",
] as const;

const CATEGORY_CONFIG: Record<
  FileCategory,
  {
    names: string[];
    options: Array<{ ext: string; mime: string }>;
    minSize: number;
    maxSize: number;
  }
> = {
  document: {
    names: ["report", "invoice", "roadmap", "deck", "spec", "summary"],
    options: [
      { ext: "pdf", mime: "application/pdf" },
      {
        ext: "pptx",
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      },
      {
        ext: "xlsx",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      { ext: "csv", mime: "text/csv" },
      { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ],
    minSize: 80_000,
    maxSize: 38_000_000,
  },
  image: {
    names: ["hero", "banner", "photo", "thumbnail", "mockup", "screenshot"],
    options: [
      { ext: "png", mime: "image/png" },
      { ext: "jpg", mime: "image/jpeg" },
      { ext: "webp", mime: "image/webp" },
      { ext: "svg", mime: "image/svg+xml" },
    ],
    minSize: 40_000,
    maxSize: 12_000_000,
  },
  text: {
    names: ["notes", "changelog", "readme", "todo", "transcript", "logbook"],
    options: [
      { ext: "txt", mime: "text/plain" },
      { ext: "md", mime: "text/markdown" },
      { ext: "log", mime: "text/plain" },
      { ext: "json", mime: "application/json" },
    ],
    minSize: 1_500,
    maxSize: 3_000_000,
  },
  code: {
    names: ["worker", "service", "controller", "pipeline", "adapter", "module"],
    options: [
      { ext: "ts", mime: "text/typescript" },
      { ext: "js", mime: "text/javascript" },
      { ext: "py", mime: "text/x-python" },
      { ext: "go", mime: "text/plain" },
      { ext: "rs", mime: "text/plain" },
    ],
    minSize: 4_000,
    maxSize: 9_500_000,
  },
  executable: {
    names: ["installer", "setup", "agent", "updater", "runner", "client"],
    options: [
      { ext: "exe", mime: "application/vnd.microsoft.portable-executable" },
      { ext: "msi", mime: "application/x-msi" },
      { ext: "dmg", mime: "application/x-apple-diskimage" },
      { ext: "apk", mime: "application/vnd.android.package-archive" },
    ],
    minSize: 4_000_000,
    maxSize: 140_000_000,
  },
  archive: {
    names: ["backup", "bundle", "archive", "snapshot", "export", "artifact"],
    options: [
      { ext: "zip", mime: "application/zip" },
      { ext: "7z", mime: "application/x-7z-compressed" },
      { ext: "tar", mime: "application/x-tar" },
      { ext: "gz", mime: "application/gzip" },
    ],
    minSize: 1_000_000,
    maxSize: 300_000_000,
  },
  audio: {
    names: ["episode", "track", "voice-note", "recording", "meeting-audio", "ambient"],
    options: [
      { ext: "mp3", mime: "audio/mpeg" },
      { ext: "wav", mime: "audio/wav" },
      { ext: "m4a", mime: "audio/mp4" },
      { ext: "ogg", mime: "audio/ogg" },
    ],
    minSize: 250_000,
    maxSize: 35_000_000,
  },
  video: {
    names: ["walkthrough", "demo", "session", "recording", "tutorial", "trailer"],
    options: [
      { ext: "mp4", mime: "video/mp4" },
      { ext: "mov", mime: "video/quicktime" },
      { ext: "mkv", mime: "video/x-matroska" },
      { ext: "webm", mime: "video/webm" },
    ],
    minSize: 3_000_000,
    maxSize: 650_000_000,
  },
  other: {
    names: ["blob", "payload", "package", "binary", "dataset", "object"],
    options: [
      { ext: "bin", mime: "application/octet-stream" },
      { ext: "dat", mime: "application/octet-stream" },
      { ext: "tmp", mime: "application/octet-stream" },
      { ext: "raw", mime: "application/octet-stream" },
    ],
    minSize: 20_000,
    maxSize: 45_000_000,
  },
};

const CATEGORY_WEIGHT_BAG: FileCategory[] = [
  "document",
  "document",
  "document",
  "image",
  "image",
  "text",
  "code",
  "executable",
  "archive",
  "archive",
  "audio",
  "video",
  "video",
  "other",
];

function parseArgs(): { userId: string; reset: boolean } {
  const args = process.argv.slice(2);
  const userIdArg = args.find((arg) => !arg.startsWith("--"));
  const userId = userIdArg ?? FALLBACK_USER_ID;
  const reset = !args.includes("--no-reset");
  return { userId, reset };
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

function randomDateBetween(start: Date, end: Date, rng: () => number): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const delta = endMs - startMs;
  const offset = Math.floor(rng() * Math.max(1, delta));
  return new Date(startMs + offset);
}

function generateDuplicateCount(rng: () => number): number {
  const bucket = rng();
  if (bucket < 0.12) return 0;
  if (bucket < 0.36) return randInt(1, 2, rng);
  if (bucket < 0.68) return randInt(3, 6, rng);
  if (bucket < 0.88) return randInt(7, 12, rng);
  return randInt(13, 30, rng);
}

function generateDuration(category: FileCategory, rng: () => number): number {
  switch (category) {
    case "text":
      return randInt(90, 450, rng);
    case "code":
      return randInt(120, 700, rng);
    case "image":
      return randInt(150, 900, rng);
    case "document":
      return randInt(250, 1400, rng);
    case "audio":
      return randInt(400, 2200, rng);
    case "video":
      return randInt(900, 6500, rng);
    case "archive":
      return randInt(1200, 8500, rng);
    case "executable":
      return randInt(1400, 9000, rng);
    default:
      return randInt(200, 2400, rng);
  }
}

function countWithinRange(
  dates: Date[],
  startInclusive: Date,
  endExclusive: Date,
): number {
  const start = startInclusive.getTime();
  const end = endExclusive.getTime();
  return dates.filter((d) => {
    const ts = d.getTime();
    return ts >= start && ts < end;
  }).length;
}

function generateFileSeeds(now: Date, rng: () => number): FileDocSeed[] {
  const seeds: FileDocSeed[] = [];

  // Fixed anchor file used in previous UI checks.
  seeds.push({
    filename: "26mb.csv",
    category: "document",
    extension: "csv",
    mimeType: "text/csv",
    size: 26_100_000,
    sourceDomain: "www.examplefile.com",
    createdAt: randomDateBetween(SEED_START_UTC, now, rng),
  });

  // Guarantee at least one file per category.
  const allCategories = Object.keys(CATEGORY_CONFIG) as FileCategory[];
  for (const category of allCategories) {
    const cfg = CATEGORY_CONFIG[category];
    const opt = pickOne(cfg.options, rng);
    const base = pickOne(cfg.names, rng);
    const suffix = randInt(10, 99, rng);
    seeds.push({
      filename: `${base}-${suffix}.${opt.ext}`,
      category,
      extension: opt.ext,
      mimeType: opt.mime,
      size: randInt(cfg.minSize, cfg.maxSize, rng),
      sourceDomain: pickOne(DOMAIN_POOL, rng),
      createdAt: randomDateBetween(SEED_START_UTC, now, rng),
    });
  }

  while (seeds.length < TARGET_FILE_COUNT) {
    const category = pickOne(CATEGORY_WEIGHT_BAG, rng);
    const cfg = CATEGORY_CONFIG[category];
    const opt = pickOne(cfg.options, rng);
    const base = pickOne(cfg.names, rng);
    const noun = pickOne(
      ["pack", "bundle", "set", "export", "draft", "final", "rev", "snapshot"],
      rng,
    );
    const n = randInt(100, 99999, rng);

    seeds.push({
      filename: `${base}-${noun}-${n}.${opt.ext}`,
      category,
      extension: opt.ext,
      mimeType: opt.mime,
      size: randInt(cfg.minSize, cfg.maxSize, rng),
      sourceDomain: pickOne(DOMAIN_POOL, rng),
      createdAt: randomDateBetween(SEED_START_UTC, now, rng),
    });
  }

  return seeds;
}

async function main(): Promise<void> {
  const { userId, reset } = parseArgs();

  if (!Types.ObjectId.isValid(userId)) {
    throw new Error(`Invalid userId: ${userId}`);
  }

  await connectDB();

  const user = await UserModel.findById(userId).lean().exec();
  if (!user) {
    throw new Error(`User not found for id ${userId}`);
  }

  const timezone = user.timezone ?? "UTC";
  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();
  const rng = createRng(hashString(`${userId}-surfbud-seed-v2`));

  if (reset) {
    await Promise.all([
      DownloadEvent.deleteMany({ userId: userObjectId }).exec(),
      File.deleteMany({ userId: userObjectId }).exec(),
      UserDownloadMetrics.deleteMany({ userId: userObjectId }).exec(),
      CategoryStats.deleteMany({ userId: userObjectId }).exec(),
      DomainStatsModel.deleteMany({ userId: userObjectId }).exec(),
    ]);
  }

  const fileSeeds = generateFileSeeds(now, rng);

  const fileDocs = fileSeeds.map((seed, index) => ({
    userId: userObjectId,
    hash: `seed-hash-v2-${index}-${seed.filename.toLowerCase()}`,
    filename: seed.filename,
    url: `https://${seed.sourceDomain}/downloads/${encodeURIComponent(seed.filename)}`,
    size: seed.size,
    fileExtension: seed.extension,
    fileCategory: seed.category,
    mimeType: seed.mimeType,
    sourceDomain: seed.sourceDomain,
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
  }));

  const insertedFiles = await File.insertMany(fileDocs, { ordered: true });

  const eventDocs: EventDocSeed[] = [];
  for (const file of insertedFiles) {
    const fileCreatedAt = file.createdAt;
    const category = (file.fileCategory ?? "other") as FileCategory;

    // First event is always new, giving timeline and detail coverage.
    const firstEventDate = new Date(fileCreatedAt.getTime() + randInt(1, 60, rng) * 60_000);
    eventDocs.push({
      userId: userObjectId,
      fileId: file._id,
      filename: file.filename,
      sourceDomain: file.sourceDomain ?? "unknown",
      status: "new",
      duration: generateDuration(category, rng),
      isRemoved: false,
      createdAt: firstEventDate,
      updatedAt: firstEventDate,
    });

    const duplicateCount = generateDuplicateCount(rng);
    let anchor = firstEventDate;

    for (let i = 0; i < duplicateCount; i += 1) {
      const shouldCluster = rng() < 0.38;
      const shouldBeRecent = rng() < 0.33;

      let dupDate: Date;
      if (shouldCluster) {
        dupDate = new Date(anchor.getTime() + randInt(15, 420, rng) * 60_000);
      } else if (shouldBeRecent) {
        const recentStart = new Date(Math.max(fileCreatedAt.getTime(), now.getTime() - 14 * 24 * 60 * 60 * 1000));
        dupDate = randomDateBetween(recentStart, now, rng);
      } else {
        dupDate = randomDateBetween(fileCreatedAt, now, rng);
      }

      if (dupDate.getTime() > now.getTime()) {
        dupDate = new Date(now.getTime() - randInt(5, 180, rng) * 60_000);
      }

      anchor = dupDate;

      eventDocs.push({
        userId: userObjectId,
        fileId: file._id,
        filename: file.filename,
        sourceDomain: file.sourceDomain ?? "unknown",
        status: "duplicate",
        duration: generateDuration(category, rng),
        isRemoved: false,
        createdAt: dupDate,
        updatedAt: dupDate,
      });
    }
  }

  // Force a few deterministic events in current period to make today/week/month cards meaningful.
  const featuredFiles = insertedFiles.slice(0, 8);
  for (let i = 0; i < featuredFiles.length; i += 1) {
    const file = featuredFiles[i]!;
    const category = (file.fileCategory ?? "other") as FileCategory;
    const date = new Date(now);
    date.setHours(9 + (i % 8), 5 + i * 3, 0, 0);

    eventDocs.push({
      userId: userObjectId,
      fileId: file._id,
      filename: file.filename,
      sourceDomain: file.sourceDomain ?? "unknown",
      status: i % 2 === 0 ? "new" : "duplicate",
      duration: generateDuration(category, rng),
      isRemoved: false,
      createdAt: date,
      updatedAt: date,
    });
  }

  eventDocs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const insertedEvents = await DownloadEvent.insertMany(eventDocs, {
    ordered: true,
  });

  const fileMap = new Map(
    insertedFiles.map((file) => [String(file._id), file]),
  );

  const allEventDates = insertedEvents.map((e) => e.createdAt);

  const todayDate = toDateString(now, timezone);
  const weekStart = getMondayString(now, timezone);
  const monthStart = getMonthStartString(now, timezone);

  const todayStart = startOfDateInTimezone(todayDate, timezone);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const weekStartDate = startOfDateInTimezone(weekStart, timezone);
  const prevWeekStartDate = new Date(
    weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  );

  const monthStartDate = startOfDateInTimezone(monthStart, timezone);
  const prevMonthDateRef = new Date(`${monthStart}T12:00:00Z`);
  prevMonthDateRef.setUTCMonth(prevMonthDateRef.getUTCMonth() - 1);
  const prevMonthStart = getMonthStartString(prevMonthDateRef, timezone);
  const prevMonthStartDate = startOfDateInTimezone(prevMonthStart, timezone);

  const todayCount = countWithinRange(allEventDates, todayStart, tomorrowStart);
  const prevTodayCount = countWithinRange(
    allEventDates,
    yesterdayStart,
    todayStart,
  );
  const weekCount = countWithinRange(allEventDates, weekStartDate, tomorrowStart);
  const prevWeekCount = countWithinRange(
    allEventDates,
    prevWeekStartDate,
    weekStartDate,
  );
  const monthCount = countWithinRange(allEventDates, monthStartDate, tomorrowStart);
  const prevMonthCount = countWithinRange(
    allEventDates,
    prevMonthStartDate,
    monthStartDate,
  );

  let totalNew = 0;
  let totalDuplicates = 0;
  let totalSize = 0;
  let newSize = 0;
  let duplicateSize = 0;

  const categoryRollup = new Map<
    string,
    {
      totalCount: number;
      newCount: number;
      dupCount: number;
      totalSize: number;
      newSize: number;
      dupSize: number;
    }
  >();

  const domainRollup = new Map<
    string,
    {
      totalCount: number;
      newCount: number;
      dupCount: number;
      totalSize: number;
      newSize: number;
      dupSize: number;
    }
  >();

  for (const event of insertedEvents) {
    const file = fileMap.get(String(event.fileId));
    const size = file?.size ?? 0;
    const category = file?.fileCategory ?? "other";
    const domain = event.sourceDomain ?? "unknown";

    totalSize += size;
    if (event.status === "new") {
      totalNew += 1;
      newSize += size;
    } else {
      totalDuplicates += 1;
      duplicateSize += size;
    }

    const categoryEntry = categoryRollup.get(category) ?? {
      totalCount: 0,
      newCount: 0,
      dupCount: 0,
      totalSize: 0,
      newSize: 0,
      dupSize: 0,
    };
    categoryEntry.totalCount += 1;
    categoryEntry.totalSize += size;
    if (event.status === "new") {
      categoryEntry.newCount += 1;
      categoryEntry.newSize += size;
    } else {
      categoryEntry.dupCount += 1;
      categoryEntry.dupSize += size;
    }
    categoryRollup.set(category, categoryEntry);

    const domainEntry = domainRollup.get(domain) ?? {
      totalCount: 0,
      newCount: 0,
      dupCount: 0,
      totalSize: 0,
      newSize: 0,
      dupSize: 0,
    };
    domainEntry.totalCount += 1;
    domainEntry.totalSize += size;
    if (event.status === "new") {
      domainEntry.newCount += 1;
      domainEntry.newSize += size;
    } else {
      domainEntry.dupCount += 1;
      domainEntry.dupSize += size;
    }
    domainRollup.set(domain, domainEntry);
  }

  await UserDownloadMetrics.create({
    userId: userObjectId,
    todayCount,
    todayDate,
    prevTodayCount,
    weekCount,
    weekStart,
    prevWeekCount,
    monthCount,
    monthStart,
    prevMonthCount,
    totalNew,
    totalDuplicates,
    totalSize,
    newSize,
    duplicateSize,
    updatedAt: now,
  });

  const categoryDocs = Array.from(categoryRollup.entries()).map(([category, v]) => ({
    userId: userObjectId,
    category,
    ...v,
    createdAt: now,
    updatedAt: now,
  }));

  const domainDocs = Array.from(domainRollup.entries()).map(([domain, v]) => ({
    userId: userObjectId,
    domain,
    ...v,
    createdAt: now,
    updatedAt: now,
  }));

  if (categoryDocs.length > 0) {
    await CategoryStats.insertMany(categoryDocs, { ordered: false });
  }
  if (domainDocs.length > 0) {
    await DomainStatsModel.insertMany(domainDocs, { ordered: false });
  }

  const duplicateEvents = insertedEvents.filter(
    (e) => e.status === "duplicate",
  ).length;
  const firstEvent = insertedEvents[0]?.createdAt;
  const lastEvent = insertedEvents[insertedEvents.length - 1]?.createdAt;

  console.log("Seed completed successfully.");
  console.log(`User ID: ${userId}`);
  console.log(`Timezone: ${timezone}`);
  console.log(`Files created: ${insertedFiles.length}`);
  console.log(`Events created: ${insertedEvents.length}`);
  console.log(`New events: ${insertedEvents.length - duplicateEvents}`);
  console.log(`Duplicate events: ${duplicateEvents}`);
  console.log(`Categories covered: ${categoryDocs.length}`);
  console.log(`Domains covered: ${domainDocs.length}`);
  console.log(
    `Event date range: ${firstEvent?.toISOString() ?? "-"} -> ${lastEvent?.toISOString() ?? "-"}`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Seed failed:", message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
