import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useBrowsingSettings } from "@/api/useBrowsing";
import { BrowsingCategories } from "@/components/features/browsing/BrowsingCategories";
import { DailyTimeline } from "@/components/features/browsing/DailyTimeline";
import { BrowsingDrawer } from "@/components/features/browsing/BrowsingDrawer";
import { BrowsingMetricCards } from "@/components/features/browsing/BrowsingMetricCards";
import { BrowsingTrendChart } from "@/components/features/browsing/BrowsingTrendChart";
import { RecentBrowsingFeed } from "@/components/features/browsing/RecentBrowsingFeed";
import { TopSitesList } from "@/components/features/browsing/TopSitesList";
import type { BrowsingDrawerTrigger } from "@/components/features/browsing/browsingDrawer.types";

export function BrowsingPage() {
  const navigate = useNavigate();
  const { data: settings } = useBrowsingSettings();
  const trackingEnabled = settings?.trackingEnabled ?? true;

  const [drawer, setDrawer] = useState<{
    isOpen: boolean;
    trigger: BrowsingDrawerTrigger | null;
  }>({ isOpen: false, trigger: null });

  const openDrawer = (next: BrowsingDrawerTrigger) => {
    setDrawer({ isOpen: true, trigger: next });
  };

  const closeDrawer = () => {
    setDrawer((d) => ({ ...d, isOpen: false }));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="font-display font-bold text-xl text-[var(--color-text-heading)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Browsing
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
            Track and understand your browsing habits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/browsing/configure")}
          className="flex-shrink-0 mt-1"
        >
          <span className="btn-inner btn-secondary px-3.5 py-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" />
            Configure
          </span>
        </button>
      </div>

      <div className="mt-8 space-y-12">
        <BrowsingMetricCards onOpenDrawer={openDrawer} />
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Recent activity
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Your browsing trend over the selected period, with recent site
              sessions beside it.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <BrowsingTrendChart
                hideHeading
                onDayClick={(day) =>
                  openDrawer({
                    type: "chart-bar",
                    date: day.date,
                    formattedDate: day.label,
                  })
                }
              />
            </div>
            <div className="col-span-1">
              <RecentBrowsingFeed
                hideHeading
                onOpenDrawer={openDrawer}
                onOpenAll={() => openDrawer({ type: "all-sessions" })}
              />
            </div>
          </div>
        </div>

        {/* Same 50/50 analytics grid pattern as Downloads (File Analytics + Sources) */}
        <div className="grid grid-cols-2 gap-6">
          <TopSitesList
            onOpenDrawer={openDrawer}
            onTotalClick={() => openDrawer({ type: "all-sessions" })}
          />
          <BrowsingCategories
            onOpenDrawer={openDrawer}
            onTotalClick={() => openDrawer({ type: "all-sessions" })}
          />
        </div>

        <DailyTimeline onOpenDrawer={openDrawer} />
      </div>

      <BrowsingDrawer
        isOpen={drawer.isOpen}
        trigger={drawer.trigger}
        onClose={closeDrawer}
      />
    </div>
  );
}
