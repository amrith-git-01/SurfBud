import type { GracePeriodMinutes, GracePeriodType } from '@/api/downloads.api';
import { Dropdown } from '@/components/ui/Dropdown';

interface AutoRemoveBehaviorProps {
  autoRemoveEnabled: boolean;
  gracePeriodType: GracePeriodType;
  gracePeriodMinutes: GracePeriodMinutes;
  isLoading?: boolean;
  isDisabled?: boolean;
  onGracePeriodTypeChange: (next: GracePeriodType) => void;
  onGracePeriodMinutesChange: (next: GracePeriodMinutes) => void;
}

const GRACE_OPTIONS: Array<{ label: string; value: GracePeriodMinutes }> = [
  { label: '30 sec', value: 0.5 },
  { label: '15 mins', value: 15 },
  { label: '30 mins', value: 30 },
  { label: '1 hour', value: 60 },
];

export function AutoRemoveBehavior({
  autoRemoveEnabled,
  gracePeriodType,
  gracePeriodMinutes,
  isLoading = false,
  isDisabled = false,
  onGracePeriodTypeChange,
  onGracePeriodMinutesChange,
}: AutoRemoveBehaviorProps) {
  if (isLoading) {
    return (
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
            Auto remove behavior
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Choose when duplicate files should be removed.
          </p>
        </div>
        <div className="card-metric-glass p-5 mt-4">
          <div className="space-y-4">
            <div className="skeleton h-4 w-48 rounded" />
            <div className="skeleton h-4 w-56 rounded" />
            <div className="skeleton h-8 w-28 rounded" />
          </div>
        </div>
      </section>
    );
  }

  const isSectionDisabled = isDisabled || !autoRemoveEnabled;

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
          Auto remove behavior
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Choose when duplicate files should be removed.
        </p>
      </div>

      <div
        className={[
          'card-metric-glass p-5 mt-4 transition-opacity duration-200',
          !autoRemoveEnabled ? 'opacity-40' : '',
          isDisabled ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <div className="space-y-4" aria-disabled={isSectionDisabled}>
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-text-heading)]">
            <input
              type="radio"
              name="auto-remove-mode"
              className="h-3 w-3 accent-[var(--color-primary)]"
              checked={gracePeriodType === 'immediate'}
              disabled={isSectionDisabled}
              onChange={() => onGracePeriodTypeChange('immediate')}
            />
            <span className="font-medium">Remove Immediately</span>
          </label>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 text-sm text-[var(--color-text-heading)]">
              <input
                type="radio"
                name="auto-remove-mode"
                className="h-3 w-3 accent-[var(--color-primary)]"
                checked={gracePeriodType === 'delayed'}
                disabled={isSectionDisabled}
                onChange={() => onGracePeriodTypeChange('delayed')}
              />
              <span className="font-medium">Grace Period</span>
            </label>

            {gracePeriodType === 'delayed' && (
              <Dropdown<GracePeriodMinutes>
                value={gracePeriodMinutes}
                options={GRACE_OPTIONS}
                onChange={onGracePeriodMinutesChange}
                disabled={isSectionDisabled}
                size="sm"
                buttonClassName="min-w-[104px] justify-between"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}