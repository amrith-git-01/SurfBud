import type { ReactNode } from "react";
import { clsx } from "clsx";

export interface MetricCardProps {
  /** Section label above the value (e.g. "TODAY'S DOWNLOADS") */
  label: string;
  /** Optional icon shown in the card header */
  icon?: ReactNode;
  /** Main number to show (string, number, or inline JSX e.g. score + /100) */
  value: ReactNode;
  /** Delta line: positive e.g. "↑2 yesterday", negative e.g. "↓16 last wk" */
  delta?: { direction: "up" | "down"; text: string };
  /** Sub line below value when no delta (e.g. "16 new · 22 dup" or "all time") */
  subLine?: ReactNode;
  /** When true, render skeleton placeholders instead of content */
  skeleton?: boolean;
  /** Optional click handler (e.g. for opening drawer) */
  onClick?: () => void;
  /** Native tooltip (e.g. metric definitions on hover) */
  title?: string;
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
  title,
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
      title={title}
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
            <div className="mb-2 flex items-center gap-2">
              {icon ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/45 text-[var(--color-primary)] ring-1 ring-white/50">
                  {icon}
                </span>
              ) : null}
              <p className="metric-card-label mb-0">{label}</p>
            </div>
            <div
              className="text-lg font-semibold tabular-nums text-[#0F172A] leading-tight tracking-tight"
              style={{ minWidth: "4ch", letterSpacing: "-0.025em" }}
            >
              {value}
            </div>
            {subLine ? (
              <div
                className={clsx(
                  "self-end text-right text-xs text-[#94A3B8]",
                  delta ? "mt-1" : "mt-auto",
                )}
              >
                {subLine}
              </div>
            ) : null}
            {delta ? (
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
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
