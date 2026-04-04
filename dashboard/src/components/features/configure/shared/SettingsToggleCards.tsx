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
  sectionTitle?: string;
  sectionDescription?: string;
  cards: SettingsToggleCard[];
  isLoading?: boolean;
  isDisabled?: boolean;
  hideSectionHeader?: boolean;
  /** 1 = single full-width row; 2 = two columns on large screens (default) */
  maxColumns?: 1 | 2;
  /** No outer section; use inside a parent section (e.g. grouped settings) */
  bare?: boolean;
}

function ToggleCard({
  id,
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
      data-testid={id ? `settings-toggle-${id}` : undefined}
      className={[
        "card-metric-glass p-5 h-full transition-opacity duration-200",
        disabled ? "opacity-40" : "",
      ].join(" ")}
      title={disabled && disabledTooltip ? disabledTooltip : undefined}
    >
      <div className="grid h-full grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-heading)]">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {description}
          </p>
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
  sectionTitle = "",
  sectionDescription = "",
  cards,
  isLoading = false,
  isDisabled = false,
  hideSectionHeader = false,
  maxColumns = 2,
  bare = false,
}: SettingsToggleCardsProps) {
  const gridClass =
    maxColumns === 1
      ? "grid grid-cols-1 gap-4"
      : "grid grid-cols-1 gap-4 lg:grid-cols-2";

  const skeletonCount = maxColumns === 1 ? 1 : 2;

  const skeletonGrid = (
    <div className={gridClass} aria-hidden>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div key={i} className="card-metric-glass p-5 h-full w-full">
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
  );

  const disabledClass = isDisabled ? "pointer-events-none" : "";

  const contentGrid = (
    <div
      className={
        hideSectionHeader || bare ? gridClass : ["mt-4", gridClass].join(" ")
      }
    >
      {cards.map((card) => (
        <ToggleCard key={card.id} {...card} />
      ))}
    </div>
  );

  if (isLoading) {
    if (bare) {
      return (
        <div className={disabledClass}>
          <div className="mt-4">{skeletonGrid}</div>
        </div>
      );
    }
    if (hideSectionHeader) {
      return <div className={disabledClass}>{skeletonGrid}</div>;
    }
    return (
      <ConfigureSectionSkeleton
        title={sectionTitle}
        description={sectionDescription}
      >
        {skeletonGrid}
      </ConfigureSectionSkeleton>
    );
  }

  if (bare) {
    return (
      <div className={disabledClass}>
        <div className="mt-4">{contentGrid}</div>
      </div>
    );
  }

  return (
    <section className={disabledClass}>
      {!hideSectionHeader ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
            {sectionTitle}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {sectionDescription}
          </p>
        </div>
      ) : null}

      {contentGrid}
    </section>
  );
}
