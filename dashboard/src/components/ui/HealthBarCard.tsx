const TRACK_CLASS = "bg-[#E5E7EB]";

export interface HealthBarSegment {
  label: string;
  pct: number;
  /** CSS color value used for the bar fill (e.g. "var(--color-success)" or "#16A34A") */
  barColor: string;
  /** Tailwind class for the legend dot (e.g. "bg-[var(--color-success)]") */
  dotClass: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface HealthBarPill {
  label: string;
  value: string;
  /** Hex or CSS color for the pill background */
  bgColor: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface HealthBarCardProps {
  title: string;
  description: string;
  segments: HealthBarSegment[];
  pills: HealthBarPill[];
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Alignment for the legend row. Defaults to "right". */
  legendAlign?: "left" | "right";
  /** Alignment for the pills row. Defaults to "right". */
  pillsAlign?: "left" | "right";
}

export function HealthBarCard({
  title,
  description,
  segments,
  pills,
  isEmpty = false,
  emptyMessage,
  legendAlign = "right",
  pillsAlign = "right",
}: HealthBarCardProps) {
  return (
    <div className="card-metric-glass">
      <h3 className="section-label">{title}</h3>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {description}
      </p>

      {/* Legend */}
      <div
        className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 ${
          legendAlign === "right" ? "justify-end" : "justify-start"
        }`}
        aria-label="Legend"
      >
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.dotClass}`}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">
              {seg.label} {isEmpty ? "—" : `${seg.pct.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>

      {/* Track */}
      <div
        className={`mt-2 mb-3 flex h-3 w-full overflow-hidden rounded-full ${TRACK_CLASS}`}
      >
        {segments.map((seg) =>
          seg.onClick ? (
            <button
              key={seg.label}
              type="button"
              aria-label={
                seg.ariaLabel ?? `${seg.label}: ${seg.pct.toFixed(1)}%`
              }
              className="h-full cursor-pointer transition-all duration-[800ms] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1"
              style={{
                width: `${seg.pct}%`,
                background: seg.barColor,
                transitionTimingFunction: "cubic-bezier(0.0, 0.0, 0.2, 1)",
                minWidth: seg.pct > 0 ? "3px" : "0",
              }}
              onClick={seg.onClick}
            />
          ) : (
            <div
              key={seg.label}
              className="h-full transition-all duration-[800ms]"
              style={{
                width: `${seg.pct}%`,
                background: seg.barColor,
                transitionTimingFunction: "cubic-bezier(0.0, 0.0, 0.2, 1)",
              }}
            />
          ),
        )}
      </div>

      {/* Pills */}
      <div
        className={`flex flex-wrap gap-2 ${pillsAlign === "right" ? "justify-end" : "justify-start"}`}
      >
        {pills.map((pill) => (
          <button
            key={pill.label}
            type="button"
            disabled={pill.disabled}
            onClick={pill.onClick}
            className="rounded-lg px-3 py-1 text-left cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: pill.bgColor }}
          >
            <div className="text-xs text-white/80">{pill.label}</div>
            <div className="text-xs font-medium text-white tabular-nums">
              {pill.value}
            </div>
          </button>
        ))}
      </div>

      {isEmpty && emptyMessage && (
        <p className="mt-4 text-center text-xs italic text-[var(--color-text-ghost)]">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

export function HealthBarCardSkeleton({
  pillCount = 2,
}: {
  pillCount?: number;
}) {
  return (
    <div className="card-metric-glass">
      <div className="skeleton h-3 w-32 rounded" />
      <div className="skeleton mt-1 h-3 w-full max-w-[min(100%,22rem)] rounded" />
      <div className="mt-2 flex justify-end gap-4">
        <div className="flex items-center gap-1.5">
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
          <div className="skeleton h-3 w-14 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
          <div className="skeleton h-3 w-14 rounded" />
        </div>
      </div>
      <div className={`mt-2 mb-3 h-3 w-full rounded-full ${TRACK_CLASS}`} />
      <div className="flex justify-end gap-2">
        {Array.from({ length: pillCount }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
