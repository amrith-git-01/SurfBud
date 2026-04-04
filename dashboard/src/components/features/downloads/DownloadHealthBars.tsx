import { useDownloadStats } from "../../../api/useDownloads";
import {
  HealthBarCard,
  HealthBarCardSkeleton,
} from "@/components/ui/HealthBarCard";

export type HealthBarsClickTarget =
  | "total-files"
  | "new-files"
  | "duplicate-files"
  | "total-size"
  | "used-size"
  | "wasted-size";

interface DownloadHealthBarsProps {
  onFilterClick?: (target: HealthBarsClickTarget) => void;
  hideSectionHeader?: boolean;
}

export function DownloadHealthBars({
  onFilterClick,
  hideSectionHeader = false,
}: DownloadHealthBarsProps) {
  const { data: stats, isLoading } = useDownloadStats();

  if (isLoading) {
    return (
      <section>
        {!hideSectionHeader && <SectionHeader />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HealthBarCardSkeleton pillCount={3} />
          <HealthBarCardSkeleton pillCount={3} />
        </div>
      </section>
    );
  }

  const totalFiles = (stats?.totalNew ?? 0) + (stats?.totalDuplicates ?? 0);
  const newPct =
    totalFiles > 0 ? ((stats?.totalNew ?? 0) / totalFiles) * 100 : 0;
  const dupPct =
    totalFiles > 0 ? ((stats?.totalDuplicates ?? 0) / totalFiles) * 100 : 0;

  const totalSize = stats?.totalSize ?? 0;
  const usedSize = stats?.newSize ?? 0;
  const wastedSize = stats?.duplicateSize ?? 0;
  const usedPct = totalSize > 0 ? (usedSize / totalSize) * 100 : 0;
  const wastedPct = totalSize > 0 ? (wastedSize / totalSize) * 100 : 0;

  return (
    <section>
      {!hideSectionHeader && <SectionHeader />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <HealthBarCard
          title="DOWNLOADS HEALTH"
          description="Share of files that are new versus duplicate copies"
          segments={[
            {
              label: "New",
              pct: newPct,
              barColor: "var(--color-success)",
              dotClass: "bg-[var(--color-success)]",
              onClick: () => onFilterClick?.("new-files"),
            },
            {
              label: "Dup",
              pct: dupPct,
              barColor: "var(--color-coral)",
              dotClass: "bg-[var(--color-coral)]",
              onClick: () => onFilterClick?.("duplicate-files"),
            },
          ]}
          pills={[
            {
              label: "Total",
              value: String(totalFiles),
              bgColor: "#0891B2",
              onClick: () => onFilterClick?.("total-files"),
            },
            {
              label: "New",
              value: String(stats?.totalNew ?? 0),
              bgColor: "#16A34A",
              onClick: () => onFilterClick?.("new-files"),
            },
            {
              label: "Dup",
              value: String(stats?.totalDuplicates ?? 0),
              bgColor: "#EA580C",
              onClick: () => onFilterClick?.("duplicate-files"),
            },
          ]}
        />

        <HealthBarCard
          title="STORAGE EFFICIENCY"
          description="How much of your download folder is unique content versus wasted duplicate space"
          segments={[
            {
              label: "Used",
              pct: usedPct,
              barColor: "var(--color-success)",
              dotClass: "bg-[var(--color-success)]",
              onClick: () => onFilterClick?.("used-size"),
            },
            {
              label: "Wasted",
              pct: wastedPct,
              barColor: "var(--color-coral)",
              dotClass: "bg-[var(--color-coral)]",
              onClick: () => onFilterClick?.("wasted-size"),
            },
          ]}
          pills={[
            {
              label: "Total",
              value: formatBytes(totalSize),
              bgColor: "#0891B2",
              onClick: () => onFilterClick?.("total-size"),
            },
            {
              label: "Used",
              value: formatBytes(usedSize),
              bgColor: "#16A34A",
              onClick: () => onFilterClick?.("used-size"),
            },
            {
              label: "Wasted",
              value: formatBytes(wastedSize),
              bgColor: "#EA580C",
              onClick: () => onFilterClick?.("wasted-size"),
            },
          ]}
        />
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
        Library health
      </h3>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Compares unique downloads against duplicates for both file counts and
        total storage used.
      </p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.max(0, Math.min(i, sizes.length - 1));
  return `${(bytes / Math.pow(k, idx)).toFixed(idx === 0 ? 0 : 2)} ${sizes[idx]}`;
}
