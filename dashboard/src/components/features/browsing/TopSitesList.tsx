import { useMemo, useState } from "react";
import {
  BROWSING_STATS_PERIOD_OPTIONS,
  type BrowsingStatsPeriod,
} from "@/api/browsing.api";
import {
  useBrowsingCategories,
  useBrowsingDomainStats,
} from "@/api/useBrowsing";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  ViewModeContainer,
  type ViewModeContainerItem,
} from "@/components/ui/ViewModeContainer";
import { AnalyticsPanelSkeleton } from "@/components/skeletons/AnalyticsPanelSkeleton";
import type { ViewMode } from "@/types/ui.types";
import { formatDurationSeconds } from "@/utils/formatDuration";

/** Same palette as DownloadSources — keeps list/pie/bar colors aligned across pages. */
const SOURCE_COLORS = [
  "var(--color-primary-500)",
  "var(--color-accent-500)",
  "#10b981",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#84cc16",
  "#14b8a6",
  "#6366f1",
];

const TOP_SITES_SHOWN = 5;
const TOP_SITES_CHART_LIMIT = 7;

function formatSiteTickLabel(label: string): string {
  const [primary, secondary] = label.split(" \u00b7 ");
  const base = (primary?.trim() || secondary?.trim() || label).replace(/^www\./i, "");
  return base.length > 14 ? `${base.slice(0, 13)}\u2026` : base;
}

import type { BrowsingDrawerTrigger } from "./browsingDrawer.types";

interface TopSitesListProps {
  hideHeading?: boolean;
  onOpenDrawer?: (trigger: BrowsingDrawerTrigger) => void;
  onTotalClick?: () => void;
}

export function TopSitesList({
  hideHeading = false,
  onOpenDrawer,
  onTotalClick,
}: TopSitesListProps) {
  const [period, setPeriod] = useState<BrowsingStatsPeriod>("today");
  const {
    data: domainPayload,
    isLoading: domainsLoading,
    isError: domainsError,
    refetch: refetchDomains,
  } = useBrowsingDomainStats({ period });
  const domains = domainPayload?.domains ?? [];
  const periodTotalActive = domainPayload?.totalActiveTime ?? 0;
  const { data: catalog = [] } = useBrowsingCategories();
  const [view, setView] = useState<ViewMode>("list");

  const slugToColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalog) {
      m.set(c.slug, c.color);
    }
    return m;
  }, [catalog]);

  const slugToIcon = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalog) {
      m.set(c.slug, c.icon);
    }
    return m;
  }, [catalog]);

  const rowsModel = useMemo(() => {
    const top = domains.slice(0, TOP_SITES_SHOWN);
    const sumTop = top.reduce((s, d) => s + d.totalActiveTime, 0);
    const otherTime = Math.max(0, periodTotalActive - sumTop);
    const showOther = otherTime > 0;

    return {
      top,
      periodTotalActive,
      otherTime,
      showOther,
    };
  }, [domains, periodTotalActive]);

  const containerData: ViewModeContainerItem[] = useMemo(() => {
    const items: ViewModeContainerItem[] = [];
    rowsModel.top.forEach((row, idx) => {
      const fill =
        row.domainColor?.trim() ||
        slugToColor.get(row.categorySlug) ||
        SOURCE_COLORS[idx % SOURCE_COLORS.length];
      const domain = row.domain.trim();
      const label = row.label?.trim() ?? "";
      const same = !label || label.toLowerCase() === domain.toLowerCase();
      const categoryIcon = slugToIcon.get(row.categorySlug);
      const siteLabel = row.label?.trim() || domain;
      items.push({
        name: same ? domain : label,
        nameSuffix: same ? undefined : domain,
        value: row.totalActiveTime,
        fill,
        iconUrl: row.domainLogo?.trim() || undefined,
        categoryIcon: categoryIcon ?? undefined,
        categoryColor: fill,
        browsingDomain: domain,
        browsingSiteLabel: siteLabel,
      });
    });
    if (rowsModel.showOther) {
      items.push({
        name: "Others",
        value: rowsModel.otherTime,
        fill: "#9ca3af",
      });
    }
    return items;
  }, [rowsModel, slugToColor, slugToIcon]);

  const totalRow: ViewModeContainerItem = useMemo(
    () => ({
      name: "Total",
      value: rowsModel.periodTotalActive,
      fill: "#6b7280",
    }),
    [rowsModel.periodTotalActive],
  );

  const periodDescription =
    period === "today"
      ? "today"
      : period === "week"
        ? "this week"
        : period === "month"
          ? "this month"
          : "all time";

  const isLoading = domainsLoading;

  const refetch = () => {
    void refetchDomains();
  };

  if (isLoading) {
    return <TopSitesListSkeleton hideHeading={hideHeading} />;
  }

  if (domainsError) {
    return (
      <section className={hideHeading ? "" : "mb-12"}>
        {!hideHeading && (
          <div className="mb-4 px-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Site breakdown
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Active time by domain and share of your total time for{" "}
              {periodDescription}.
            </p>
          </div>
        )}
        <div className="chart-glass w-full">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load top sites
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

  return (
    <div className="w-full">
      {!hideHeading && (
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Site breakdown
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Active time by domain and share of your total time today.
          </p>
        </div>
      )}
      <ViewModeContainer
        view={view}
        onViewChange={setView}
        data={containerData}
        title="Sites"
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
        listVariant="browsing"
        formatValue={(n) => formatDurationSeconds(n)}
        yAxisTickFormatter={(seconds) => formatDurationSeconds(seconds)}
        totalRow={totalRow}
        onTotalClick={onTotalClick}
        onItemClick={
          onOpenDrawer
            ? (item) => {
                if (item.name === "Others") {
                  const excludedDomains = rowsModel.top
                    .map((row) => row.domain.trim().toLowerCase())
                    .filter((domain) => domain.length > 0);
                  onOpenDrawer({
                    type: "site-breakdown-others",
                    excludedDomains,
                    period,
                  });
                  return;
                }
                if (!item.browsingDomain) return;
                onOpenDrawer({
                  type: "site-breakdown",
                  domain: item.browsingDomain,
                  label: item.browsingSiteLabel ?? item.browsingDomain,
                  period,
                });
              }
            : undefined
        }
        onChartClick={
          onOpenDrawer
            ? (item) => {
                if (item.name === "Total") {
                  onTotalClick?.();
                  return;
                }
                if (item.name === "Others") {
                  const excludedDomains = rowsModel.top
                    .map((row) => row.domain.trim().toLowerCase())
                    .filter((domain) => domain.length > 0);
                  onOpenDrawer({
                    type: "site-breakdown-others",
                    excludedDomains,
                    period,
                  });
                  return;
                }
                if (!item.browsingDomain) return;
                onOpenDrawer({
                  type: "site-breakdown",
                  domain: item.browsingDomain,
                  label: item.browsingSiteLabel ?? item.browsingDomain,
                  period,
                });
              }
            : undefined
        }
        colors={SOURCE_COLORS}
        topN={TOP_SITES_CHART_LIMIT}
        barXAxisReduceLabels
        barXAxisFormatTick={formatSiteTickLabel}
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

function TopSitesListSkeleton({ hideHeading }: { hideHeading: boolean }) {
  return (
    <AnalyticsPanelSkeleton
      hideHeading={hideHeading}
      sectionTitle="Site breakdown"
      sectionDescription="Active time by domain and share of your total time today."
    />
  );
}
