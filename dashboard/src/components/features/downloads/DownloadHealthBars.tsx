import { useDownloadStats } from "../../../api/useDownloads";

export type HealthBarsClickTarget =
  | "total-files"
  | "new-files"
  | "duplicate-files"
  | "total-size"
  | "used-size"
  | "wasted-size";

interface DownloadHealthBarsProps {
  onFilterClick?: (target: HealthBarsClickTarget) => void;
}

export function DownloadHealthBars({ onFilterClick }: DownloadHealthBarsProps) {
  const { data: stats, isLoading } = useDownloadStats();

  if (isLoading) {
    return <DownloadHealthBarsSkeleton />;
  }

  const totalFiles = (stats?.totalNew || 0) + (stats?.totalDuplicates || 0);
  const newPercentage = totalFiles > 0 ? ((stats?.totalNew || 0) / totalFiles) * 100 : 0;
  const dupPercentage = totalFiles > 0 ? ((stats?.totalDuplicates || 0) / totalFiles) * 100 : 0;

  // All fields come directly from backend - no calculations
  const totalSize = stats?.totalSize || 0;
  const usedSize = stats?.newSize || 0;
  const wastedSize = stats?.duplicateSize || 0;
  const usedPercentage = totalSize > 0 ? (usedSize / totalSize) * 100 : 0;
  const wastedPercentage = totalSize > 0 ? (wastedSize / totalSize) * 100 : 0;

  return (
    <section>
      <p className="section-label-with-gap">DOWNLOAD HEALTH BARS</p>

      <div className="grid grid-cols-2 gap-4">
        {/* Downloads Health */}
        <div className="card-metric-glass">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="section-label">DOWNLOADS HEALTH</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                New vs duplicate distribution
              </p>
            </div>
            {/* Legend */}
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]"></div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  New {newPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-coral)]"></div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Dup {dupPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden bg-[var(--color-bg-page)] flex mb-3">
            <div
              className="h-full bg-[var(--color-success)] transition-all duration-[800ms] cursor-pointer"
              style={{
                width: `${newPercentage}%`,
                transitionTimingFunction: "cubic-bezier(0.0, 0.0, 0.2, 1)",
              }}
              onClick={() => onFilterClick?.("new-files")}
            ></div>
            <div
              className="h-full bg-[var(--color-coral)] transition-all duration-[800ms] cursor-pointer"
              style={{
                width: `${dupPercentage}%`,
                transitionTimingFunction: "cubic-bezier(0.0, 0.0, 0.2, 1)",
              }}
              onClick={() => onFilterClick?.("duplicate-files")}
            ></div>
          </div>

          {/* Stat Pills - Right aligned */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onFilterClick?.("total-files")}
              className="bg-[#0891B2] rounded-lg px-3 py-1 cursor-pointer"
            >
              <div className="text-xs text-white/80">Total</div>
              <div className="text-xs font-medium text-white tabular-nums">
                {totalFiles}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onFilterClick?.("new-files")}
              className="bg-[#16A34A] rounded-lg px-3 py-1 cursor-pointer"
            >
              <div className="text-xs text-white/80">New</div>
              <div className="text-xs font-medium text-white tabular-nums">
                {stats?.totalNew || 0}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onFilterClick?.("duplicate-files")}
              className="bg-[#EA580C] rounded-lg px-3 py-1 cursor-pointer"
            >
              <div className="text-xs text-white/80">Dup</div>
              <div className="text-xs font-medium text-white tabular-nums">
                {stats?.totalDuplicates || 0}
              </div>
            </button>
          </div>
        </div>

        {/* Storage Efficiency */}
        <div className="card-metric-glass">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="section-label">STORAGE EFFICIENCY</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Useful vs wasted storage
              </p>
            </div>
            {/* Legend */}
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]"></div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Used {usedPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-coral)]"></div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Wasted {wastedPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden bg-[var(--color-bg-page)] flex mb-3">
            <div
              className="h-full bg-[var(--color-success)] transition-all duration-[800ms] cursor-pointer"
              style={{
                width: `${usedPercentage}%`,
                transitionTimingFunction: "cubic-bezier(0.0, 0.0, 0.2, 1)",
              }}
              onClick={() => onFilterClick?.("used-size")}
            ></div>
            <div
              className="h-full bg-[var(--color-coral)] transition-all duration-[800ms] cursor-pointer"
              style={{
                width: `${wastedPercentage}%`,
                transitionTimingFunction: "cubic-bezier(0.0, 0.0, 0.2, 1)",
              }}
              onClick={() => onFilterClick?.("wasted-size")}
            ></div>
          </div>

          {/* Stat Pills - Right aligned */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onFilterClick?.("total-size")}
              className="bg-[#0891B2] rounded-lg px-3 py-1 cursor-pointer"
            >
              <div className="text-xs text-white/80">Total</div>
              <div className="text-xs font-medium text-white tabular-nums">
                {formatBytes(totalSize)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onFilterClick?.("used-size")}
              className="bg-[#16A34A] rounded-lg px-3 py-1 cursor-pointer"
            >
              <div className="text-xs text-white/80">Used</div>
              <div className="text-xs font-medium text-white tabular-nums">
                {formatBytes(usedSize)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onFilterClick?.("wasted-size")}
              className="bg-[#EA580C] rounded-lg px-3 py-1 cursor-pointer"
            >
              <div className="text-xs text-white/80">Wasted</div>
              <div className="text-xs font-medium text-white tabular-nums">
                {formatBytes(wastedSize)}
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadHealthBarsSkeleton() {
  return (
    <section>
      <p className="section-label-with-gap">DOWNLOAD HEALTH BARS</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-metric-glass">
          <div className="skeleton h-4 w-32 mb-2"></div>
          <div className="skeleton h-3 w-48 mb-4"></div>
          <div className="skeleton h-3 w-full mb-4 rounded-full"></div>
          <div className="flex gap-2">
            <div className="skeleton h-12 w-20 rounded-lg"></div>
            <div className="skeleton h-12 w-20 rounded-lg"></div>
            <div className="skeleton h-12 w-20 rounded-lg"></div>
          </div>
        </div>
        <div className="card-metric-glass">
          <div className="skeleton h-4 w-32 mb-2"></div>
          <div className="skeleton h-3 w-48 mb-4"></div>
          <div className="skeleton h-3 w-full mb-4 rounded-full"></div>
          <div className="flex gap-2">
            <div className="skeleton h-12 w-20 rounded-lg"></div>
            <div className="skeleton h-12 w-20 rounded-lg"></div>
            <div className="skeleton h-12 w-20 rounded-lg"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.max(0, Math.min(i, sizes.length - 1));
  return `${(bytes / Math.pow(k, clampedIndex)).toFixed(clampedIndex === 0 ? 0 : 2)} ${sizes[clampedIndex]}`;
}
