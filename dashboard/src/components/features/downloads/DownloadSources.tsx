import React, { useState, useMemo, memo } from 'react';
import { useDomains } from '@/api/useDownloads';
import { formatBytes } from '@/utils/formatBytes';
import { ViewModeContainer, type ViewModeContainerItem } from '@/components/ui/ViewModeContainer';
import type { ViewMode } from '@/types/ui.types';

const SOURCE_COLORS = [
  'var(--color-primary-500)',
  'var(--color-accent-500)',
  '#10b981',
  '#f97316',
  '#ec4899',
  '#06b6d4',
  '#f59e0b',
  '#84cc16',
  '#14b8a6',
  '#6366f1',
];

interface DownloadSourcesProps {
  hideHeading?: boolean;
  onDomainClick?: (domain: string) => void;
  onOthersClick?: (excludedDomains: string[]) => void;
  onShowAll?: () => void;
}

export const DownloadSources: React.FC<DownloadSourcesProps> = memo(({
  hideHeading = false,
  onDomainClick,
  onOthersClick,
  onShowAll,
}) => {
  const { data: domains, isLoading, isError, refetch } = useDomains();
  const [view, setView] = useState<ViewMode>('list');

  const sources = useMemo(
    () =>
      (domains || []).map((d) => ({
        domain: d.domain,
        totalDownloads: d.totalCount,
        totalSize: d.totalSize,
        newDownloads: d.newCount,
        duplicateDownloads: d.dupCount,
      })),
    [domains]
  );

  const containerData: ViewModeContainerItem[] = useMemo(
    () =>
      sources
        .slice()
        .sort((a, b) => b.totalSize - a.totalSize)
        .map((s, idx) => ({
          name: s.domain,
          value: s.totalDownloads,
          secondary: s.totalSize,
          fill: SOURCE_COLORS[idx % SOURCE_COLORS.length],
          newValue: s.newDownloads,
          duplicateValue: s.duplicateDownloads,
        })),
    [sources],
  );

  const totalDownloads = useMemo(() => sources.reduce((sum, s) => sum + s.totalDownloads, 0), [sources]);
  const totalSize = useMemo(() => sources.reduce((sum, s) => sum + s.totalSize, 0), [sources]);
  const totalNewDownloads = useMemo(() => sources.reduce((sum, s) => sum + s.newDownloads, 0), [sources]);
  const totalDuplicateDownloads = useMemo(() => sources.reduce((sum, s) => sum + s.duplicateDownloads, 0), [sources]);

  const totalRow: ViewModeContainerItem = useMemo(
    () => ({
      name: 'Total',
      value: totalDownloads,
      secondary: totalSize,
      fill: '#6b7280',
      newValue: totalNewDownloads,
      duplicateValue: totalDuplicateDownloads,
    }),
    [totalDownloads, totalSize, totalNewDownloads, totalDuplicateDownloads]
  );

  if (isLoading) return <DownloadSourcesSkeleton />;

  if (isError) {
    return (
      <section className={hideHeading ? "" : "mb-12"}>
        {!hideHeading && (
          <div className="mb-4 px-2">
            <h3 className="text-sm font-semibold text-gray-900">Download Sources</h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Compare domains by download count and storage footprint.
            </p>
          </div>
        )}
        <div className="chart-glass w-full">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load download sources
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const handleSourceClick = (domain: string) => {
    onDomainClick?.(domain);
  };

  const handleShowAll = () => {
    onShowAll?.();
  };

  const handleSourceOthersClick = (_excludedDomains: string[]) => {
    if (_excludedDomains.length === 0) {
      onShowAll?.();
      return;
    }
    onOthersClick?.(_excludedDomains);
  };

  return (
    <div className="w-full">
      {!hideHeading && (
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">Download Sources</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Compare domains by download count and storage footprint.
          </p>
        </div>
      )}
      <ViewModeContainer
        view={view}
        onViewChange={setView}
        data={containerData}
        title="Domains"
        valueLabel="Downloads"
        secondaryLabel="Size"
        formatValue={(n) => n.toLocaleString()}
        formatSecondary={formatBytes}
        totalRow={totalRow}
        onTotalClick={handleShowAll}
        onItemClick={(item) => {
          if (item.name === 'Others' && item.othersExcludedKeys?.length) {
            handleSourceOthersClick(item.othersExcludedKeys);
          } else {
            handleSourceClick(item.name);
          }
        }}
        onChartClick={(item) => {
          if (item.name === 'Total') handleShowAll();
          else if (item.name === 'Others' && item.othersExcludedKeys?.length)
            handleSourceOthersClick(item.othersExcludedKeys);
          else handleSourceClick(item.name);
        }}
        colors={SOURCE_COLORS}
        topN={7}
        barXAxisReduceLabels
        emptyMessage={
          view === 'list'
            ? 'No data available'
            : 'No activity yet. Start downloading to see trends here.'
        }
        minHeight="420px"
      />
    </div>
  );
});

DownloadSources.displayName = 'DownloadSources';

function DownloadSourcesSkeleton() {
  return (
    <section className="mb-12">
      <div className="mb-4 px-2">
        <h3 className="text-sm font-semibold text-gray-900">Download Sources</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Compare domains by download count and storage footprint.
        </p>
      </div>
      <div className="chart-glass w-full p-6">
        <div className="skeleton h-6 w-16 mb-6 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-4">
            <div className="skeleton h-2 flex-1 rounded-full" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
