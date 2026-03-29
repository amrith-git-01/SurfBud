import { SettingsToggleCards } from './shared/SettingsToggleCards';

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
      sectionTitle="Master Toggles"
      sectionDescription="Control core tracking and duplicate-removal behavior."
      isLoading={isLoading}
      isDisabled={isDisabled}
      cards={[
        {
          id: 'download-tracking',
          label: 'Download Tracking',
          description: 'Track and record all downloaded files',
          checked: trackingEnabled,
          onChange: onTrackingChange,
          warningText: 'SurfBud is not recording any downloads',
        },
        {
          id: 'auto-remove-duplicates',
          label: 'Auto-remove Duplicates',
          description: 'Automatically delete duplicate files from your disk',
          checked: autoRemoveEnabled,
          onChange: onAutoRemoveChange,
          disabled: !trackingEnabled,
          disabledTooltip: 'Enable Download Tracking first',
        },
      ]}
    />
  );
}
