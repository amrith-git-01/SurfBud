import { useMemo, useState } from "react";
import { useBrowsingDailyTimeline } from "@/api/useBrowsing";
import { ContextSwitchStats } from "./ContextSwitchStats";
import type { BrowsingTimelineBlock } from "@/api/browsing.api";
import { formatDurationSeconds } from "@/utils/formatDuration";

/** Spec §9.1 — productive / distracting / neutral / empty */
const BLOCK_BG: Record<
  BrowsingTimelineBlock["productivity"],
  string
> = {
  productive: "rgba(22, 163, 74, 0.6)",
  distracting: "rgba(220, 38, 38, 0.6)",
  neutral: "rgba(148, 163, 184, 0.4)",
  empty: "rgba(148, 163, 184, 0.1)",
};

const AXIS_LABELS = [
  "12AM",
  "3AM",
  "6AM",
  "9AM",
  "12PM",
  "3PM",
  "6PM",
  "9PM",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Must match API `SLOTS_PER_DAY` (30-minute slots). */
const TIMELINE_SLOT_COUNT = 48;
/** Eight 3-hour bands × 6 half-hour slots each. */
const SLOTS_PER_AXIS_LABEL = 6;

function dateStringInTimezone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatSlotRange(
  startIso: string,
  endIso: string,
  timeZone: string,
): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  };
  const a = new Date(startIso);
  const b = new Date(endIso);
  return `${a.toLocaleTimeString(undefined, opts)} – ${b.toLocaleTimeString(undefined, opts)}`;
}

function productivityTitle(
  p: BrowsingTimelineBlock["productivity"],
): string {
  if (p === "empty") return "No activity";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function DailyTimeline() {
  const { data, isLoading, isError, refetch } = useBrowsingDailyTimeline({});
  const [hovered, setHovered] = useState<BrowsingTimelineBlock | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(
    null,
  );

  const blocks = data?.blocks ?? [];
  const timezone = data?.timezone ?? "UTC";
  const dateStr = data?.date ?? "";

  const nowFraction = useMemo(() => {
    if (blocks.length < TIMELINE_SLOT_COUNT || !dateStr) {
      return null as number | null;
    }
    const todayStr = dateStringInTimezone(new Date(), timezone);
    if (dateStr !== todayStr) {
      return null;
    }
    const dayStart = new Date(blocks[0]!.startIso).getTime();
    const frac = (Date.now() - dayStart) / DAY_MS;
    if (frac < 0 || frac > 1) {
      return null;
    }
    return frac;
  }, [blocks, dateStr, timezone]);

  const hasAnyActivity = useMemo(
    () => blocks.some((b) => b.totalSeconds > 0),
    [blocks],
  );

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Today&apos;s browsing pattern
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Active time by 30-minute blocks (local day).
          </p>
        </div>
        <div className="chart-glass w-full p-6">
          <div className="skeleton mb-4 h-10 w-full rounded-lg" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="mt-8 border-t border-[var(--color-border)] pt-8">
            <ContextSwitchStats />
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mb-12">
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Today&apos;s browsing pattern
          </h3>
        </div>
        <div className="chart-glass w-full px-4 py-6 text-center">
          <p className="text-sm text-[var(--color-danger)]">
            Could not load daily timeline
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

  const gridCols = {
    gridTemplateColumns: `repeat(${TIMELINE_SLOT_COUNT}, minmax(0, 1fr))`,
  };

  return (
    <section className="mb-12">
      <div className="mb-4 px-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Today&apos;s browsing pattern
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          30-minute blocks colored by dominant productivity type ({timezone}).
        </p>
      </div>

      <div className="chart-glass w-full p-6">
        <div className="relative w-full">
          <div className="grid h-10 w-full gap-px" style={gridCols}>
            {blocks.map((b) => (
              <button
                key={b.index}
                type="button"
                className="min-h-[40px] min-w-0 rounded-sm outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                style={{ backgroundColor: BLOCK_BG[b.productivity] }}
                onMouseEnter={(e) => {
                  setHovered(b);
                  setPointer({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setPointer({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  setPointer(null);
                }}
                aria-label={`Slot ${b.index + 1}`}
              />
            ))}
          </div>

          {nowFraction != null ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bottom-0"
              aria-hidden
            >
              <div
                className="absolute top-0 h-full w-px bg-[var(--color-primary)] opacity-80"
                style={{
                  left: `${nowFraction * 100}%`,
                  boxShadow: "0 0 6px rgba(8,145,178,0.45)",
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-px grid h-4 w-full gap-px" style={gridCols}>
          {AXIS_LABELS.map((label, i) => (
            <div
              key={label}
              className="text-center text-[10px] text-[var(--color-text-muted)] tabular-nums"
              style={{
                gridColumn: `${i * SLOTS_PER_AXIS_LABEL + 1} / span ${SLOTS_PER_AXIS_LABEL}`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-text-body)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: BLOCK_BG.productive }}
            />
            Productive
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: BLOCK_BG.distracting }}
            />
            Distracting
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: BLOCK_BG.neutral }}
            />
            Neutral
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: BLOCK_BG.empty }}
            />
            No activity
          </span>
        </div>

        {!hasAnyActivity ? (
          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            No browsing data yet today.
            <br />
            Browse with SurfBud active to see your pattern.
          </p>
        ) : null}

        <div className="mt-8 border-t border-[var(--color-border)] pt-8">
          <ContextSwitchStats />
        </div>
      </div>

      {hovered && pointer ? (
        <div
          className="pointer-events-none fixed z-[120] max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-left text-xs shadow-lg"
          style={{
            left: Math.min(pointer.x + 12, typeof window !== "undefined" ? window.innerWidth - 280 : 0),
            top: pointer.y + 12,
          }}
        >
          <p className="font-semibold text-[var(--color-text-heading)]">
            {formatSlotRange(hovered.startIso, hovered.endIso, timezone)}
          </p>
          <div className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
            {hovered.domains.length === 0 ? (
              <p className="text-[var(--color-text-muted)]">No activity</p>
            ) : (
              <>
                {hovered.domains.map((d) => (
                  <div
                    key={d.domain}
                    className="flex justify-between gap-4 tabular-nums"
                  >
                    <span className="truncate text-[var(--color-text-body)]">
                      {d.domain}
                    </span>
                    <span className="shrink-0 text-[var(--color-text-heading)]">
                      {formatDurationSeconds(d.seconds)}
                    </span>
                  </div>
                ))}
                <p className="mt-2 text-[var(--color-text-muted)]">
                  {productivityTitle(hovered.productivity)}
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
