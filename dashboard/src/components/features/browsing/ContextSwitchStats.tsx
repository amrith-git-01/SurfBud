import { Clock, Focus, GitBranch, Orbit } from "lucide-react";
import { useBrowsingStats } from "@/api/useBrowsing";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  avgSessionSeconds,
  effectiveSessionCountForAvg,
  toCountDelta,
  toDurationDelta,
} from "@/utils/browsingMetricDeltas";
import { formatDurationSeconds } from "@/utils/formatDuration";

function formatSessionCount(n: number): string {
  return `${n} ${n === 1 ? "session" : "sessions"}`;
}

function formatScatteredPeriods(n: number): string {
  return `${n} ${n === 1 ? "period" : "periods"}`;
}

export function ContextSwitchStats() {
  const { data: metrics, isLoading, isError, refetch } = useBrowsingStats();

  if (isError) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 px-4 py-3 text-sm text-[var(--color-danger)]">
        Could not load context stats.{" "}
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const t = metrics?.today;
  const p = metrics?.prev;

  const prevContext = p?.todayContextSwitches ?? 0;
  const prevSessionCount = p?.todaySessionCount ?? 0;
  const prevDeep = p?.todayDeepFocusSessions ?? 0;
  const prevScattered = p?.todayScatteredPeriods ?? 0;
  const prevTotalTime = p?.todayTotalTime ?? 0;

  const switches = t?.contextSwitches ?? 0;
  const totalActiveTime = t?.totalActiveTime ?? 0;
  const storedSessionCount = t?.sessionCount ?? 0;

  const sessionCount = effectiveSessionCountForAvg({
    totalActiveTimeSeconds: totalActiveTime,
    storedSessionCount,
    contextSwitches: switches,
  });

  const prevEffectiveSessionCount = effectiveSessionCountForAvg({
    totalActiveTimeSeconds: prevTotalTime,
    storedSessionCount: prevSessionCount,
    contextSwitches: prevContext,
  });

  const prevAvgSeconds = avgSessionSeconds(
    prevTotalTime,
    prevEffectiveSessionCount,
  );

  const avgSeconds = avgSessionSeconds(totalActiveTime, sessionCount);
  const deep = t?.deepFocusSessions ?? 0;
  const scattered = t?.scatteredPeriods ?? 0;

  const switchesDelta =
    t && p && switches !== prevContext
      ? toCountDelta(switches - prevContext, "vs yesterday")
      : undefined;

  const switchesSubLine =
    t && p && switches === prevContext ? (
      <span className="text-[#94A3B8]">same vs yesterday</span>
    ) : undefined;

  const avgDelta =
    t && p && sessionCount > 0 && prevEffectiveSessionCount > 0
      ? avgSeconds !== prevAvgSeconds
        ? toDurationDelta(avgSeconds, prevAvgSeconds)
        : undefined
      : t && p && sessionCount > 0 && prevEffectiveSessionCount === 0
        ? toDurationDelta(avgSeconds, 0)
        : undefined;

  const avgSubLine =
    t &&
    p &&
    sessionCount > 0 &&
    prevEffectiveSessionCount > 0 &&
    avgSeconds === prevAvgSeconds ? (
      <span className="text-[#94A3B8]">same vs yesterday</span>
    ) : undefined;

  const deepDelta =
    t && p && deep !== prevDeep
      ? toCountDelta(deep - prevDeep, "vs yesterday")
      : undefined;

  const scatteredDelta =
    t && p && scattered !== prevScattered
      ? toCountDelta(scattered - prevScattered, "vs yesterday")
      : undefined;

  const avgValue =
    sessionCount > 0 ? formatDurationSeconds(avgSeconds) : "—";

  const deepSubLine =
    t && p && deep === prevDeep ? (
      <span className="text-[#94A3B8]">same vs yesterday</span>
    ) : undefined;

  const scatteredSubLine =
    t && p && scattered === prevScattered ? (
      <span className="text-[#94A3B8]">same vs yesterday</span>
    ) : undefined;

  return (
    <div>
      <div className="mb-4 px-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Context switches & focus
        </h4>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Today&apos;s switching behavior vs yesterday (local day).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Context switches"
          title="Context switches — number of domain changes today (micro-sessions excluded)."
          icon={<GitBranch size={18} strokeWidth={2} />}
          value={switches}
          delta={switchesDelta}
          subLine={switchesSubLine}
          skeleton={isLoading}
        />
        <MetricCard
          label="Avg session"
          title="Average session — total active time divided by number of sessions today."
          icon={<Clock size={18} strokeWidth={2} />}
          value={avgValue}
          delta={avgDelta}
          subLine={avgSubLine}
          skeleton={isLoading}
        />
        <MetricCard
          label="Deep focus"
          title="Deep focus — sessions of 30 minutes or longer."
          icon={<Focus size={18} strokeWidth={2} />}
          value={formatSessionCount(deep)}
          delta={deepDelta}
          subLine={deepSubLine}
          skeleton={isLoading}
        />
        <MetricCard
          label="Scattered"
          title="Scattered — local hours where you had 10 or more domain switches."
          icon={<Orbit size={18} strokeWidth={2} />}
          value={formatScatteredPeriods(scattered)}
          delta={scatteredDelta}
          subLine={scatteredSubLine}
          skeleton={isLoading}
        />
      </div>
      {!isLoading && !metrics ? (
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          No browsing metrics yet — stats appear after sessions sync.
        </p>
      ) : null}
    </div>
  );
}
