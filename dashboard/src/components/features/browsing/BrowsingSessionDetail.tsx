import { useState, useEffect } from "react";
import type { BrowsingSessionRow } from "@/api/browsing.api";
import type { BrowsingProductivityType } from "@/api/browsing.api";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { formatSessionTimeRangeInZone } from "@/utils/formatSessionTimeRange";
import { ChevronLeft, Globe, X } from "lucide-react";

const PRODUCTIVITY_BADGE: Record<BrowsingProductivityType, { bg: string; color: string; label: string }> = {
  productive: { bg: "#D1FAE5", color: "#16A34A", label: "Productive" },
  distractive: { bg: "#FFE4E6", color: "#DC2626", label: "Distractive" },
  neutral: { bg: "#F1F5F9", color: "#94A3B8", label: "Neutral" },
};

interface BrowsingSessionDetailProps {
  session: BrowsingSessionRow;
  categoryName: string | null;
  /** From categories catalog when no domain logo — matches feed badge. */
  categoryIcon?: string;
  categoryColor?: string;
  timeZone: string;
  onBack?: () => void;
  onClose: () => void;
}

function formatIsoInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
  });
}

function formatDetailDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return formatDurationSeconds(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function BrowsingSessionDetail({
  session,
  categoryName,
  categoryIcon,
  categoryColor,
  timeZone,
  onBack,
  onClose,
}: BrowsingSessionDetailProps) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(false);
    const timeout = window.setTimeout(() => setIsAnimated(true), 16);
    return () => window.clearTimeout(timeout);
  }, []);

  const label = session.label?.trim() || session.domain.replace(/^www\./i, "");
  const logo = session.domainLogo?.trim();
  const productivity = session.productivityType ?? ("neutral" as BrowsingProductivityType);
  const slug = session.categorySlug?.trim();
  const productivityBadge = PRODUCTIVITY_BADGE[productivity];

  const range = formatSessionTimeRangeInZone(session.startedAt, session.endedAt, timeZone);

  const dateLine = new Date(session.endedAt).toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });

  const { keypresses, clicks, scrollEvents } = session.interactions;

  const catIcon = categoryIcon?.trim();
  const catCol = categoryColor?.trim();

  const leading = logo ? (
    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gray-100">
      <img
        src={logo}
        alt=""
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
      />
    </span>
  ) : catIcon && catCol ? (
    <BrowsingCategoryIconBadge iconName={catIcon} color={catCol} size="lg" />
  ) : slug && session.domainColor ? (
    <BrowsingCategoryIconBadge iconName="Globe" color={session.domainColor} size="lg" />
  ) : (
    <span
      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] text-[#94A3B8]"
      style={{ backgroundColor: "#F1F5F9" }}
    >
      <Globe className="h-9 w-9" strokeWidth={2} aria-hidden />
    </span>
  );

  const detailRows = [
    {
      label: "Duration",
      value: formatDetailDuration(session.durationSeconds),
      isTabular: true,
    },
    {
      label: "Time Range",
      value: range,
      isTabular: false,
    },
    {
      label: "Date",
      value: dateLine,
      isTabular: false,
    },
    {
      label: "Domain",
      value: session.domain,
      isTabular: false,
    },
    ...(categoryName
      ? [
          {
            label: "Category",
            value: categoryName,
            isTabular: false as const,
          },
        ]
      : []),
  ];

  const interactionRows = [
    { label: "Clicks", value: clicks.toString() },
    { label: "Keypresses", value: keypresses.toString() },
    { label: "Scroll Events", value: scrollEvents.toString() },
  ];

  return (
    <div className="flex h-full flex-col bg-white font-sans">
      <header className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to sessions"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text-body)]"
              >
                <ChevronLeft size={16} />
                <span>Sessions</span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-danger-light)] hover:text-[var(--color-danger)]"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div
          className="flex flex-col items-center text-center transition-all duration-200 ease-out"
          style={{
            opacity: isAnimated ? 1 : 0,
            transform: isAnimated ? "translateY(0px)" : "translateY(8px)",
          }}
        >
          {leading}

          <p className="mt-3 font-display text-xl font-bold text-[var(--color-text-heading)]">
            {label}
          </p>

          <span
            className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: productivityBadge.bg, color: productivityBadge.color }}
          >
            {productivityBadge.label}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="section-label mb-0">SESSION DETAILS</p>
          </div>
          <div className="chart-glass !p-4">
            <div className="divide-y divide-[var(--color-border)]">
              {detailRows.map((row, index) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-3 transition-all duration-200 ease-out"
                  style={{
                    opacity: isAnimated ? 1 : 0,
                    transform: isAnimated ? "translateY(0px)" : "translateY(8px)",
                    transitionDelay: `${index * 30}ms`,
                  }}
                >
                  <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {row.label}
                  </p>
                  <p
                    className={[
                      "min-w-0 max-w-[62%] truncate text-right text-[14px] font-medium text-[var(--color-text-heading)]",
                      row.isTabular ? "tabular-nums" : "",
                    ].join(" ")}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="section-label mb-0">INTERACTIONS</p>
          </div>
          <div className="chart-glass !p-4">
            <div className="divide-y divide-[var(--color-border)]">
              {interactionRows.map((row, index) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-3 transition-all duration-200 ease-out"
                  style={{
                    opacity: isAnimated ? 1 : 0,
                    transform: isAnimated ? "translateY(0px)" : "translateY(8px)",
                    transitionDelay: `${(detailRows.length + index) * 30}ms`,
                  }}
                >
                  <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {row.label}
                  </p>
                  <p className="min-w-0 max-w-[62%] truncate text-right text-[14px] font-medium text-[var(--color-text-heading)] tabular-nums">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="section-label mb-0">CAPTURED FIELDS</p>
          </div>
          <div className="chart-glass !p-4">
            <div className="space-y-4">
              <div
                className="transition-all duration-200 ease-out"
                style={{
                  opacity: isAnimated ? 1 : 0,
                  transform: isAnimated ? "translateY(0px)" : "translateY(8px)",
                  transitionDelay: `${(detailRows.length + interactionRows.length) * 30}ms`,
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Session ID
                </p>
                <p className="mt-1.5 break-all font-mono text-xs text-[var(--color-text-heading)]">
                  {session.sessionId}
                </p>
              </div>

              <div
                className="transition-all duration-200 ease-out"
                style={{
                  opacity: isAnimated ? 1 : 0,
                  transform: isAnimated ? "translateY(0px)" : "translateY(8px)",
                  transitionDelay: `${(detailRows.length + interactionRows.length + 1) * 30}ms`,
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Started At
                </p>
                <p className="mt-1.5 text-xs text-[var(--color-text-heading)]">
                  {formatIsoInZone(session.startedAt, timeZone)}
                </p>
              </div>

              <div
                className="transition-all duration-200 ease-out"
                style={{
                  opacity: isAnimated ? 1 : 0,
                  transform: isAnimated ? "translateY(0px)" : "translateY(8px)",
                  transitionDelay: `${(detailRows.length + interactionRows.length + 2) * 30}ms`,
                }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Ended At
                </p>
                <p className="mt-1.5 text-xs text-[var(--color-text-heading)]">
                  {formatIsoInZone(session.endedAt, timeZone)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
