import { OnOffToggle } from "@/components/features/configure/OnOffToggle";
import { ConfigureSectionSkeleton } from "./ConfigureSectionSkeleton";

export interface SettingsToggleCard {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  warningText?: string;
  disabledTooltip?: string;
  onChange: (next: boolean) => void;
}

interface SettingsToggleCardsProps {
  sectionTitle: string;
  sectionDescription: string;
  cards: SettingsToggleCard[];
  isLoading?: boolean;
  isDisabled?: boolean;
}

function ToggleCard({
  label,
  description,
  checked,
  disabled = false,
  warningText,
  disabledTooltip,
  onChange,
}: SettingsToggleCard) {
  return (
    <div
      className={[
        "card-metric-glass p-5 h-full transition-opacity duration-200",
        disabled ? "opacity-40" : "",
      ].join(" ")}
      title={disabled && disabledTooltip ? disabledTooltip : undefined}
    >
      <div className="grid h-full grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-heading)]">{label}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
          {warningText && !checked ? (
            <p className="mt-3 text-xs font-medium text-[var(--color-danger)]">
              {warningText}
            </p>
          ) : null}
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

export function SettingsToggleCards({
  sectionTitle,
  sectionDescription,
  cards,
  isLoading = false,
  isDisabled = false,
}: SettingsToggleCardsProps) {
  if (isLoading) {
    return (
      <ConfigureSectionSkeleton title={sectionTitle} description={sectionDescription}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="card-metric-glass p-5 h-full">
              <div className="grid h-full grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="skeleton h-4 w-36 rounded" />
                  <div className="mt-1.5 skeleton h-3 w-52 rounded" />
                </div>
                <div className="self-center skeleton h-[24px] w-[44px] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </ConfigureSectionSkeleton>
    );
  }

  return (
    <section className={isDisabled ? "pointer-events-none" : ""}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{sectionTitle}</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{sectionDescription}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <ToggleCard key={card.id} {...card} />
        ))}
      </div>
    </section>
  );
}
