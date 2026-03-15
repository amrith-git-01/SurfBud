import { connectDB } from '../config/db';
import { CategoryStats } from '../models/category-stats.model';
import { DomainStatsModel } from '../models/domain-stats.model';
import { DownloadEvent } from '../models/download-event.model';
import { UserDownloadMetrics } from '../models/download-metrics.model';
import { File } from '../models/file.model';
import { UserDownloadRuleModel } from '../models/user-download-rule.model';
import { UserDownloadSettingsModel } from '../models/user-download-settings.model';
import { UserRoutingFolderModel } from '../models/user-routing-folder.model';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

async function clearData(): Promise<void> {
  await connectDB();

  const collections = [
    { model: DownloadEvent, name: 'DownloadEvent' },
    { model: File, name: 'File' },
    { model: UserDownloadMetrics, name: 'UserDownloadMetrics' },
    { model: CategoryStats, name: 'CategoryStats' },
    { model: DomainStatsModel, name: 'DomainStats' },
    { model: UserDownloadRuleModel, name: 'UserDownloadRule' },
    { model: UserDownloadSettingsModel, name: 'UserDownloadSettings' },
    { model: UserRoutingFolderModel, name: 'UserRoutingFolder' },
  ];

  logger.info('Clearing all collections (users preserved)...');

  for (const { model, name } of collections) {
    const result = await model.deleteMany({} as any);
    logger.info(`  ${name}: deleted ${result.deletedCount} documents`);
  }

  logger.info('Done. All test data cleared.');
  await mongoose.disconnect();
}

clearData().catch((err: unknown) => {
  logger.error({ err }, 'clear-data script failed');
  process.exit(1);
});
