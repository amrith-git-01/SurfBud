import type { ProductivityUserSettings } from "@/types/shared/productivity.types";
import { SettingsToggleCards } from "@/components/features/configure/shared/SettingsToggleCards";

interface TabGroupEvolutionSettingsProps {
  value: ProductivityUserSettings;
  onChange: (next: ProductivityUserSettings) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export function TabGroupEvolutionSettings({
  value,
  onChange,
  isLoading,
  isDisabled,
}: TabGroupEvolutionSettingsProps) {
  const tabEvolutionEnabled = value.tabEvolutionEnabled;
  const trackNewTabs = value.trackNewTabsInTabGroupEnabled;

  return (
    <div className="mt-6">
      <SettingsToggleCards
        hideSectionHeader
        isLoading={isLoading}
        isDisabled={isDisabled}
        cards={[
          {
            id: "tab-evolution",
            label: "Tab evolution",
            description:
              "When you close a tab-group window, SurfBud saves its tab URLs so the next time you open that group it can reopen the same set of sites.",
            checked: tabEvolutionEnabled,
            onChange: (next) =>
              onChange(
                next
                  ? { ...value, tabEvolutionEnabled: true }
                  : {
                      ...value,
                      tabEvolutionEnabled: false,
                      trackNewTabsInTabGroupEnabled: false,
                    },
              ),
          },
          {
            id: "track-new-tabs",
            label: "Track new tabs within the tab group",
            description:
              "By default only tabs that match the group's launch URLs, or domains you set to Track in browsing rules, are saved. Enable this to also save every other new tab opened in that window.",
            checked: trackNewTabs,
            disabled: !tabEvolutionEnabled,
            disabledTooltip: "Turn on tab evolution first — this option extends which tabs are saved.",
            onChange: (next) =>
              onChange({ ...value, trackNewTabsInTabGroupEnabled: next }),
          },
        ]}
      />
    </div>
  );
}
