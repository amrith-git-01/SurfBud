import {
  Crown,
  Globe,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { useBrowsingMetrics } from "@/api/useBrowsing";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  toCountDelta,
  toDurationDelta,
} from "@/utils/browsingMetricDeltas";
import { formatDurationSeconds } from "@/utils/formatDuration";

function formatSessionTimeRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

export function BrowsingMetricCards() {
  const { data: metrics, isLoading, isError, refetch } = useBrowsingMetrics();

  if (isError) {
    return (
      <section className="mb-12">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Overview Cards</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Snapshot of time online, sites visited, focus, and top site for today.
          </p>
        </div>
        <div
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
          style={{ boxShadow: "var(--shadow-glass)" }}
        >
          <p className="text-sm text-[var(--color-danger)]">
            Could not load browsing metrics
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const t = metrics?.today;
  const p = metrics?.prev;

  const activeTimeDelta =
    t && p
      ? toDurationDelta(t.totalActiveTime, p.todayTotalTime)
      : undefined;

  const sitesDelta =
    t && p
      ? toCountDelta(t.sitesVisited - p.todaySitesVisited, "vs yesterday")
      : undefined;

  const focusDelta =
    t &&
    p &&
    t.focusScore !== null &&
    t.focusScore !== undefined &&
    p.todayFocusScore !== null &&
    p.todayFocusScore !== undefined
      ? toCountDelta(t.focusScore - p.todayFocusScore, "vs yesterday")
      : undefined;

  const longestDelta =
    t && p
      ? toDurationDelta(t.longestSession, p.todayLongestSession)
      : undefined;

  const topLabel = t?.topSiteLabel?.trim() || null;
  const topDomain = t?.topSite?.trim() || null;
  const rangeLine = formatSessionTimeRange(
    t?.longestSessionStart,
    t?.longestSessionEnd,
  );

  const focusValue =
    t?.focusScore !== null && t?.focusScore !== undefined ? (
      <>
        <span className="text-[#0F172A]">{t.focusScore}</span>
        <span className="text-lg font-semibold text-[#94A3B8]">/100</span>
      </>
    ) : (
      "—"
    );

  const timeOnlineValue =
    t?.totalActiveTime && t.totalActiveTime > 0
      ? formatDurationSeconds(t.totalActiveTime)
      : "0m";

  const isLongestSessionEmpty =
    !t?.longestSessionStart || !t?.longestSessionEnd || (t?.longestSession ?? 0) <= 0;

  const longestSessionValue = isLongestSessionEmpty
    ? "—"
    : formatDurationSeconds(t?.longestSession ?? 0);

  const longestSessionSubLine = isLongestSessionEmpty ? undefined : rangeLine;

  return (
    <section className="mb-12">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Overview Cards</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Snapshot of time online, sites visited, focus, and top site for today.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="TIME ONLINE"
          icon={<Timer size={18} strokeWidth={2} />}
          value={timeOnlineValue}
          delta={activeTimeDelta}
          skeleton={isLoading}
        />
        <MetricCard
          label="SITES VISITED"
          icon={<Globe size={18} strokeWidth={2} />}
          value={t?.sitesVisited ?? 0}
          delta={sitesDelta}
          skeleton={isLoading}
        />
        <MetricCard
          label="TOP SITE"
          icon={<Crown size={18} strokeWidth={2} />}
          value={topLabel ?? "—"}
          subLine={
            topDomain ? (
              <span className="text-[#64748B]">{topDomain}</span>
            ) : undefined
          }
          skeleton={isLoading}
        />
        <MetricCard
          label="FOCUS SCORE"
          icon={<Target size={18} strokeWidth={2} />}
          value={focusValue}
          delta={focusDelta}
          skeleton={isLoading}
        />
        <MetricCard
          label="LONGEST SESSION"
          icon={<Sparkles size={18} strokeWidth={2} />}
          value={longestSessionValue}
          delta={isLongestSessionEmpty ? undefined : longestDelta}
          subLine={
            longestSessionSubLine ? (
              <span className="text-[#64748B]">{longestSessionSubLine}</span>
            ) : undefined
          }
          skeleton={isLoading}
        />
      </div>
      {!isLoading && !metrics && (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          No browsing metrics yet. Use the extension and sync a batch — stats
          appear after the worker processes sessions.
        </p>
      )}
    </section>
  );
}
