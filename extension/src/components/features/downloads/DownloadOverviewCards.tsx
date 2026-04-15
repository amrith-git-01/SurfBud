import {
  CalendarDays,
  CalendarRange,
  Download,
  Files,
  HardDrive,
} from "lucide-react";
import { useDownloadStats } from "@/api/useDownloads";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatBytes } from "@/utils/formatBytes";

function toDelta(
  difference: number,
  suffix: string,
): { direction: "up" | "down"; text: string } {
  if (difference >= 0) {
    return {
      direction: "up",
      text: `${Math.abs(difference)} ${suffix}`,
    };
  }

  return {
    direction: "down",
    text: `${Math.abs(difference)} ${suffix}`,
  };
}

export function DownloadOverviewCards() {
  const { data: metrics, isLoading, isError, refetch } = useDownloadStats();

  if (isError) {
    return (
      <section aria-labelledby="ext-downloads-overview-heading">
        <h2
          id="ext-downloads-overview-heading"
          className="text-xs font-semibold text-[var(--color-text-heading)]"
        >
          Overview
        </h2>
        <p className="section-description mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          Download counts for recent periods plus how many files are new versus duplicate and wasted space.
        </p>
        <div
          className="mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
          style={{ boxShadow: "var(--shadow-glass)" }}
        >
          <p className="text-xs text-[var(--color-danger)]">Could not load overview</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const m = metrics ?? {
    todayCount: 0,
    prevTodayCount: 0,
    weekCount: 0,
    prevWeekCount: 0,
    monthCount: 0,
    prevMonthCount: 0,
    totalNew: 0,
    totalDuplicates: 0,
    duplicateSize: 0,
  };

  return (
    <section aria-labelledby="ext-downloads-overview-heading">
      <h2
        id="ext-downloads-overview-heading"
        className="text-xs font-semibold text-[var(--color-text-heading)]"
      >
        Overview
      </h2>
      <p className="section-description mt-0.5 text-[11px] text-[var(--color-text-muted)]">
        Download counts for recent periods plus how many files are new versus duplicate and wasted space.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCard
          compact
          label="TODAY'S DOWNLOADS"
          icon={<Download size={14} strokeWidth={2} />}
          value={m.todayCount}
          delta={toDelta(m.todayCount - m.prevTodayCount, "vs yesterday")}
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="THIS WEEK"
          icon={<CalendarDays size={14} strokeWidth={2} />}
          value={m.weekCount}
          delta={toDelta(m.weekCount - m.prevWeekCount, "vs last week")}
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="THIS MONTH"
          icon={<CalendarRange size={14} strokeWidth={2} />}
          value={m.monthCount}
          delta={toDelta(m.monthCount - m.prevMonthCount, "vs last month")}
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="TOTAL FILES"
          icon={<Files size={14} strokeWidth={2} />}
          value={m.totalNew + m.totalDuplicates}
          subLine={
            <span>
              <span className="text-[#16A34A]">{m.totalNew} new</span>
              <span className="text-[#94A3B8]"> · </span>
              <span className="text-[#EA580C]">{m.totalDuplicates} dup</span>
            </span>
          }
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="STORAGE WASTED"
          icon={<HardDrive size={14} strokeWidth={2} />}
          value={formatBytes(m.duplicateSize)}
          subLine={<span className="text-[#0891B2]">all time</span>}
          skeleton={isLoading}
        />
      </div>
    </section>
  );
}
