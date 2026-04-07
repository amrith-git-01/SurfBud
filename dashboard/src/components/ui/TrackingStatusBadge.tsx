import clsx from "clsx";

export interface TrackingStatusBadgeProps {
  enabled: boolean;
  className?: string;
}

export function TrackingStatusBadge({ enabled, className }: TrackingStatusBadgeProps) {
  if (enabled) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-light)] bg-[var(--color-success-light)] px-3 py-1 font-sans text-[11px] font-semibold leading-none tracking-tight text-[var(--color-success-dark)] shadow-[0_2px_10px_rgba(22,163,74,0.1)]",
          className,
        )}
        role="status"
        aria-label="Tracking enabled"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-success)]" aria-hidden />
        Tracking enabled
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-[rgba(148,163,184,0.22)] bg-[rgba(255,255,255,0.72)] px-3 py-1 font-sans text-[11px] font-semibold leading-none tracking-tight text-[var(--color-text-secondary)] shadow-[0_2px_12px_rgba(15,23,42,0.05)] backdrop-blur-[8px]",
        className,
      )}
      role="status"
      aria-label="Tracking disabled"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-muted)]" aria-hidden />
      Tracking disabled
    </span>
  );
}
