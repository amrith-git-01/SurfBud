import { UserProductivitySettingsRepository } from "../repositories/user-productivity-settings.repository";

const DEFAULT_TAB_EVOLUTION = true;
const DEFAULT_STREAK_TAB_EVOLUTION = true;
const DEFAULT_TRACK_NEW_TABS = false;

export interface PublicProductivityUserSettings {
  tabEvolutionEnabled: boolean;
  streakTabEvolutionEnabled: boolean;
  trackNewTabsInTabGroupEnabled: boolean;
}

function serialize(row: {
  tabEvolutionEnabled?: boolean;
  streakTabEvolutionEnabled?: boolean;
  trackNewTabsInTabGroupEnabled?: boolean;
}): PublicProductivityUserSettings {
  return {
    tabEvolutionEnabled: row.tabEvolutionEnabled ?? DEFAULT_TAB_EVOLUTION,
    streakTabEvolutionEnabled:
      row.streakTabEvolutionEnabled ?? DEFAULT_STREAK_TAB_EVOLUTION,
    trackNewTabsInTabGroupEnabled:
      row.trackNewTabsInTabGroupEnabled ?? DEFAULT_TRACK_NEW_TABS,
  };
}

export const ProductivityUserSettingsService = {
  async getSettings(userId: string): Promise<PublicProductivityUserSettings> {
    await UserProductivitySettingsRepository.ensureByUserId({
      userId,
      tabEvolutionEnabled: DEFAULT_TAB_EVOLUTION,
      streakTabEvolutionEnabled: DEFAULT_STREAK_TAB_EVOLUTION,
      trackNewTabsInTabGroupEnabled: DEFAULT_TRACK_NEW_TABS,
    });
    const row = await UserProductivitySettingsRepository.findByUserId(userId);
    if (!row) {
      return {
        tabEvolutionEnabled: DEFAULT_TAB_EVOLUTION,
        streakTabEvolutionEnabled: DEFAULT_STREAK_TAB_EVOLUTION,
        trackNewTabsInTabGroupEnabled: DEFAULT_TRACK_NEW_TABS,
      };
    }
    return serialize(row);
  },

  async isTabEvolutionEnabledForUser(userId: string): Promise<boolean> {
    const s = await this.getSettings(userId);
    return s.tabEvolutionEnabled;
  },

  async updateSettings(
    userId: string,
    patch: Partial<PublicProductivityUserSettings>,
  ): Promise<PublicProductivityUserSettings> {
    await UserProductivitySettingsRepository.ensureByUserId({
      userId,
      tabEvolutionEnabled: DEFAULT_TAB_EVOLUTION,
      streakTabEvolutionEnabled: DEFAULT_STREAK_TAB_EVOLUTION,
      trackNewTabsInTabGroupEnabled: DEFAULT_TRACK_NEW_TABS,
    });
    const updated = await UserProductivitySettingsRepository.updateByUserId(
      userId,
      patch,
    );
    return serialize(updated);
  },
};
