import { useBrowsingStats } from "@/api/useBrowsing";
import { formatDurationSeconds } from "@/utils/formatDuration";
import {
  HealthBarCard,
  HealthBarCardSkeleton,
} from "@/components/ui/HealthBarCard";
import type { BrowsingDrawerTrigger } from "./browsingDrawer.types";

interface BrowsingHealthBarProps {
  onOpenDrawer: (trigger: BrowsingDrawerTrigger) => void;
}

export function BrowsingHealthBar({ onOpenDrawer }: BrowsingHealthBarProps) {
  const { data: metrics, isLoading } = useBrowsingStats();

  if (isLoading) return <HealthBarCardSkeleton pillCount={3} />;

  const today = metrics?.today;
  const total = today?.totalActiveTime ?? 0;
  const productive = today?.productiveTime ?? 0;
  const distracting = today?.distractingTime ?? 0;
  const neutral = today?.neutralTime ?? 0;

  const prodPct = total > 0 ? (productive / total) * 100 : 0;
  const distPct = total > 0 ? (distracting / total) * 100 : 0;
  const neutPct = total > 0 ? (neutral / total) * 100 : 0;

  const open = (
    type: "productive" | "distracting" | "neutral",
    seconds: number,
  ) =>
    onOpenDrawer({
      type: "productivity-segment",
      productivityType: type,
      seconds,
    });

  return (
    <HealthBarCard
      title="PRODUCTIVITY HEALTH"
      description="How today's active browsing time splits across productive, distracting, and neutral activity. Click any segment to see those sessions."
      isEmpty={total === 0}
      emptyMessage="No browsing activity recorded today yet."
      segments={[
        {
          label: "Productive",
          pct: prodPct,
          barColor: "var(--color-success)",
          dotClass: "bg-[var(--color-success)]",
          ariaLabel: `Productive: ${formatDurationSeconds(productive)} (${prodPct.toFixed(1)}%)`,
          onClick: () => open("productive", productive),
        },
        {
          label: "Distracting",
          pct: distPct,
          barColor: "var(--color-coral)",
          dotClass: "bg-[var(--color-coral)]",
          ariaLabel: `Distracting: ${formatDurationSeconds(distracting)} (${distPct.toFixed(1)}%)`,
          onClick: () => open("distracting", distracting),
        },
        {
          label: "Neutral",
          pct: neutPct,
          barColor: "#94A3B8",
          dotClass: "bg-[#94A3B8]",
          ariaLabel: `Neutral: ${formatDurationSeconds(neutral)} (${neutPct.toFixed(1)}%)`,
          onClick: () => open("neutral", neutral),
        },
      ]}
      pills={[
        {
          label: "Productive",
          value: total === 0 ? "—" : formatDurationSeconds(productive),
          bgColor: "#16A34A",
          disabled: productive === 0,
          onClick: () => open("productive", productive),
        },
        {
          label: "Distracting",
          value: total === 0 ? "—" : formatDurationSeconds(distracting),
          bgColor: "#EA580C",
          disabled: distracting === 0,
          onClick: () => open("distracting", distracting),
        },
        {
          label: "Neutral",
          value: total === 0 ? "—" : formatDurationSeconds(neutral),
          bgColor: "#64748B",
          disabled: neutral === 0,
          onClick: () => open("neutral", neutral),
        },
      ]}
    />
  );
}
