import { Crown, Globe, Sparkles, Target, Timer } from "lucide-react";
import { useBrowsingStats } from "@/api/useBrowsing";
import { MetricCard } from "@/components/ui/MetricCard";
import { toCountDelta, toDurationDelta } from "@/utils/browsingMetricDeltas";
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

export function BrowsingOverviewCards() {
  const { data: metrics, isLoading, isError, refetch } = useBrowsingStats();

  if (isError) {
    return (
      <section aria-labelledby="ext-browsing-overview-heading">
        <h2
          id="ext-browsing-overview-heading"
          className="text-xs font-semibold text-[var(--color-text-heading)]"
        >
          Overview
        </h2>
        <p className="section-description mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          Today&apos;s active time, how many sites you visited, focus score, and longest single session.
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

  const t = metrics?.today;
  const p = metrics?.prev;

  const activeTimeDelta =
    t && p ? toDurationDelta(t.totalActiveTime, p.todayTotalTime) : undefined;

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
        <span className="text-xs font-semibold text-[#94A3B8]">/100</span>
      </>
    ) : (
      "—"
    );

  const timeOnlineValue =
    t?.totalActiveTime && t.totalActiveTime > 0
      ? formatDurationSeconds(t.totalActiveTime)
      : "0m";

  const isLongestSessionEmpty =
    !t?.longestSessionStart ||
    !t?.longestSessionEnd ||
    (t?.longestSession ?? 0) <= 0;

  const longestSessionValue = isLongestSessionEmpty
    ? "—"
    : formatDurationSeconds(t?.longestSession ?? 0);

  const longestSessionSubLine = isLongestSessionEmpty ? undefined : rangeLine;

  return (
    <section aria-labelledby="ext-browsing-overview-heading">
      <h2
        id="ext-browsing-overview-heading"
        className="text-xs font-semibold text-[var(--color-text-heading)]"
      >
        Overview
      </h2>
      <p className="section-description mt-0.5 text-[11px] text-[var(--color-text-muted)]">
        Today&apos;s active time, how many sites you visited, focus score, and longest single session.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCard
          compact
          label="TIME ONLINE"
          icon={<Timer size={14} strokeWidth={2} />}
          value={timeOnlineValue}
          delta={activeTimeDelta}
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="SITES VISITED"
          icon={<Globe size={14} strokeWidth={2} />}
          value={t?.sitesVisited ?? 0}
          delta={sitesDelta}
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="TOP SITE"
          icon={<Crown size={14} strokeWidth={2} />}
          value={topLabel ?? "—"}
          subLine={
            topDomain ? (
              <span className="truncate text-[#64748B]">{topDomain}</span>
            ) : undefined
          }
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="FOCUS SCORE"
          icon={<Target size={14} strokeWidth={2} />}
          value={focusValue}
          delta={focusDelta}
          skeleton={isLoading}
        />
        <MetricCard
          compact
          label="LONGEST SESSION"
          icon={<Sparkles size={14} strokeWidth={2} />}
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
    </section>
  );
}
