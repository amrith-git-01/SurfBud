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
  disabled = false,
}: {
  label: string;
  helperText: string;
  selectedValue: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[var(--color-text-heading)]">
        {label}
      </p>
      <div
        className="grid grid-cols-4 gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {PRESET_SECONDS.map((seconds) => {
          const isSelected = selectedValue === seconds;
          return (
            <button
              key={seconds}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(seconds)}
              className={[
                "h-9 rounded-lg border text-xs font-semibold transition-colors duration-150",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : [
                      "border-[var(--color-border)] text-[var(--color-text-body)]",
                      disabled ? "" : "hover:bg-[var(--color-bg-hover)]",
                    ].join(" "),
              ].join(" ")}
            >
              {seconds}s
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        {helperText}
      </p>
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
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
            Session Thresholds
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Filter out very short visits and merge back-to-back visits on the same site into one session.
          </p>
        </div>
        <div
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5"
          aria-hidden
        >
          <div className="card-metric-glass p-5">
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
          <div className="card-metric-glass p-5">
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
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
          Session Thresholds
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Filter out very short visits and merge back-to-back visits on the same site into one session.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="card-metric-glass p-5">
          <PresetRow
            label="Minimum Session Duration"
            selectedValue={minSessionDurationSeconds}
            onChange={onMinSessionDurationChange}
            helperText="Visits shorter than this are ignored and do not become sessions."
            disabled={isDisabled}
          />
        </div>

        <div className="card-metric-glass p-5">
          <PresetRow
            label="Merge Gap"
            selectedValue={mergeGapSeconds}
            onChange={onMergeGapSecondsChange}
            helperText="If you return to the same site within this gap, SurfBud merges it with the previous session."
            disabled={isDisabled}
          />
        </div>
      </div>
    </section>
  );
}
