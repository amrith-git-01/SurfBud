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
import { UserBrowsingMetrics } from "../models/user-browsing-metrics.model";
import { UserDownloadRuleModel } from "../models/user-download-rule.model";
import { UserDownloadSettingsModel } from "../models/user-download-settings.model";
import { UserRoutingFolderModel } from "../models/user-routing-folder.model";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

async function clearData(): Promise<void> {
  await connectDB();

  const collections = [
    { model: DownloadEvent, name: "DownloadEvent" },
    { model: File, name: "File" },
    { model: UserDownloadMetrics, name: "UserDownloadMetrics" },
    { model: CategoryStats, name: "CategoryStats" },
    { model: DomainStatsModel, name: "DomainStats" },
    { model: UserDownloadRuleModel, name: "UserDownloadRule" },
    { model: UserDownloadSettingsModel, name: "UserDownloadSettings" },
    { model: UserRoutingFolderModel, name: "UserRoutingFolder" },
    { model: BrowsingSession, name: "BrowsingSession" },
    { model: UserBrowsingMetrics, name: "UserBrowsingMetrics" },
    { model: BrowsingDailyStats, name: "BrowsingDailyStats" },
    { model: BrowsingDomainStats, name: "BrowsingDomainStats" },
    { model: BrowsingCategoryStats, name: "BrowsingCategoryStats" },
    { model: DomainClassification, name: "DomainClassification" },
  ];

  logger.info(
    "Clearing collections (users & BrowsingCategory catalog preserved)...",
  );

  for (const { model, name } of collections) {
    const result = await model.collection.deleteMany({});
    logger.info(`  ${name}: deleted ${result.deletedCount} documents`);
  }

  logger.info(
    "Done. Test data cleared. BrowsingCategory seed data is kept — run `npm run seed:browsing-categories` if you ever clear that collection manually.",
  );
  await mongoose.disconnect();
}

clearData().catch((err: unknown) => {
  logger.error({ err }, "clear-data script failed");
  process.exit(1);
});
