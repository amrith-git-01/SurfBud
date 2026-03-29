import { ConfigureSectionSkeleton } from "./shared/ConfigureSectionSkeleton";

interface BrowsingSessionThresholdsSectionProps {
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  isLoading?: boolean;
  isDisabled?: boolean;
  onMinSessionDurationChange: (next: number) => void;
  onMergeGapSecondsChange: (next: number) => void;
}

const PRESET_SECONDS = [10, 20, 30, 60] as const;

function PresetRow({
  label,
  helperText,
  selectedValue,
  onChange,
}: {
  label: string;
  helperText: string;
  selectedValue: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[var(--color-text-heading)]">
        {label}
      </p>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={label}>
        {PRESET_SECONDS.map((seconds) => {
          const isSelected = selectedValue === seconds;
          return (
            <button
              key={seconds}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(seconds)}
              className={[
                "h-9 cursor-pointer rounded-lg border text-xs font-semibold transition-colors duration-150",
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-hover)]",
              ].join(" ")}
            >
              {seconds}s
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">{helperText}</p>
    </div>
  );
}

export function BrowsingSessionThresholdsSection({
  minSessionDurationSeconds,
  mergeGapSeconds,
  isLoading = false,
  isDisabled = false,
  onMinSessionDurationChange,
  onMergeGapSecondsChange,
}: BrowsingSessionThresholdsSectionProps) {
  if (isLoading) {
    return (
      <ConfigureSectionSkeleton
        title="Session Thresholds"
        description="Tune session filtering and same-domain merge behavior."
      >
          <div className="space-y-5" aria-hidden>
            <div className="space-y-2">
              <div className="skeleton h-4 w-52 rounded" />
              <div className="grid grid-cols-4 gap-2">
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
              </div>
              <div className="skeleton h-3 w-64 rounded" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-4 w-52 rounded" />
              <div className="grid grid-cols-4 gap-2">
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
              </div>
              <div className="skeleton h-3 w-64 rounded" />
            </div>
          </div>
      </ConfigureSectionSkeleton>
    );
  }

  return (
    <section className={isDisabled ? "pointer-events-none" : ""}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
          Session Thresholds
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Tune session filtering and same-domain merge behavior.
        </p>
      </div>

      <div className="card-metric-glass p-5 mt-4">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[var(--color-border)]">
          <div className="md:pr-5">
            <PresetRow
              label="Minimum Session Duration"
              selectedValue={minSessionDurationSeconds}
              onChange={onMinSessionDurationChange}
              helperText="Sessions shorter than this are discarded."
            />
          </div>

          <div className="md:pl-5">
            <PresetRow
              label="Merge Gap"
              selectedValue={mergeGapSeconds}
              onChange={onMergeGapSecondsChange}
              helperText="Same-domain sessions within this gap are merged."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
