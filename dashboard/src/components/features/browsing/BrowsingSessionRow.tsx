import type { BrowsingProductivityType } from "@/api/browsing.api";
import type { BrowsingSessionRow as SessionRow } from "@/api/browsing.api";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { formatSessionTimeRangeInZone } from "@/utils/formatSessionTimeRange";
import { Globe } from "lucide-react";
import { useMemo } from "react";
import clsx from "clsx";

const PRODUCTIVITY_DOT: Record<BrowsingProductivityType, string> = {
  productive: "bg-[#16A34A]",
  distractive: "bg-[#DC2626]",
  neutral: "bg-[#94A3B8]",
};

const PRODUCTIVITY_TEXT: Record<BrowsingProductivityType, string> = {
  productive: "text-[#16A34A]",
  distractive: "text-[#DC2626]",
  neutral: "text-[#94A3B8]",
};

function formatDurationDrawer(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return formatDurationSeconds(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface BrowsingSessionRowProps {
  session: SessionRow;
  categoryIcon?: string;
  categoryColor?: string;
  timeZone: string;
  onClick?: () => void;
  /** Override outer padding (e.g. card layout supplies px-6 py-3). */
  className?: string;
  /** When true, omit default padding/hover — use inside a downloads-style card. */
  noPadding?: boolean;
}

export function BrowsingSessionRow({
  session,
  categoryIcon,
  categoryColor,
  timeZone,
  onClick,
  className,
  noPadding = false,
}: BrowsingSessionRowProps) {
  const label = session.label?.trim() || session.domain.replace(/^www\./i, "");
  const logo = session.domainLogo?.trim();
  const productivity =
    session.productivityType ?? ("neutral" as BrowsingProductivityType);

  const range = useMemo(
    () => formatSessionTimeRangeInZone(session.startedAt, session.endedAt, timeZone),
    [session.startedAt, session.endedAt, timeZone],
  );

  const leading = logo ? (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
      <img
        src={logo}
        alt=""
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
      />
    </span>
  ) : categoryIcon && categoryColor ? (
    <BrowsingCategoryIconBadge
      iconName={categoryIcon}
      color={categoryColor}
      size="lg"
    />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F9FF] text-[#94A3B8]">
      <Globe className="h-5 w-5" strokeWidth={2} aria-hidden />
    </span>
  );

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={clsx(
        "flex items-start gap-3 transition-colors duration-150",
        onClick ? "cursor-pointer" : "cursor-default",
        noPadding ? "px-0 py-0" : "px-6 py-3 hover:bg-[#F8FFFE]",
        className,
      )}
    >
      <div className="shrink-0 pt-0.5" aria-hidden>
        {leading}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-[#1E293B]">{label}</p>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-[#0F172A]">
            {formatDurationDrawer(session.durationSeconds)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 text-xs font-normal text-[#94A3B8]">
            <span className="font-mono">{session.domain}</span>
            <span className="mx-1.5 select-none">·</span>
            <span>{range}</span>
          </p>
          <span
            className={clsx(
              "shrink-0 inline-flex items-center gap-1 text-xs font-medium capitalize",
              PRODUCTIVITY_TEXT[productivity],
            )}
          >
            <span
              className={clsx(
                "inline-block h-1.5 w-1.5 rounded-full",
                PRODUCTIVITY_DOT[productivity],
              )}
              aria-hidden
            />
            {productivity}
          </span>
        </div>
      </div>
    </div>
  );
}
