import { SettingsToggleCards } from "./shared/SettingsToggleCards";

interface DownloadRoutingAutoRouteCardProps {
  routingEnabled: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  embedded?: boolean;
  onRoutingEnabledChange: (next: boolean) => void;
}

export function DownloadRoutingAutoRouteCard({
  routingEnabled,
  isLoading = false,
  isDisabled = false,
  embedded = false,
  onRoutingEnabledChange,
}: DownloadRoutingAutoRouteCardProps) {
  const sectionTitle = embedded ? "" : "Download routing";
  const sectionDescription = embedded
    ? ""
    : "Map categories to folders so new downloads land in the right subfolder under Downloads.";

  return (
    <SettingsToggleCards
      sectionTitle={sectionTitle}
      sectionDescription={sectionDescription}
      hideSectionHeader={embedded}
      bare={embedded}
      maxColumns={1}
      isLoading={isLoading}
      isDisabled={isDisabled}
      cards={[
        {
          id: "auto-route-downloads",
          label: "Auto-route Downloads",
          description:
            "When on, SurfBud moves new downloads into the subfolders you define instead of the Downloads root.",
          checked: routingEnabled,
          onChange: onRoutingEnabledChange,
        },
      ]}
    />
  );
}
