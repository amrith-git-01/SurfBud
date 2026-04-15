import type { RoutingFolder } from "@/api/downloads.api";
import { DownloadRoutingAutoRouteCard } from "./DownloadRoutingAutoRouteCard";
import { DownloadRoutingSection } from "./DownloadRoutingSection";

interface DownloadRoutingGroupProps {
  routingEnabled: boolean;
  routingFolders: RoutingFolder[];
  isLoading?: boolean;
  isDisabled?: boolean;
  onRoutingEnabledChange: (next: boolean) => void;
  onRoutingFoldersChange: (next: RoutingFolder[]) => void;
}

export function DownloadRoutingGroup({
  routingEnabled,
  routingFolders,
  isLoading = false,
  isDisabled = false,
  onRoutingEnabledChange,
  onRoutingFoldersChange,
}: DownloadRoutingGroupProps) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
          Download routing
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Map categories to folders so new downloads land in the right subfolder
          under Downloads.
        </p>
      </div>
      <DownloadRoutingAutoRouteCard
        embedded
        routingEnabled={routingEnabled}
        isLoading={isLoading}
        isDisabled={isDisabled}
        onRoutingEnabledChange={onRoutingEnabledChange}
      />
      <DownloadRoutingSection
        embedded
        routingEnabled={routingEnabled}
        routingFolders={routingFolders}
        isLoading={isLoading}
        isDisabled={isDisabled}
        onRoutingFoldersChange={onRoutingFoldersChange}
      />
    </section>
  );
}
