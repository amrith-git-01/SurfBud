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
import { useDownloadsLive } from "@/api/useDownloadsLive";
import { useDownloadSettings } from "@/api/useDownloads";
import {
  FileDetailDrawer,
  type DrawerDetailView,
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
  detailView: DrawerDetailView;
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
  today: { title: "Today's Downloads", period: "today" },
  week: { title: "This Week", period: "week" },
  month: { title: "This Month", period: "month" },
  total: { title: "All Downloads", period: "all" },
  wasted: {
    title: "Storage Wasted",
    period: "all",
    status: "duplicate",
    isRemoved: false,
  },
};

const PRESET_BY_HEALTH_TARGET: Record<HealthBarsClickTarget, DrawerListPreset> = {
  "total-files": { title: "All Downloads", period: "all" },
  "new-files": { title: "New Downloads", period: "all", status: "new" },
  "duplicate-files": { title: "Duplicate Downloads", period: "all", status: "duplicate" },
  "total-size": { title: "All Downloads", period: "all" },
  "used-size": { title: "Used Storage (New Files)", period: "all", status: "new" },
  "wasted-size": {
    title: "Wasted Storage (Duplicates)",
    period: "all",
    status: "duplicate",
    isRemoved: false,
  },
};

export function DownloadsPage() {
  useDownloadsLive();
  const navigate = useNavigate();
  const { data: settings } = useDownloadSettings();
  const trackingEnabled = settings?.trackingEnabled ?? true;

  const [drawer, setDrawer] = useState<DrawerOpenState>({
    isOpen: false,
    mode: "list",
    fileId: null,
    detailView: "details",
    canGoBack: false,
    listPreset: DEFAULT_LIST_PRESET,
  });

  const openListDrawer = (preset: DrawerListPreset) => {
    setDrawer({
      isOpen: true,
      mode: "list",
      fileId: null,
      detailView: "details",
      canGoBack: false,
      listPreset: preset,
    });
  };

  const openDetailDrawer = (
    fileId: string,
    options?: {
      canGoBack?: boolean;
      detailView?: DrawerDetailView;
      listPreset?: DrawerListPreset;
    },
  ) => {
    setDrawer((previous) => ({
      isOpen: true,
      mode: "detail",
      fileId,
      detailView: options?.detailView ?? "details",
      canGoBack: options?.canGoBack ?? false,
      listPreset: options?.listPreset ?? previous.listPreset,
    }));
  };

  const closeDrawer = () => {
    setDrawer((previous) => ({ ...previous, isOpen: false }));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      {/* Header row: title + Configure button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="font-display font-bold text-xl text-[var(--color-text-heading)] leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Downloads
            </h1>
            {trackingEnabled ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-success)] bg-[#f0fdf4] border border-[#bbf7d0] rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] inline-block" />
                Tracking active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] bg-[#f1f5f9] border border-[#e2e8f0] rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1] inline-block" />
                Tracking paused
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Track and manage your downloads.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/downloads/configure')}
          className="flex-shrink-0 mt-1"
        >
          <span className="btn-inner btn-secondary px-3.5 py-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" />
            Configure
          </span>
        </button>
      </div>
      <div className="mt-8 space-y-12">
        <DownloadMetricCards onCardClick={(card) => openListDrawer(PRESET_BY_CARD[card])} />
        
        {/* Recent Activity Section - 2 Column Layout */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Monitor new and duplicate downloads in real time and inspect file-level details quickly.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
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
            <div className="col-span-1">
              <RecentDownloadsFeed
                hideHeading
                onOpenDetail={({ fileId, filename, createdAt }) =>
                  openDetailDrawer(fileId, {
                    canGoBack: true,
                    detailView: "details",
                    listPreset: {
                      title: `File Details: ${filename}`,
                      period: "all",
                      search: filename,
                      date: toIsoDate(createdAt),
                    },
                  })
                }
                onOpenAll={() => openListDrawer(DEFAULT_LIST_PRESET)}
              />
            </div>
          </div>
        </div>
        
        <DownloadHealthBars
          onFilterClick={(target) => openListDrawer(PRESET_BY_HEALTH_TARGET[target])}
        />
        <DuplicateGroups
          onOpenTimeline={({ fileId, filename }) => {
            if (fileId) {
              openDetailDrawer(fileId, {
                canGoBack: false,
                detailView: "timeline",
              });
              return;
            }

            openListDrawer({
              title: "Duplicate Files",
              period: "all",
              status: "duplicate",
              search: filename,
            });
          }}
        />

        {/* Analytics Section - 2 Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          <FileCategories
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
      </div>

      <FileDetailDrawer
        isOpen={drawer.isOpen}
        onClose={closeDrawer}
        initialMode={drawer.mode}
        initialFileId={drawer.fileId}
        initialDetailView={drawer.detailView}
        initialCanGoBack={drawer.canGoBack}
        initialListPreset={drawer.listPreset}
      />
    </div>
  );
}
