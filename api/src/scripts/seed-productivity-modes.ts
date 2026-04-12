import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db";
import { TabGroupModeModel } from "../models/tab-group-mode.model";
import { logger } from "../utils/logger";

interface PredefinedTabGroupModeSeed {
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  urls: string[];
}

export const PREDEFINED_TAB_GROUP_MODES: PredefinedTabGroupModeSeed[] = [
  {
    name: "Dev Mode",
    color: "#7C3AED",
    icon: "Code",
    sortOrder: 1,
    urls: [
      "https://claude.ai",
      "https://chatgpt.com",
      "https://gemini.google.com",
      "https://github.com",
      "https://stackoverflow.com",
    ],
  },
  {
    name: "Chill Mode",
    color: "#E11D48",
    icon: "Smile",
    sortOrder: 2,
    urls: [
      "https://youtube.com",
      "https://spotify.com",
      "https://reddit.com",
      "https://netflix.com",
    ],
  },
  {
    name: "Study Mode",
    color: "#059669",
    icon: "BookOpen",
    sortOrder: 3,
    urls: [
      "https://wikipedia.org",
      "https://youtube.com",
      "https://udemy.com",
      "https://coursera.org",
    ],
  },
  {
    name: "Meeting Mode",
    color: "#D97706",
    icon: "Video",
    sortOrder: 4,
    urls: [
      "https://teams.microsoft.com",
      "https://meet.google.com",
      "https://calendar.google.com",
      "https://notion.so",
    ],
  },
];

export async function seedProductivityModes(userId: string): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error(`Invalid userId: ${userId}`);
  }

  const userObjectId = new Types.ObjectId(userId);

  const existingPredefined = await TabGroupModeModel.find({
    userId: userObjectId,
  })
    .select({ sortOrder: 1 })
    .lean()
    .exec();

  const existingSortOrders = new Set(
    existingPredefined.map((mode) => mode.sortOrder),
  );

  const docs = PREDEFINED_TAB_GROUP_MODES.filter(
    (seed) => !existingSortOrders.has(seed.sortOrder),
  ).map((seed) => ({
    userId: userObjectId,
    name: seed.name,
    color: seed.color,
    icon: seed.icon,
    sortOrder: seed.sortOrder,
    urls: seed.urls,
    evolvedUrls: [] as string[],
    evolvedAt: null as Date | null,
  }));

  if (docs.length === 0) {
    return;
  }

  await TabGroupModeModel.insertMany(docs, { ordered: false });
}

async function runFromCli(): Promise<void> {
  const userId = process.argv[2];

  if (!userId) {
    throw new Error("Usage: npm run seed:productivity -- <userId>");
  }

  await connectDB();
  await seedProductivityModes(userId);
  logger.info({ userId }, "Productivity modes seeded");
  await mongoose.disconnect();
}

if (require.main === module) {
  void runFromCli()
    .then(() => process.exit(0))
    .catch(async (error: unknown) => {
      logger.error({ error }, "Failed to seed productivity modes");
      await mongoose.disconnect();
      process.exit(1);
    });
}
