import type { ReactNode } from "react";
import { clsx } from "clsx";

export interface MetricCardProps {
  /** Section label above the value (e.g. "TODAY'S DOWNLOADS") */
  label: string;
  /** Optional icon shown in the card header */
  icon?: ReactNode;
  /** Main number to show */
  value: string | number;
  /** Delta line: positive e.g. "↑2 yesterday", negative e.g. "↓16 last wk" */
  delta?: { direction: "up" | "down"; text: string };
  /** Sub line below value when no delta (e.g. "16 new · 22 dup" or "all time") */
  subLine?: ReactNode;
  /** When true, render skeleton placeholders instead of content */
  skeleton?: boolean;
  /** Optional click handler (e.g. for opening drawer) */
  onClick?: () => void;
  className?: string;
}

export function MetricCard({
  label,
  icon,
  value,
  delta,
  subLine,
  skeleton = false,
  onClick,
  className,
}: MetricCardProps) {
  const isInteractive = typeof onClick === "function";

  return (
    <div
      className={clsx(
        "card-metric-glass",
        isInteractive && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {skeleton ? (
        <>
          <div className="skeleton h-3 w-24 mb-3 rounded" />
          <div
            className="skeleton h-9 w-16 rounded mb-2"
            style={{ minWidth: "4ch" }}
          />
          <div className="skeleton h-3 w-20 rounded" />
        </>
      ) : (
        <>
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2">
              {icon ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/45 text-[var(--color-primary)] ring-1 ring-white/50">
                  {icon}
                </span>
              ) : null}
              <p className="section-label mb-0">{label}</p>
            </div>
            <p
              className="text-2xl font-bold tabular-nums text-[#0F172A] leading-tight tracking-tight"
              style={{ minWidth: "4ch", letterSpacing: "-0.025em" }}
            >
              {value}
            </p>
            {delta && (
              <p
                className={clsx(
                  "mt-auto self-end text-right text-xs font-medium",
                  delta.direction === "up" && "text-[#16A34A]",
                  delta.direction === "down" && "text-[#DC2626]",
                )}
              >
                {delta.direction === "up" ? "↑" : "↓"}
                {delta.text}
              </p>
            )}
            {subLine && !delta && (
              <div className="mt-auto self-end text-right text-xs text-[#94A3B8]">{subLine}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
