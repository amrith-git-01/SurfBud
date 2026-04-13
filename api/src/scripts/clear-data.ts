import { connectDB } from "../config/db";
import { BrowsingCategoryStats } from "../models/browsing-category-stats.model";
import { BrowsingDailyStats } from "../models/browsing-daily-stats.model";
import { BrowsingDomainStats } from "../models/browsing-domain-stats.model";
import { BrowsingSession } from "../models/browsing-session.model";
import { CategoryStats } from "../models/category-stats.model";
import { DomainClassification } from "../models/domain-classification.model";
import { DomainStatsModel } from "../models/domain-stats.model";
import { DownloadEvent } from "../models/download-event.model";
import { UserDownloadMetrics } from "../models/download-metrics.model";
import { File } from "../models/file.model";
import { FocusSessionModel } from "../models/focus-session.model";
import { StreakDayLogModel } from "../models/streak-day-log.model";
import { TabGroupActivationEventModel } from "../models/tab-group-activation-event.model";
import { TabGroupModeModel } from "../models/tab-group-mode.model";
import { UserBrowsingMetrics } from "../models/user-browsing-metrics.model";
import { UserBrowsingRuleModel } from "../models/user-browsing-rule.model";
import { UserBrowsingSettingsModel } from "../models/user-browsing-settings.model";
import { UserDownloadSettingsModel } from "../models/user-download-settings.model";
import { UserProductivitySettingsModel } from "../models/user-productivity-settings.model";
import { UserRoutingFolderModel } from "../models/user-routing-folder.model";
import { UserStreakModel } from "../models/user-streak.model";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

async function clearData(): Promise<void> {
  await connectDB();

  const collections = [
    { model: BrowsingCategoryStats, name: "BrowsingCategoryStats" },
    { model: BrowsingDailyStats, name: "BrowsingDailyStats" },
    { model: BrowsingDomainStats, name: "BrowsingDomainStats" },
    { model: BrowsingSession, name: "BrowsingSession" },
    { model: CategoryStats, name: "CategoryStats" },
    { model: DomainClassification, name: "DomainClassification" },
    { model: DomainStatsModel, name: "DomainStats" },
    { model: DownloadEvent, name: "DownloadEvent" },
    { model: File, name: "File" },
    { model: FocusSessionModel, name: "FocusSession" },
    { model: StreakDayLogModel, name: "StreakDayLog" },
    { model: TabGroupActivationEventModel, name: "TabGroupActivationEvent" },
    { model: TabGroupModeModel, name: "TabGroupMode" },
    { model: UserBrowsingMetrics, name: "UserBrowsingMetrics" },
    { model: UserBrowsingRuleModel, name: "UserBrowsingRule" },
    { model: UserBrowsingSettingsModel, name: "UserBrowsingSettings" },
    { model: UserDownloadMetrics, name: "UserDownloadMetrics" },
    { model: UserDownloadSettingsModel, name: "UserDownloadSettings" },
    { model: UserProductivitySettingsModel, name: "UserProductivitySettings" },
    { model: UserRoutingFolderModel, name: "UserRoutingFolder" },
    { model: UserStreakModel, name: "UserStreak" },
  ];

  logger.info(
    "Clearing collections (User + BrowsingCategory catalog preserved)...",
  );

  for (const { model, name } of collections) {
    const result = await model.collection.deleteMany({});
    logger.info(`  ${name}: deleted ${result.deletedCount} documents`);
  }

  logger.info(
    "Done. User accounts unchanged. BrowsingCategory catalog unchanged — run `npm run seed:browsing-categories` only if that collection was cleared manually.",
  );
  await mongoose.disconnect();
}

clearData().catch((err: unknown) => {
  logger.error({ err }, "clear-data script failed");
  process.exit(1);
});
