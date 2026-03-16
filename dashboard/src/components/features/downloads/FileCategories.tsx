import React, { useState, useMemo, memo } from 'react';
import { useCategories } from '@/api/useDownloads';
import { formatBytes } from '@/utils/formatBytes';
import { ViewModeContainer, type ViewModeContainerItem } from '@/components/ui/ViewModeContainer';
import type { ViewMode } from '@/types/ui.types';

const CATEGORY_COLORS: Record<string, string> = {
  document: 'var(--color-primary-500)',
  image: '#10b981',
  video: 'var(--color-accent-500)',
  text: '#f59e0b',
  audio: '#ec4899',
  archive: '#f97316',
  code: '#06b6d4',
  executable: '#ef4444',
  other: '#6b7280',
};

interface FileCategoriesProps {
  hideHeading?: boolean;
  onCategoryClick?: (category: string) => void;
  onShowAll?: () => void;
}

export const FileCategories: React.FC<FileCategoriesProps> = memo(({
  hideHeading = false,
  onCategoryClick,
  onShowAll,
}) => {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const [view, setView] = useState<ViewMode>('list');

  const categoryData = useMemo(() => {
    const predefined = ['document', 'image', 'video', 'text', 'audio', 'archive', 'code', 'executable', 'other'];
    const metrics = categories || [];
    const dataMap = new Map(metrics.map((m) => [m.category.toLowerCase(), m]));
    const allNames = Array.from(new Set([...predefined, ...metrics.map((m) => m.category.toLowerCase())]));
    return allNames
      .map((raw) => {
        const metric = dataMap.get(raw);
        const displayName = raw.charAt(0).toUpperCase() + raw.slice(1);
        return {
          rawName: raw,
          name: displayName,
          value: metric?.totalCount || 0,
          size: metric?.totalSize || 0,
          newValue: metric?.newCount || 0,
          duplicateValue: metric?.dupCount || 0,
          fill: CATEGORY_COLORS[raw] || '#6b7280',
        };
      })
      .filter((item) => item.value > 0 || predefined.includes(item.rawName))
      .sort((a, b) => (b.value !== a.value ? b.value - a.value : a.name.localeCompare(b.name)));
  }, [categories]);

  const totalCount = useMemo(() => categoryData.reduce((sum, c) => sum + c.value, 0), [categoryData]);
  const totalSize = useMemo(() => categoryData.reduce((sum, c) => sum + c.size, 0), [categoryData]);
  const totalNewCount = useMemo(() => categoryData.reduce((sum, c) => sum + c.newValue, 0), [categoryData]);
  const totalDuplicateCount = useMemo(() => categoryData.reduce((sum, c) => sum + c.duplicateValue, 0), [categoryData]);

  const containerData: ViewModeContainerItem[] = useMemo(
    () =>
      categoryData
        .slice()
        .sort((a, b) => b.size - a.size)
        .map((item) => ({
          name: item.name,
          value: item.value,
          secondary: item.size,
          fill: item.fill,
          newValue: item.newValue,
          duplicateValue: item.duplicateValue,
        })),
    [categoryData]
  );

  const totalRow: ViewModeContainerItem = useMemo(
    () => ({
      name: 'Total',
      value: totalCount,
      secondary: totalSize,
      fill: '#6b7280',
      newValue: totalNewCount,
      duplicateValue: totalDuplicateCount,
    }),
    [totalCount, totalSize, totalNewCount, totalDuplicateCount]
  );

  if (isLoading) return <FileCategoriesSkeleton />;

  if (isError) {
    return (
      <section className={hideHeading ? "" : "mb-12"}>
        {!hideHeading && (
          <div className="mb-4 px-2">
            <h3 className="text-sm font-semibold text-gray-900">File Analytics</h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Analyze category-level distribution by file count and storage consumption.
            </p>
          </div>
        )}
        <div className="chart-glass w-full">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load file categories
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

  const handleCategoryClick = (category: string) => {
    onCategoryClick?.(category.toLowerCase());
  };

  const handleShowAll = () => {
    onShowAll?.();
  };

  return (
    <div className="w-full">
      {!hideHeading && (
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">File Analytics</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Analyze category-level distribution by file count and storage consumption.
          </p>
        </div>
      )}
      <ViewModeContainer
        view={view}
        onViewChange={setView}
        data={containerData}
        title="File Categories"
        valueLabel="Files"
        secondaryLabel="Size"
        formatValue={(n) => n.toLocaleString()}
        formatSecondary={formatBytes}
        totalRow={totalRow}
        onTotalClick={handleShowAll}
        onItemClick={(item) => handleCategoryClick(item.name)}
        onChartClick={(item) => {
          if (item.name === 'Total') handleShowAll();
          else handleCategoryClick(item.name);
        }}
        emptyMessage={view === 'list' ? 'No data available' : 'No activity yet. Start downloading to see trends here.'}
        colors={Object.values(CATEGORY_COLORS)}
        minHeight="420px"
      />
    </div>
  );
});

FileCategories.displayName = 'FileCategories';

function FileCategoriesSkeleton() {
  return (
    <section className="mb-12">
      <div className="mb-4 px-2">
        <h3 className="text-sm font-semibold text-gray-900">File Analytics</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Analyze category-level distribution by file count and storage consumption.
        </p>
      </div>
      <div className="chart-glass w-full p-6">
        <div className="skeleton h-6 w-16 mb-6 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-4">
            <div className="skeleton h-2 flex-1 rounded-full" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}