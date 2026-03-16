import { OnOffToggle } from '@/components/features/configure/OnOffToggle';

interface MasterTogglesProps {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  onTrackingChange: (next: boolean) => void;
  onAutoRemoveChange: (next: boolean) => void;
}

interface ToggleCardProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  warningText?: string;
  disabledTooltip?: string;
  onChange: (next: boolean) => void;
}

function ToggleCard({
  label,
  description,
  checked,
  disabled = false,
  warningText,
  disabledTooltip,
  onChange,
}: ToggleCardProps) {
  return (
    <div
      className={[
        'card-metric-glass p-5 h-full transition-opacity duration-200',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
      title={disabled && disabledTooltip ? disabledTooltip : undefined}
    >
      <div className="grid h-full grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-heading)]">{label}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
          {warningText && !checked && (
            <p className="mt-3 text-xs font-medium text-[var(--color-danger)]">
              {warningText}
            </p>
          )}
        </div>
        <div className="self-center">
          <OnOffToggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            label={label}
          />
        </div>
      </div>
    </div>
  );
}

export function MasterToggles({
  trackingEnabled,
  autoRemoveEnabled,
  isLoading = false,
  isDisabled = false,
  onTrackingChange,
  onAutoRemoveChange,
}: MasterTogglesProps) {
  if (isLoading) {
    return (
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Master Toggles</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Control core tracking and duplicate-removal behavior.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card-metric-glass p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-4 w-36 rounded" />
                  <div className="skeleton h-3 w-52 rounded" />
                </div>
                <div className="skeleton h-[24px] w-[44px] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={isDisabled ? 'pointer-events-none' : ''}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Master Toggles</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Control core tracking and duplicate-removal behavior.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ToggleCard
          label="Download Tracking"
          description="Track and record all downloaded files"
          checked={trackingEnabled}
          onChange={onTrackingChange}
          warningText="SurfBud is not recording any downloads"
        />
        <ToggleCard
          label="Auto-remove Duplicates"
          description="Automatically delete duplicate files from your disk"
          checked={autoRemoveEnabled}
          onChange={onAutoRemoveChange}
          disabled={!trackingEnabled}
          disabledTooltip="Enable Download Tracking first"
        />
      </div>
    </section>
  );
}
