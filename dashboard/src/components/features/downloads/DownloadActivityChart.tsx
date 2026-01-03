import { useState } from "react";
import { useDownloadTrend } from "../../../api/useDownloads";
import {
  TrendComposedChart,
  type TrendPeriod,
  type TrendPoint,
} from "../../ui/TrendComposedChart";

type Period = TrendPeriod;

interface DownloadActivityChartProps {
  hideHeading?: boolean;
  onDayClick?: (day: { date: string; label: string }) => void;
}

export function DownloadActivityChart({
  hideHeading = false,
  onDayClick,
}: DownloadActivityChartProps) {
  const [period, setPeriod] = useState<Period>(7);
  const { data: trendData, isLoading, isError } = useDownloadTrend(period);

  // Map dates like "2026-03-01" to "Mar 1" for the XAxis, matching UI spec
  const formattedData: TrendPoint[] = (trendData ?? []).map((bucket) => {
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
    <TrendComposedChart
      title="DOWNLOAD ACTIVITY"
      hideHeading={hideHeading}
      period={period}
      onPeriodChange={setPeriod}
      data={formattedData}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Could not load activity chart"
      emptyMessage="No download activity yet."
      barSeries={{ key: "total", label: "Total Downloads", color: "#0891B2" }}
      lineSeries={[
        { key: "newFiles", label: "New Files", color: "#16A34A" },
        { key: "duplicates", label: "Duplicates", color: "#EA580C" },
      ]}
      tooltipRows={[
        { key: "total", label: "Total", color: "#0891B2" },
        { key: "newFiles", label: "New Files", color: "#16A34A" },
        { key: "duplicates", label: "Duplicates", color: "#EA580C" },
      ]}
      onBarClick={onDayClick}
    />
  );
}
