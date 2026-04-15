import { formatDurationSeconds } from "@/utils/formatDuration";

export interface FocusScoreSummaryHeaderProps {
  productiveSeconds: number;
  distractingSeconds: number;
  focusScore: number | null;
}

export function FocusScoreSummaryHeader({
  productiveSeconds,
  distractingSeconds,
  focusScore,
}: FocusScoreSummaryHeaderProps) {
  const sum = productiveSeconds + distractingSeconds;
  const pPct =
    sum > 0 ? Math.round((productiveSeconds / sum) * 100) : 0;
  const dPct =
    sum > 0 ? Math.round((distractingSeconds / sum) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)]/80 bg-white/60 px-4 py-3 shadow-[0_4px_16px_rgba(8,145,178,0.06)] backdrop-blur-[2px]">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-[var(--color-success)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" aria-hidden />
          Productive
        </span>
        <span className="font-medium tabular-nums text-[var(--color-success)]">
          {formatDurationSeconds(productiveSeconds)}
        </span>
        <span className="tabular-nums text-[var(--color-text-muted)]">{pPct}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-[var(--color-danger)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" aria-hidden />
          Distractive
        </span>
        <span className="font-medium tabular-nums text-[var(--color-danger)]">
          {formatDurationSeconds(distractingSeconds)}
        </span>
        <span className="tabular-nums text-[var(--color-text-muted)]">{dPct}%</span>
      </div>
      <div className="my-3 border-t border-[var(--color-border)]/80" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-muted)]">Focus Score</span>
        <span className="font-semibold text-[var(--color-primary)]">
          {focusScore != null ? `${focusScore}/100` : "—"}
        </span>
      </div>
    </div>
  );
}
