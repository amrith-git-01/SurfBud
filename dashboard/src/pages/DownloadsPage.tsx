import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { DownloadMetricCards } from "../components/features/downloads/DownloadMetricCards";
import { DownloadActivityChart } from "../components/features/downloads/DownloadActivityChart";
import {
  DownloadHealthBars,
  type HealthBarsClickTarget,
} from "../components/features/downloads/DownloadHealthBars";
import { RecentDownloadsFeed } from "@/components/features/downloads/RecentDownloadsFeed";
import { DuplicateGroups } from "../components/features/downloads/DuplicateGroups";
import { FileCategories } from "../components/features/downloads/FileCategories";
import { DownloadSources } from "../components/features/downloads/DownloadSources";
import { useDownloadSettings } from "@/api/useDownloads";
import { Button } from "@/components/ui/Button";
import { TrackingStatusBadge } from "@/components/ui/TrackingStatusBadge";
import {
  FileDetailDrawer,
  type DrawerDetailView,
  type DrawerEventSelectionMode,
  type DrawerListPreset,
  type DrawerMode,
} from "../components/features/downloads/FileDetailDrawer";

function toIsoDate(iso: string): string {
  return iso.slice(0, 10);
}

interface DrawerOpenState {
  isOpen: boolean;
  mode: DrawerMode;
  fileId: string | null;
  eventId: string | null;
  detailView: DrawerDetailView;
  eventSelectionMode: DrawerEventSelectionMode;
  canGoBack: boolean;
  listPreset: DrawerListPreset;
}

const DEFAULT_LIST_PRESET: DrawerListPreset = {
  title: "All Downloads",
  period: "all",
};

const PRESET_BY_CARD: Record<
  "today" | "week" | "month" | "total" | "wasted",
  DrawerListPreset
> = {
  today: { title: "Today's Downloads", period: "today", sort: "newest" },
  week: { title: "This Week", period: "week", sort: "newest" },
  month: { title: "This Month", period: "month", sort: "newest" },
  total: { title: "All Downloads", period: "all", sort: "newest" },
  wasted: {
    title: "Storage Wasted",
    period: "all",
    sort: "newest",
    status: "duplicate",
    isRemoved: false,
  },
};

const PRESET_BY_HEALTH_TARGET: Record<HealthBarsClickTarget, DrawerListPreset> = {
  "total-files": { title: "All Downloads", period: "all", sort: "newest" },
  "new-files": { title: "New Downloads", period: "all", sort: "newest", status: "new" },
  "duplicate-files": { title: "Duplicate Downloads", period: "all", sort: "newest", status: "duplicate" },
  "total-size": { title: "All Downloads", period: "all", sort: "newest" },
  "used-size": { title: "Used Storage (New Files)", period: "all", sort: "newest", status: "new" },
  "wasted-size": {
    title: "Wasted Storage (Duplicates)",
    period: "all",
    sort: "newest",
    status: "duplicate",
    isRemoved: false,
  },
};

export function DownloadsPage() {
  const navigate = useNavigate();
  const { data: settings } = useDownloadSettings();
  const trackingEnabled = settings?.trackingEnabled ?? true;

  const [drawer, setDrawer] = useState<DrawerOpenState>({
    isOpen: false,
    mode: "list",
    fileId: null,
    eventId: null,
    detailView: "details",
    eventSelectionMode: "newest",
    canGoBack: false,
    listPreset: DEFAULT_LIST_PRESET,
  });

  const openListDrawer = (preset: DrawerListPreset) => {
    setDrawer({
      isOpen: true,
      mode: "list",
      fileId: null,
      eventId: null,
      detailView: "details",
      eventSelectionMode: "newest",
      canGoBack: false,
      listPreset: preset,
    });
  };

  const openDetailDrawer = (
    fileId: string,
    options?: {
      eventId?: string;
      canGoBack?: boolean;
      detailView?: DrawerDetailView;
      eventSelectionMode?: DrawerEventSelectionMode;
      listPreset?: DrawerListPreset;
    },
  ) => {
    setDrawer((previous) => ({
      isOpen: true,
      mode: "detail",
      fileId,
      eventId: options?.eventId ?? null,
      detailView: options?.detailView ?? "details",
      eventSelectionMode: options?.eventSelectionMode ?? "newest",
      canGoBack: options?.canGoBack ?? true,
      listPreset: options?.listPreset ?? previous.listPreset,
    }));
  };

  const closeDrawer = () => {
    setDrawer((previous) => ({ ...previous, isOpen: false }));
  };

  return (
    <div className="productivity-configure-shell min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-10">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="section-title-display text-3xl font-bold tracking-tight text-[var(--color-text-heading)] md:text-4xl">
                Downloads
              </h1>
              <TrackingStatusBadge enabled={trackingEnabled} />
            </div>
            <p className="section-description mt-2 max-w-xl text-sm text-[var(--color-text-muted)] md:text-[13px]">
              Monitor download volume, duplicate files, and how much disk space they use.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            hoverEffect="flat"
            className="productivity-outline-pill shrink-0"
            onClick={() => navigate("/downloads/configure")}
          >
            <Settings className="h-3.5 w-3.5" />
            Configure
          </Button>
        </header>

        <div className="flex flex-col gap-8 md:gap-10">
          <section aria-labelledby="downloads-overview-heading">
            <h2
              id="downloads-overview-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Overview
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Quick totals for today, this week, this month, and how much space duplicates cost you.
            </p>
            <div className="mt-4">
              <DownloadMetricCards
                hideSectionHeader
                onCardClick={(card) => openListDrawer(PRESET_BY_CARD[card])}
              />
            </div>
          </section>

          <section aria-labelledby="downloads-recent-heading">
            <h2
              id="downloads-recent-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Recent activity
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Activity over time next to a live list; click any row to open full file details.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
              <div className="min-h-0 lg:col-span-2">
                <DownloadActivityChart
                  hideHeading
                  onDayClick={({ date, label }) =>
                    openListDrawer({
                      title: `Downloads on ${label}`,
                      period: "all",
                      date,
                    })
                  }
                />
              </div>
              <div className="min-h-0 lg:col-span-1">
                <RecentDownloadsFeed
                  hideHeading
                  onOpenDetail={({ eventId, fileId, filename, createdAt }) =>
                    openDetailDrawer(fileId, {
                      eventId,
                      canGoBack: true,
                      detailView: "details",
                      listPreset: {
                        title: `File Details: ${filename}`,
                        period: "all",
                        search: eventId,
                        date: toIsoDate(createdAt),
                      },
                    })
                  }
                  onOpenAll={() => openListDrawer(DEFAULT_LIST_PRESET)}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="downloads-health-heading">
            <h2
              id="downloads-health-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Library health
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              How your library splits between new files and duplicates, for both file count and total size.
            </p>
            <div className="mt-4">
              <DownloadHealthBars
                hideSectionHeader
                onFilterClick={(target) => openListDrawer(PRESET_BY_HEALTH_TARGET[target])}
              />
            </div>
          </section>

          <section aria-labelledby="downloads-duplicates-heading">
            <h2
              id="downloads-duplicates-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Duplicate groups
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Files that appear more than once, grouped so you can review history and open the timeline.
            </p>
            <div className="mt-4">
              <DuplicateGroups
                hideSectionHeader
                onOpenTimeline={({ fileId }) => {
                  openDetailDrawer(fileId, {
                    canGoBack: false,
                    detailView: "timeline",
                    eventSelectionMode: "original",
                  });
                }}
              />
            </div>
          </section>

          <section aria-labelledby="downloads-analytics-heading">
            <h2
              id="downloads-analytics-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Analytics
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Breakdown by file type and by download source. Adjust the period inside each chart.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <FileCategories
                hideHeading
                onCategoryClick={(category) =>
                  openListDrawer({
                    title: `${category.charAt(0).toUpperCase()}${category.slice(1)} Files`,
                    period: "all",
                    category: category as DrawerListPreset["category"],
                  })
                }
                onShowAll={() => openListDrawer(DEFAULT_LIST_PRESET)}
              />
              <DownloadSources
                hideHeading
                onDomainClick={(domain) =>
                  openListDrawer({
                    title: `${domain} Downloads`,
                    period: "all",
                    domain,
                  })
                }
                onOthersClick={(excludedDomains) =>
                  openListDrawer({
                    title: "Other Domains Downloads",
                    period: "all",
                    excludeDomains: excludedDomains,
                  })
                }
                onShowAll={() => openListDrawer(DEFAULT_LIST_PRESET)}
              />
            </div>
          </section>
        </div>
      </div>

      <FileDetailDrawer
        isOpen={drawer.isOpen}
        onClose={closeDrawer}
        initialMode={drawer.mode}
        initialFileId={drawer.fileId}
        initialEventId={drawer.eventId}
        initialDetailView={drawer.detailView}
        initialEventSelectionMode={drawer.eventSelectionMode}
        initialCanGoBack={drawer.canGoBack}
        initialListPreset={drawer.listPreset}
      />
    </div>
  );
}
