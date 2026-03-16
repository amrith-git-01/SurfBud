export interface ChartTooltipRow {
  color: string;
  label: string;
  value: number;
}

export interface ChartTooltipProps {
  /** Header label (e.g. date "Mar 8") */
  label: string;
  /** Data rows: indicator color, row label, value */
  rows: ChartTooltipRow[];
  /** Optional: use square indicator for first row (e.g. Total = bar), circle for rest */
  squareIndicatorIndex?: number;
}

export function ChartTooltip({
  label,
  rows,
  squareIndicatorIndex = 0,
}: ChartTooltipProps) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5 bg-[var(--color-bg-card)] border-[var(--color-border)]"
      style={{
        boxShadow: "0 8px 25px rgba(8,145,178,0.10)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <p className="text-xs font-semibold text-[var(--color-text-strong)] mb-2">
        {label}
      </p>
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <div key={row.label} className="flex items-center">
            <div
              className={
                index === squareIndicatorIndex
                  ? "w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                  : "w-2 h-2 rounded-full mr-2 ml-[1px] flex-shrink-0"
              }
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="text-xs text-[var(--color-text-secondary)] flex-1">
              {row.label}
            </span>
            <span
              className="text-xs font-semibold tabular-nums ml-4"
              style={{ color: row.color }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
