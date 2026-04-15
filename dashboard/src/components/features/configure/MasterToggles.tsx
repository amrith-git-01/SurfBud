import { SettingsToggleCards } from "./shared/SettingsToggleCards";

interface MasterTogglesProps {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  onTrackingChange: (next: boolean) => void;
  onAutoRemoveChange: (next: boolean) => void;
}

export function MasterToggles({
  trackingEnabled,
  autoRemoveEnabled,
  isLoading = false,
  isDisabled = false,
  onTrackingChange,
  onAutoRemoveChange,
}: MasterTogglesProps) {
  return (
    <SettingsToggleCards
      sectionTitle="Core settings"
      sectionDescription="Turn download logging on or off, and decide whether SurfBud may delete duplicate files automatically."
      isLoading={isLoading}
      isDisabled={isDisabled}
      cards={[
        {
          id: "download-tracking",
          label: "Download Tracking",
          description:
            "Records each download so it shows up in your dashboard and activity feeds.",
          checked: trackingEnabled,
          onChange: onTrackingChange,
          warningText: "Download tracking is off — nothing new is recorded.",
        },
        {
          id: "auto-remove-duplicates",
          label: "Auto-remove Duplicates",
          description:
            "When SurfBud detects a duplicate download, it removes the duplicate immediately from the disk.",
          checked: autoRemoveEnabled,
          onChange: onAutoRemoveChange,
          disabled: !trackingEnabled,
          disabledTooltip:
            "Enable download tracking first — duplicates are detected from recorded downloads.",
        },
      ]}
    />
  );
}
