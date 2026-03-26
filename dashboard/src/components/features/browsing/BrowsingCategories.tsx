import { useMemo, useState } from "react";
import {
  BROWSING_STATS_PERIOD_OPTIONS,
  type BrowsingStatsPeriod,
} from "@/api/browsing.api";
import { useBrowsingCategoryStats } from "@/api/useBrowsing";
import { Dropdown } from "@/components/ui/Dropdown";
import { ViewModeContainer } from "@/components/ui/ViewModeContainer";
import type { ViewModeContainerItem } from "@/components/ui/ViewModeContainer";
import { AnalyticsPanelSkeleton } from "@/components/skeletons/AnalyticsPanelSkeleton";
import type { ViewMode } from "@/types/ui.types";
import { formatDurationSeconds } from "@/utils/formatDuration";

import type { BrowsingDrawerTrigger } from "./browsingDrawer.types";

interface BrowsingCategoriesProps {
  hideHeading?: boolean;
  onOpenDrawer?: (trigger: BrowsingDrawerTrigger) => void;
  onTotalClick?: () => void;
}

export function BrowsingCategories({
  hideHeading = false,
  onOpenDrawer,
  onTotalClick,
}: BrowsingCategoriesProps) {
  const [period, setPeriod] = useState<BrowsingStatsPeriod>("today");
  const [view, setView] = useState<ViewMode>("list");
  const {
    data: categoryRows = [],
    isLoading,
    isError,
    refetch,
  } = useBrowsingCategoryStats({ period });

  const containerData: ViewModeContainerItem[] = useMemo(
    () =>
      categoryRows.map((row) => ({
        name: row.name,
        value: row.totalActiveTime,
        fill: row.color,
        browsingCategorySlug: row.categorySlug,
      })),
    [categoryRows],
  );

  const periodDescription =
    period === "today"
      ? "today"
      : period === "week"
        ? "this week"
        : period === "month"
          ? "this month"
          : "all time";

  const totalRow: ViewModeContainerItem = useMemo(() => {
    const totalSeconds = categoryRows.reduce(
      (s, r) => s + r.totalActiveTime,
      0,
    );
    return {
      name: "Total",
      value: totalSeconds,
      fill: "#6b7280",
    };
  }, [categoryRows]);

  if (isLoading) {
    return <BrowsingCategoriesSkeleton hideHeading={hideHeading} />;
  }

  if (isError) {
    return (
      <section className={hideHeading ? "" : "mb-12"}>
        {!hideHeading && (
          <div className="mb-4 px-2">
            <h3 className="text-sm font-semibold text-gray-900">Category breakdown</h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Active time by category for {periodDescription} (productive, neutral,
              distractive).
            </p>
          </div>
        )}
        <div className="chart-glass w-full">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load category breakdown
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full">
      {!hideHeading && (
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">Category breakdown</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Active time by category for {periodDescription} (productive, neutral,
            distractive).
          </p>
        </div>
      )}
      <ViewModeContainer
        view={view}
        onViewChange={setView}
        data={containerData}
        title="File Categories"
        headerLeft={
          <Dropdown
            className="shrink-0"
            value={period}
            options={BROWSING_STATS_PERIOD_OPTIONS}
            onChange={setPeriod}
            align="right"
            size="md"
          />
        }
        valueLabel="time"
        formatValue={(n) => formatDurationSeconds(n)}
        yAxisTickFormatter={(seconds) => formatDurationSeconds(seconds)}
        totalRow={totalRow}
        onTotalClick={onTotalClick}
        onItemClick={
          onOpenDrawer
            ? (item) => {
                const slug = item.browsingCategorySlug?.trim();
                if (!slug) return;
                onOpenDrawer({
                  type: "category-breakdown",
                  categorySlug: slug,
                  categoryName: item.name,
                  period,
                });
              }
            : undefined
        }
        emptyMessage={
          view === "list"
            ? "No data available"
            : "No activity yet. Browse with SurfBud to see trends here."
        }
        minHeight="420px"
      />
    </div>
  );
}

function BrowsingCategoriesSkeleton({ hideHeading }: { hideHeading: boolean }) {
  return (
    <AnalyticsPanelSkeleton
      hideHeading={hideHeading}
      sectionTitle="Category breakdown"
      sectionDescription="Active time grouped by site category (productive, neutral, distractive)."
    />
  );
}
