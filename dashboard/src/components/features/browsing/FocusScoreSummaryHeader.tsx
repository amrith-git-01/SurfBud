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
    <div className="border-b border-[#E0F2FE] bg-[#F0F9FF] px-6 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-[#16A34A]">
          <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden />
          Productive
        </span>
        <span className="font-medium tabular-nums text-[#16A34A]">
          {formatDurationSeconds(productiveSeconds)}
        </span>
        <span className="tabular-nums text-[#64748B]">{pPct}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-[#DC2626]">
          <span className="h-2 w-2 rounded-full bg-[#DC2626]" aria-hidden />
          Distractive
        </span>
        <span className="font-medium tabular-nums text-[#DC2626]">
          {formatDurationSeconds(distractingSeconds)}
        </span>
        <span className="tabular-nums text-[#64748B]">{dPct}%</span>
      </div>
      <div className="my-3 border-t border-[#E0F2FE]" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#94A3B8]">Focus Score</span>
        <span className="font-semibold text-[#0891B2]">
          {focusScore != null ? `${focusScore}/100` : "—"}
        </span>
      </div>
    </div>
  );
}
