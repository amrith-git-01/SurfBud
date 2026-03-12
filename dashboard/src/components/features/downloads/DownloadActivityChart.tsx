import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDownloadTrend } from "../../../api/useDownloads";
import { Dropdown } from "../../ui/Dropdown";
import { ChartTooltip } from "../../ui/ChartTooltip";

type Period = 7 | 15 | 30;

interface DownloadActivityChartProps {
  hideHeading?: boolean;
  onDayClick?: (day: { date: string; label: string }) => void;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 15, label: "Last 15 days" },
  { value: 30, label: "Last 30 days" },
];

function ChartSkeleton() {
  return (
    <div className="chart-glass w-full p-6 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-4 w-40 bg-[var(--color-border)] rounded"></div>
        <div className="h-8 w-32 bg-[var(--color-border)] rounded-md"></div>
      </div>
      <div className="h-[280px] w-full bg-[var(--color-bg-inset)] rounded-xl"></div>
      <div className="mt-6 flex justify-center gap-6">
        <div className="h-3 w-24 bg-[var(--color-border)] rounded"></div>
        <div className="h-3 w-24 bg-[var(--color-border)] rounded"></div>
        <div className="h-3 w-24 bg-[var(--color-border)] rounded"></div>
      </div>
    </div>
  );
}

interface TooltipPayloadItem {
  dataKey?: string;
  value?: number;
}

function DownloadActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length || label == null) return null;

  const total = payload.find((p) => p.dataKey === "total")?.value ?? 0;
  const newFiles = payload.find((p) => p.dataKey === "newFiles")?.value ?? 0;
  const duplicates =
    payload.find((p) => p.dataKey === "duplicates")?.value ?? 0;

  return (
    <ChartTooltip
      label={label}
      rows={[
        { color: "#0891B2", label: "Total", value: total },
        { color: "#16A34A", label: "New Files", value: newFiles },
        { color: "#EA580C", label: "Duplicates", value: duplicates },
      ]}
      squareIndicatorIndex={-1}
    />
  );
}

function CustomLegend() {
  return (
    <div className="flex justify-center flex-row gap-6 mt-6">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2]" />
        <span className="text-xs text-[#64748B]">Total Downloads</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
        <span className="text-xs text-[#64748B]">New Files</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
        <span className="text-xs text-[#64748B]">Duplicates</span>
      </div>
    </div>
  );
}

export function DownloadActivityChart({
  hideHeading = false,
  onDayClick,
}: DownloadActivityChartProps) {
  const [period, setPeriod] = useState<Period>(7);
  const { data: trendData, isLoading, isError } = useDownloadTrend(period);

  if (isLoading) return <ChartSkeleton />;

  if (isError) {
    return (
      <div className="chart-glass w-full p-6 flex items-center justify-center h-[380px]">
        <p className="text-sm text-[var(--color-danger)]">
          Could not load activity chart
        </p>
      </div>
    );
  }

  // Map dates like "2026-03-01" to "Mar 1" for the XAxis, matching UI spec
  const formattedData = (trendData ?? []).map((bucket) => {
    const d = new Date(bucket.date);
    // Be careful with timezone shifts here; assuming UTC for simple presentation
    const shortDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return { ...bucket, displayDate: shortDate };
  });

  return (
    <div className="chart-glass w-full p-6 h-[420px] flex flex-col">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        {!hideHeading && (
          <h2 className="text-xs font-medium uppercase tracking-widest text-[#94A3B8]">
            DOWNLOAD ACTIVITY
          </h2>
        )}
        {hideHeading && <div />}

        {/* Period Selector */}
        <Dropdown<Period>
          value={period}
          options={PERIOD_OPTIONS}
          onChange={setPeriod}
          align="right"
          size="md"
        />
      </div>

      {/* Chart Area */}
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
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.35))",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.35))",
          }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={formattedData}
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
              tick={{ fontSize: 11, fill: "#94A3B8" }}
            />
            <Tooltip
              content={<DownloadActivityTooltip />}
              cursor={{ fill: "rgba(8,145,178,0.04)" }}
            />

            {/* Total Bar */}
            <Bar
              dataKey="total"
              fill="#0891B2"
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              barSize={18}
              cursor={onDayClick ? "pointer" : "default"}
              onClick={(data) => {
                if (!onDayClick) return;
                const date = (data as { date?: string })?.date;
                const label = (data as { displayDate?: string })?.displayDate;
                if (!date || !label) return;
                onDayClick({ date, label });
              }}
              animationDuration={800}
            />

            {/* New Files Line */}
            <Line
              type="monotone"
              dataKey="newFiles"
              stroke="#16A34A"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#16A34A" }}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Duplicates Line */}
            <Line
              type="monotone"
              dataKey="duplicates"
              stroke="#EA580C"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#EA580C" }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Manual Legend */}
      <CustomLegend />
    </div>
  );
}
