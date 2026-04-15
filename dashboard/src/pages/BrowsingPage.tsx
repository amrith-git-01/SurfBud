import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useBrowsingSettings } from "@/api/useBrowsing";
import { Button } from "@/components/ui/Button";
import { TrackingStatusBadge } from "@/components/ui/TrackingStatusBadge";
import { BrowsingCategories } from "@/components/features/browsing/BrowsingCategories";
import { DailyTimeline } from "@/components/features/browsing/DailyTimeline";
import { BrowsingDrawer } from "@/components/features/browsing/BrowsingDrawer";
import { BrowsingHealthBar } from "@/components/features/browsing/BrowsingHealthBar";
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
    <div className="productivity-configure-shell min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-10">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="section-title-display text-3xl font-bold tracking-tight text-[var(--color-text-heading)] md:text-4xl">
                Browsing
              </h1>
              <TrackingStatusBadge enabled={trackingEnabled} />
            </div>
            <p className="section-description mt-2 max-w-xl text-sm text-[var(--color-text-muted)] md:text-[13px]">
              See where your time goes: sessions, top sites, trends, and how
              your day breaks down.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            hoverEffect="flat"
            className="productivity-outline-pill shrink-0"
            onClick={() => navigate("/browsing/configure")}
          >
            <Settings className="h-3.5 w-3.5" />
            Configure
          </Button>
        </header>

        <div className="flex flex-col gap-8 md:gap-10">
          {/* 1 — Overview */}
          <section aria-labelledby="browsing-overview-heading">
            <h2
              id="browsing-overview-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Overview
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Today at a glance: active time, sites visited, focus score, and
              your longest single session.
            </p>
            <div className="mt-4">
              <BrowsingMetricCards
                hideSectionHeader
                onOpenDrawer={openDrawer}
              />
            </div>
          </section>

          {/* 2 — Daily pattern */}
          <section aria-labelledby="browsing-daily-heading">
            <h2
              id="browsing-daily-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Daily pattern
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Half-hour slots for today plus how often you switch context
              between domains.
            </p>
            <div className="mt-4">
              <DailyTimeline hideSectionHeader onOpenDrawer={openDrawer} />
            </div>
          </section>

          {/* 3 — Recent activity */}
          <section aria-labelledby="browsing-recent-heading">
            <h2
              id="browsing-recent-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Recent activity
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Compare activity over the period you pick, with the latest
              sessions listed beside the chart.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
              <div className="min-h-0 lg:col-span-2">
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
              <div className="min-h-0 lg:col-span-1">
                <RecentBrowsingFeed
                  hideHeading
                  onOpenDrawer={openDrawer}
                  onOpenAll={() => openDrawer({ type: "all-sessions" })}
                />
              </div>
            </div>
          </section>

          {/* 4 — Productivity health */}
          <section aria-labelledby="browsing-health-heading">
            <h2
              id="browsing-health-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Productivity health
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              How your browsing time splits between productive, distracting, and
              neutral. Click any segment to explore those sessions.
            </p>
            <div className="mt-4">
              <BrowsingHealthBar onOpenDrawer={openDrawer} />
            </div>
          </section>

          {/* 5 — Analytics */}
          <section aria-labelledby="browsing-analytics-heading">
            <h2
              id="browsing-analytics-heading"
              className="text-sm font-semibold text-[var(--color-text-heading)]"
            >
              Analytics
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Which domains and site categories use the most time. Each panel
              has its own date range control.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <TopSitesList
                hideHeading
                onOpenDrawer={openDrawer}
                onTotalClick={() => openDrawer({ type: "all-sessions" })}
              />
              <BrowsingCategories
                hideHeading
                onOpenDrawer={openDrawer}
                onTotalClick={() => openDrawer({ type: "all-sessions" })}
              />
            </div>
          </section>
        </div>

        <BrowsingDrawer
          isOpen={drawer.isOpen}
          trigger={drawer.trigger}
          onClose={closeDrawer}
        />
      </div>
    </div>
  );
}
