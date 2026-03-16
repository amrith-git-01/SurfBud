import {
  CalendarDays,
  CalendarRange,
  Download,
  Files,
  HardDrive,
} from "lucide-react";
import { useDownloadStats } from "../../../api/useDownloads";
import { MetricCard } from "../../ui/MetricCard";
import { formatBytes } from "../../../utils/formatBytes";

interface DownloadMetricCardsProps {
  onCardClick?: (card: "today" | "week" | "month" | "total" | "wasted") => void;
}

export function DownloadMetricCards({ onCardClick }: DownloadMetricCardsProps) {
  const { data: metrics, isLoading, isError, refetch } = useDownloadStats();

  if (isError) {
    return (
      <section className="mb-12">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Overview Cards</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Snapshot of download volume, duplicate count, and storage impact.
          </p>
        </div>
        <div
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
          style={{ boxShadow: "var(--shadow-glass)" }}
        >
          <p className="text-sm text-[var(--color-danger)]">
            Could not load overview
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
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
    <section className="mb-12">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Overview Cards</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Snapshot of download volume, duplicate count, and storage impact.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="TODAY'S DOWNLOADS"
          icon={<Download size={18} strokeWidth={2} />}
          value={m.todayCount}
          delta={toDelta(m.todayCount - m.prevTodayCount, "vs yesterday")}
          skeleton={isLoading}
          onClick={() => onCardClick?.("today")}
        />
        <MetricCard
          label="THIS WEEK"
          icon={<CalendarDays size={18} strokeWidth={2} />}
          value={m.weekCount}
          delta={toDelta(m.weekCount - m.prevWeekCount, "vs last week")}
          skeleton={isLoading}
          onClick={() => onCardClick?.("week")}
        />
        <MetricCard
          label="THIS MONTH"
          icon={<CalendarRange size={18} strokeWidth={2} />}
          value={m.monthCount}
          delta={toDelta(m.monthCount - m.prevMonthCount, "vs last month")}
          skeleton={isLoading}
          onClick={() => onCardClick?.("month")}
        />
        <MetricCard
          label="TOTAL FILES"
          icon={<Files size={18} strokeWidth={2} />}
          value={m.totalNew + m.totalDuplicates}
          subLine={
            <span>
              <span className="text-[#16A34A]">{m.totalNew} new</span>
              <span className="text-[#94A3B8]"> · </span>
              <span className="text-[#EA580C]">{m.totalDuplicates} dup</span>
            </span>
          }
          skeleton={isLoading}
          onClick={() => onCardClick?.("total")}
        />
        <MetricCard
          label="STORAGE WASTED"
          icon={<HardDrive size={18} strokeWidth={2} />}
          value={formatBytes(m.duplicateSize)}
          subLine={<span className="text-[#0891B2]">all time</span>}
          skeleton={isLoading}
          onClick={() => onCardClick?.("wasted")}
        />
      </div>
    </section>
  );
}

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
