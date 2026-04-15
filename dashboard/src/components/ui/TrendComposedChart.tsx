import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dropdown } from "./Dropdown";
import { ChartTooltip } from "./ChartTooltip";
import { SkeletonBlock } from "@/components/skeletons/SkeletonBlock";
import { formatTrendChartDayLabel } from "@/utils/formatDuration";

export type TrendPeriod = 7 | 15 | 30;

export interface TrendPoint {
  date: string;
  displayDate: string;
  [key: string]: string | number | null | undefined;
}

export interface TrendSeriesConfig {
  key: string;
  label: string;
  color: string;
}

export interface TrendTooltipRowConfig {
  key: string;
  label: string;
  color: string;
  /** When set, value comes only from datum (row not tied to a plotted series). */
  getDisplayValue?: (datum: TrendPoint) => string | number;
  formatter?: (value: number, datum: TrendPoint | undefined) => string | number;
}

interface TrendComposedChartProps {
  title: string;
  hideHeading?: boolean;
  period: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
  periodOptions?: { value: TrendPeriod; label: string }[];
  data: TrendPoint[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  emptyMessage: string;
  barSeries: TrendSeriesConfig;
  lineSeries: [TrendSeriesConfig, TrendSeriesConfig];
  tooltipRows: TrendTooltipRowConfig[];
  onBarClick?: (day: { date: string; label: string }) => void;
  /** When set, formats Y-axis ticks (e.g. seconds → "2h 15m"). */
  yAxisTickFormatter?: (value: number) => string;
  /** Bar fill opacity (default 0.85). Use ~0.7 when bars dwarf line series. */
  barFillOpacity?: number;
  /** Line stroke width (default 2). */
  lineStrokeWidth?: number;
}

const DEFAULT_PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 15, label: "Last 15 days" },
  { value: 30, label: "Last 30 days" },
];

function ChartSkeleton({ hideHeading = false }: { hideHeading?: boolean }) {
  return (
    <div className="chart-glass w-full p-6 h-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        {!hideHeading ? (
          <SkeletonBlock className="h-4 w-40 rounded" />
        ) : (
          <div />
        )}
        <SkeletonBlock className="h-8 w-32 rounded-md" />
      </div>
      <div className="h-[280px] w-full overflow-hidden rounded-xl">
        <div className="flex h-full items-end gap-2">
          <SkeletonBlock className="h-[42%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[58%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[66%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[74%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[52%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[68%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[80%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[62%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[76%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[54%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[64%] w-full rounded-t-md" />
          <SkeletonBlock className="h-[72%] w-full rounded-t-md" />
        </div>
      </div>
      <div className="mt-6 flex justify-center gap-6">
        <SkeletonBlock className="h-3 w-24 rounded" />
        <SkeletonBlock className="h-3 w-24 rounded" />
        <SkeletonBlock className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}

function isEffectivelyEmpty(data: TrendPoint[], keys: string[]): boolean {
  if (data.length === 0) return true;
  return data.every((row) =>
    keys.every((key) => {
      const value = row[key];
      return typeof value !== "number" || value === 0;
    }),
  );
}

export function TrendComposedChart({
  title,
  hideHeading = false,
  period,
  onPeriodChange,
  periodOptions = DEFAULT_PERIOD_OPTIONS,
  data,
  isLoading,
  isError,
  errorMessage,
  emptyMessage,
  barSeries,
  lineSeries,
  tooltipRows,
  onBarClick,
  yAxisTickFormatter,
  barFillOpacity = 0.85,
  lineStrokeWidth = 2,
}: TrendComposedChartProps) {
  const [line1, line2] = lineSeries;

  if (isLoading) return <ChartSkeleton hideHeading={hideHeading} />;

  if (isError) {
    return (
      <div className="chart-glass w-full p-6 flex items-center justify-center h-[380px]">
        <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p>
      </div>
    );
  }

  const empty = isEffectivelyEmpty(data, [barSeries.key, line1.key, line2.key]);
  if (empty) {
    return (
      <div className="chart-glass w-full p-6 flex flex-col h-[420px]">
        <div className="flex items-center justify-between mb-8">
          {!hideHeading ? (
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#94A3B8]">
              {title}
            </h2>
          ) : (
            <div />
          )}
          <Dropdown<TrendPeriod>
            value={period}
            options={periodOptions}
            onChange={onPeriodChange}
            align="right"
            size="md"
          />
        </div>
        <div className="flex-1 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-inset)] flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  const tooltipContent = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{
      dataKey?: string;
      value?: number;
      payload?: TrendPoint;
    }>;
    label?: string | number;
  }) => {
    if (!active || !payload?.length || label == null) return null;

    const datum = payload[0]?.payload;

    const headerLabel =
      datum?.date != null && typeof datum.date === "string"
        ? formatTrendChartDayLabel(datum.date)
        : String(label);

    const rows = tooltipRows.map((row) => {
      if (row.getDisplayValue) {
        return {
          color: row.color,
          label: row.label,
          value: row.getDisplayValue(datum ?? { date: "", displayDate: "" }),
        };
      }
      const raw = payload.find((p) => p.dataKey === row.key)?.value ?? 0;
      const value = row.formatter ? row.formatter(raw, datum) : raw;
      return {
        color: row.color,
        label: row.label,
        value,
      };
    });

    return (
      <ChartTooltip label={headerLabel} rows={rows} squareIndicatorIndex={0} />
    );
  };

  return (
    <div className="chart-glass w-full p-6 h-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        {!hideHeading ? (
          <h2 className="text-xs font-medium uppercase tracking-widest text-[#94A3B8]">
            {title}
          </h2>
        ) : (
          <div />
        )}

        <Dropdown<TrendPeriod>
          value={period}
          options={periodOptions}
          onChange={onPeriodChange}
          align="right"
          size="md"
        />
      </div>

      <div className="relative w-full flex-1 overflow-hidden rounded-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-60"
          style={{
            backgroundImage: [
              "linear-gradient(to right, rgba(8,145,178,0.05) 1px, transparent 1px)",
              "linear-gradient(to bottom, rgba(8,145,178,0.05) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 0 0",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.35))",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.35))",
          }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          >
            <CartesianGrid
              strokeDasharray="3 6"
              vertical={false}
              stroke="rgba(8,145,178,0.10)"
            />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              dy={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={yAxisTickFormatter ? 72 : undefined}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              tickFormatter={
                yAxisTickFormatter
                  ? (v: number | string) => yAxisTickFormatter(Number(v))
                  : undefined
              }
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ fill: "rgba(8,145,178,0.04)" }}
            />

            <Bar
              dataKey={barSeries.key}
              fill={barSeries.color}
              fillOpacity={barFillOpacity}
              radius={[4, 4, 0, 0]}
              barSize={18}
              cursor={onBarClick ? "pointer" : "default"}
              onClick={(clicked) => {
                if (!onBarClick) return;
                const date = (clicked as { date?: string })?.date;
                const label = (clicked as { displayDate?: string })
                  ?.displayDate;
                if (!date || !label) return;
                onBarClick({ date, label });
              }}
              animationDuration={800}
            />

            <Line
              type="monotone"
              dataKey={line1.key}
              stroke={line1.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: line1.color }}
              animationDuration={800}
              animationEasing="ease-out"
            />

            <Line
              type="monotone"
              dataKey={line2.key}
              stroke={line2.color}
              strokeWidth={lineStrokeWidth}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: line2.color }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center flex-row gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: barSeries.color }}
          />
          <span className="text-xs text-[#64748B]">{barSeries.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: line1.color }}
          />
          <span className="text-xs text-[#64748B]">{line1.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: line2.color }}
          />
          <span className="text-xs text-[#64748B]">{line2.label}</span>
        </div>
      </div>
    </div>
  );
}
