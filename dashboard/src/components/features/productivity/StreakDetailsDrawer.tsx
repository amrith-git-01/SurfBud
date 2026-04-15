import { useEffect, useMemo, useState } from "react";
import { Flame, Globe, X } from "lucide-react";
import { useBrowsingDrawerSessions } from "@/api/useBrowsingDrawer";
import { useBrowsingCategories } from "@/api/useBrowsing";
import { useStreakCalendar } from "@/api/useProductivity";
import { DrawerDetailsSkeleton, DrawerTimelineSkeleton } from "@/components/skeletons/DrawerDetailSkeletons";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { DrawerShell } from "@/components/ui/DrawerShell";
import type { BrowsingSessionRow } from "@/api/browsing.api";
import type { StreakDayStatus, UserStreak } from "@/types/shared/productivity.types";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { formatSessionTimeRangeInZone } from "@/utils/formatSessionTimeRange";

const WINDOW_DAYS = 30;

const STATUS_CLASS: Record<StreakDayStatus, string> = {
  met: "bg-[#16A34A]",
  partial: "bg-[#86EFAC]",
  missed: "bg-[#DC2626]",
  skipped: "bg-[#D97706]",
  inactive: "bg-[rgba(148,163,184,0.2)]",
};

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

interface StreakDetailsDrawerProps {
  isOpen: boolean;
  streak: UserStreak | null;
  onClose: () => void;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00`);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function buildDayRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  const cursor = startOfDay(start);
  const endDate = startOfDay(end);

  while (cursor.getTime() <= endDate.getTime()) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function activeDaysText(activeDays: number[]): string {
  const sorted = [...new Set(activeDays)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if ([1, 2, 3, 4, 5].every((d) => sorted.includes(d)) && !sorted.includes(0) && !sorted.includes(6)) {
    return "Weekdays";
  }
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return "Weekends";
  }
  return sorted.map((d) => DAY_LABELS[d] ?? "").filter(Boolean).join(", ");
}

function todayProgressText(streak: UserStreak): { text: string; tone: string } {
  const minSeconds = streak.minMinutes * 60;
  const todayDay = new Date().getDay();
  const isActiveToday = streak.activeDays.includes(todayDay);

  if (!isActiveToday) {
    return { text: "Today is a rest day", tone: "text-[var(--color-text-muted)]" };
  }

  if (streak.todaySeconds >= minSeconds) {
    return {
      text: `Goal met today: ${formatDurationSeconds(streak.todaySeconds)}`,
      tone: "text-[var(--color-success)]",
    };
  }

  if (streak.todaySeconds > 0) {
    return {
      text: `${formatDurationSeconds(minSeconds - streak.todaySeconds)} left for today`,
      tone: "text-[var(--color-warning)]",
    };
  }

  return { text: "No activity yet today", tone: "text-[var(--color-text-muted)]" };
}

function SessionTimelineItem({
  session,
  index,
  total,
  categoryIcon,
  categoryColor,
  timeZone,
}: {
  session: BrowsingSessionRow;
  index: number;
  total: number;
  categoryIcon?: string;
  categoryColor?: string;
  timeZone: string;
}) {
  const label = session.label?.trim() || session.domain.replace(/^www\./i, "");
  const range = formatSessionTimeRangeInZone(session.startedAt, session.endedAt, timeZone);
  const dateLabel = new Date(session.startedAt).toLocaleDateString();

  const leading = session.domainLogo?.trim() ? (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
      <img src={session.domainLogo.trim()} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
    </span>
  ) : categoryIcon ? (
    <BrowsingCategoryIconBadge iconName={categoryIcon} color={categoryColor ?? "#6b7280"} size="lg" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F9FF] text-[#94A3B8]">
      <Globe className="h-5 w-5" strokeWidth={2} aria-hidden />
    </span>
  );

  return (
    <div className="grid grid-cols-[16px_1fr] items-stretch gap-3">
      <div className="relative flex justify-center">
        {index > 0 ? (
          <span className="absolute top-0 bottom-1/2 left-1/2 w-0.5 -translate-x-1/2 bg-[var(--color-border)]" aria-hidden />
        ) : null}
        {index < total - 1 ? (
          <span className="absolute top-1/2 bottom-[-12px] left-1/2 w-0.5 -translate-x-1/2 bg-[var(--color-border)]" aria-hidden />
        ) : null}
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-primary)] shadow-sm" aria-hidden />
      </div>

      <article className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5">
        <div className="flex items-start gap-3">
          <div className="shrink-0">{leading}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="truncate text-sm font-semibold text-[var(--color-text-heading)]">{label}</p>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-text-body)]">
                {formatDurationSeconds(session.durationSeconds)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{session.domain}</p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              {dateLabel} • {range}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function StreakDetailsDrawer({ isOpen, streak, onClose }: StreakDetailsDrawerProps) {
  const [view, setView] = useState<"overview" | "timeline">("overview");

  useEffect(() => {
    if (isOpen) {
      setView("overview");
    }
  }, [isOpen, streak?._id]);

  // Compute safe date/window values even when `streak` is null so hooks
  // can be called unconditionally and maintain a stable hooks order.
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - (WINDOW_DAYS - 1));

  const streakCreatedAt = streak ? new Date(streak.createdAt) : null;
  const heatmapStartDate = streakCreatedAt ? maxDate(startOfDay(streakCreatedAt), startOfDay(thirtyDaysAgo)) : startOfDay(thirtyDaysAgo);
  const heatmapEndDate = startOfDay(now);
  const timelineFromDate = streakCreatedAt ? maxDate(startOfDay(streakCreatedAt), startOfDay(thirtyDaysAgo)) : startOfDay(thirtyDaysAgo);
  const timelineToDate = now;

  const streakId = streak?._id ?? "";
  const { data: calendarData, isLoading: isCalendarLoading, isError: isCalendarError, refetch: refetchCalendar } =
    useStreakCalendar(streakId, WINDOW_DAYS, {
      enabled: isOpen && streakId.length > 0,
      staleTime: 30_000,
    });

  const sessionsParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      period: "all" as const,
      domain: streak?.domain ?? "",
      sort: "newest" as const,
      from: timelineFromDate.toISOString(),
      to: timelineToDate.toISOString(),
    }),
    [streak?.domain, timelineFromDate, timelineToDate],
  );

  const {
    data: sessionsPage,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    refetch: refetchSessions,
  } = useBrowsingDrawerSessions(sessionsParams, isOpen && Boolean(streak?.domain));

  const { data: categories = [] } = useBrowsingCategories();

  const slugToIcon = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      if (c.slug) m.set(c.slug, c.icon);
    }
    return m;
  }, [categories]);

  const slugToColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      if (c.slug) m.set(c.slug, c.color);
    }
    return m;
  }, [categories]);

  const timelineSessions = useMemo(() => {
    const sessions = sessionsPage?.sessions ?? [];
    return sessions.filter((session) => {
      const startedAt = new Date(session.startedAt).getTime();
      if (Number.isNaN(startedAt)) {
        return false;
      }

      return (
        startedAt >= timelineFromDate.getTime() &&
        startedAt <= timelineToDate.getTime()
      );
    });
  }, [sessionsPage?.sessions, timelineFromDate, timelineToDate]);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const calendarByDate = useMemo(() => {
    const m = new Map<string, { status: StreakDayStatus; seconds: number }>();
    for (const day of calendarData?.calendar ?? []) {
      m.set(day.date, {
        status: day.status as StreakDayStatus,
        seconds: day.seconds,
      });
    }
    return m;
  }, [calendarData?.calendar]);

  const heatmapDays = useMemo(() => {
    const range = buildDayRange(heatmapStartDate, heatmapEndDate);
    return range.map((d) => {
      const dayKey = toDayKey(d);
      const value = calendarByDate.get(dayKey);
      return {
        date: dayKey,
        status: value?.status ?? ("inactive" as StreakDayStatus),
        seconds: value?.seconds ?? 0,
      };
    });
  }, [calendarByDate, heatmapStartDate, heatmapEndDate]);

  const firstHeatmapDay = heatmapDays[0] ?? null;
  const lastHeatmapDay = heatmapDays.length > 0 ? heatmapDays[heatmapDays.length - 1] ?? null : null;

  const firstMonthLabel = firstHeatmapDay
    ? parseDayKey(firstHeatmapDay.date).toLocaleDateString(undefined, { month: "short" })
    : "";
  const lastMonthLabel = lastHeatmapDay
    ? parseDayKey(lastHeatmapDay.date).toLocaleDateString(undefined, { month: "short" })
    : "";

  // Guard after calling hooks so the render path that uses `streak` can remain
  // JSX-only and we don't change the hooks order between renders.
  if (!streak) {
    return null;
  }

  const goalSeconds = streak.minMinutes * 60;
  const isActiveToday = streak.activeDays.includes(new Date().getDay());
  const progressRatio = isActiveToday && goalSeconds > 0
    ? Math.min(streak.todaySeconds / goalSeconds, 1)
    : 0;
  const isGoalMet = isActiveToday && streak.todaySeconds >= goalSeconds;

  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} ariaLabel="Productivity Drawer">
      <div className="flex h-full flex-col bg-white font-sans">
        <header className="border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-[var(--color-text-strong)]">Productivity Drawer</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {streak.label} • {streak.domain}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-page)] hover:text-[var(--color-text-body)]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="border-b border-[var(--color-border)] px-6 py-3">
          <div className="inline-flex rounded-lg border border-[var(--color-border)] p-1">
            <button
              type="button"
              onClick={() => setView("overview")}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "overview" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]",
              ].join(" ")}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "timeline" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]",
              ].join(" ")}
            >
              Timeline
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {view === "overview" ? (
            <>
              {isCalendarLoading ? <DrawerDetailsSkeleton rowCount={5} /> : null}

              {!isCalendarLoading && isCalendarError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--color-danger)]">Could not load streak details.</p>
                  <button
                    type="button"
                    onClick={() => void refetchCalendar()}
                    className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {!isCalendarLoading && !isCalendarError ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[#F8FAFC] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-[var(--color-warning)]" />
                      <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-heading)]">
                        {streak.currentStreak} day streak
                      </p>
                    </div>
                    <p className="mt-2 text-base text-[var(--color-text-body)]">
                      Best: <span className="font-semibold tabular-nums">{streak.longestStreak} day{streak.longestStreak === 1 ? "" : "s"}</span>
                      <span className="mx-2 text-[var(--color-text-muted)]">•</span>
                      Goal: <span className="font-semibold tabular-nums">{streak.minMinutes}m/day</span>
                    </p>
                  </div>

                  <div>
                    <p className="section-label">Today's Progress</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[rgba(148,163,184,0.22)]">
                        <div
                          className={`h-full rounded-full ${isGoalMet ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]"}`}
                          style={{ width: `${progressRatio * 100}%` }}
                        />
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-[var(--color-text-heading)]">
                        {isActiveToday
                          ? `${formatDurationSeconds(streak.todaySeconds)} / ${streak.minMinutes}m${isGoalMet ? " \u2713" : ""}`
                          : "Rest day"}
                      </p>
                    </div>
                    <p className={`mt-2 text-xs font-medium ${todayProgressText(streak).tone}`}>{todayProgressText(streak).text}</p>
                  </div>

                  <div>
                    <p className="section-label">Last {WINDOW_DAYS} Days</p>

                    <div className="mt-1 flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
                      <span>{firstMonthLabel}</span>
                      {lastMonthLabel !== firstMonthLabel ? <span>{lastMonthLabel}</span> : <span />}
                    </div>

                    <div className="mt-2 overflow-x-auto pb-1">
                      <div className="grid w-max grid-flow-col auto-cols-[12px] gap-1">
                      {heatmapDays.map((day, idx) => {
                        const status = (day.status as StreakDayStatus) ?? "inactive";
                        return (
                          <div
                            key={`${day.date}-${idx}`}
                            className={`h-3 w-3 rounded-sm ${STATUS_CLASS[status] ?? STATUS_CLASS.inactive}`}
                            title={`${day.date} • ${status} • ${formatDurationSeconds(day.seconds)}`}
                          />
                        );
                      })}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm bg-[#16A34A]" />
                        Met
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm bg-[#86EFAC]" />
                        Partial
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm bg-[#DC2626]" />
                        Missed
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm bg-[rgba(148,163,184,0.2)]" />
                        Inactive
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[#F8FAFC] px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Active Days</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {streak.activeDays
                        .slice()
                        .sort((a, b) => a - b)
                        .map((day) => (
                          <span
                            key={day}
                            className="rounded-md border border-[var(--color-border)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--color-text-body)]"
                          >
                            {DAY_LABELS[day]}
                          </span>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">{activeDaysText(streak.activeDays)}</p>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {isSessionsLoading ? <DrawerTimelineSkeleton rowCount={5} /> : null}

              {!isSessionsLoading && isSessionsError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--color-danger)]">Could not load timeline sessions.</p>
                  <button
                    type="button"
                    onClick={() => void refetchSessions()}
                    className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {!isSessionsLoading && !isSessionsError && timelineSessions.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--color-text-body)]">No recent sessions for this domain yet.</p>
                </div>
              ) : null}

              {!isSessionsLoading && !isSessionsError ? (
                <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                  Showing sessions from the last {WINDOW_DAYS} days, starting from {timelineFromDate.toLocaleDateString()} (streak creation guard applied).
                </p>
              ) : null}

              {!isSessionsLoading && !isSessionsError && timelineSessions.length > 0 ? (
                <div className="space-y-3">
                  {timelineSessions.map((session, index) => (
                    <SessionTimelineItem
                      key={session._id}
                      session={session}
                      index={index}
                      total={timelineSessions.length}
                      categoryIcon={session.categorySlug ? slugToIcon.get(session.categorySlug) : undefined}
                      categoryColor={session.categorySlug ? slugToColor.get(session.categorySlug) : undefined}
                      timeZone={timeZone}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
