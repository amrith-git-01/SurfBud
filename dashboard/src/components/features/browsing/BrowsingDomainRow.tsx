import type { BrowsingDomainStatRow } from "@/api/browsing.api";
import type { BrowsingProductivityType } from "@/api/browsing.api";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { Globe } from "lucide-react";
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

interface BrowsingDomainRowProps {
  row: BrowsingDomainStatRow;
  categoryIcon?: string;
  categoryColor?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export function BrowsingDomainRow({
  row,
  categoryIcon,
  categoryColor,
  onClick,
  noPadding = false,
}: BrowsingDomainRowProps) {
  const label = row.label?.trim() || row.domain.replace(/^www\./i, "");
  const logo = row.domainLogo?.trim();
  const productivity = row.productivityType;
  const icon = categoryIcon?.trim();
  const col = categoryColor?.trim() || row.domainColor?.trim() || "#64748B";

  const leading = logo ? (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
      <img
        src={logo}
        alt=""
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
      />
    </span>
  ) : icon ? (
    <BrowsingCategoryIconBadge iconName={icon} color={col} size="lg" />
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
      )}
    >
      <div className="shrink-0 pt-0.5" aria-hidden>
        {leading}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-[#1E293B]">{label}</p>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-[#0F172A]">
            {formatDurationSeconds(row.totalActiveTime)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 text-xs font-normal text-[#94A3B8]">
            <span className="font-mono">{row.domain}</span>
            <span className="mx-1.5 select-none">·</span>
            <span>
              {row.visitCount} {row.visitCount === 1 ? "session" : "sessions"}
            </span>
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
