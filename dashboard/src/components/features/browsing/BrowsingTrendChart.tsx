import { useState } from "react";
import { useBrowsingTrend } from "@/api/useBrowsing";
import {
  TrendComposedChart,
  type TrendPeriod,
  type TrendPoint,
} from "@/components/ui/TrendComposedChart";
import { formatDurationSeconds } from "@/utils/formatDuration";

type Period = TrendPeriod;

interface BrowsingTrendChartProps {
  hideHeading?: boolean;
  onDayClick?: (day: { date: string; label: string }) => void;
}

export function BrowsingTrendChart({
  hideHeading = false,
  onDayClick,
}: BrowsingTrendChartProps) {
  const [period, setPeriod] = useState<Period>(7);
  const { data: trendData, isLoading, isError } = useBrowsingTrend(period);

  const formattedData: TrendPoint[] = (trendData ?? []).map((bucket) => {
    const d = new Date(bucket.date);
    const shortDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return { ...bucket, displayDate: shortDate };
  });

  return (
    <TrendComposedChart
      title="BROWSING ACTIVITY"
      hideHeading={hideHeading}
      period={period}
      onPeriodChange={setPeriod}
      data={formattedData}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Could not load browsing chart"
      emptyMessage="No browsing activity yet."
      yAxisTickFormatter={(seconds) => formatDurationSeconds(seconds)}
      barFillOpacity={0.7}
      lineStrokeWidth={2.5}
      barSeries={{
        key: "totalActiveTime",
        label: "Total Time",
        color: "#0891B2",
      }}
      lineSeries={[
        { key: "productiveTime", label: "Productive", color: "#16A34A" },
        { key: "distractingTime", label: "Distractive", color: "#DC2626" },
      ]}
      tooltipRows={[
        {
          key: "totalActiveTime",
          label: "Total Time",
          color: "#0891B2",
          formatter: (v) => formatDurationSeconds(v),
        },
        {
          key: "productiveTime",
          label: "Productive",
          color: "#16A34A",
          formatter: (v) => formatDurationSeconds(v),
        },
        {
          key: "distractingTime",
          label: "Distractive",
          color: "#DC2626",
          formatter: (v) => formatDurationSeconds(v),
        },
        {
          key: "neutralTime",
          label: "Neutral",
          color: "#94A3B8",
          getDisplayValue: (d: TrendPoint) =>
            formatDurationSeconds(
              typeof d.neutralTime === "number" ? d.neutralTime : 0,
            ),
        },
        {
          key: "focusScore",
          label: "Focus",
          color: "#64748B",
          getDisplayValue: (d: TrendPoint) => {
            const fs = d.focusScore;
            if (typeof fs !== "number") return "—";
            return `${Math.round(fs)}%`;
          },
        },
      ]}
      onBarClick={onDayClick}
    />
  );
}

