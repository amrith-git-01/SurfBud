import { Globe } from "lucide-react";
import type { BrowsingDomainStatRow } from "@/api/browsing.api";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";

export function ProductivityDomainSuggestionRow({
  domain,
  isAdded,
  onAdd,
  index = 0,
  categoryIcon,
  categoryColor,
  addDisabled = false,
  addedLabel = "Added",
  addLabel = "Add",
}: {
  domain: BrowsingDomainStatRow;
  isAdded: boolean;
  onAdd: (domainName: string, suggestedName?: string) => void;
  index?: number;
  categoryIcon?: string | undefined;
  categoryColor?: string | undefined;
  addDisabled?: boolean;
  addedLabel?: string;
  addLabel?: string;
}) {
  const label = domain.label?.trim() || domain.domain;

  return (
    <div
      className="anim-list-item-enter ui-hover-row flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white/50 px-3 py-2.5 transition-colors hover:border-[var(--color-border-strong)]"
      style={{ animationDelay: `${Math.min(index, 9) * 35}ms` }}
    >
      <div className="min-w-0 flex items-center gap-2">
        {domain.domainLogo?.trim() ? (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/80">
            <img
              src={domain.domainLogo!.trim()}
              alt=""
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </span>
        ) : categoryIcon ? (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80">
            <BrowsingCategoryIconBadge
              iconName={categoryIcon}
              color={categoryColor ?? "#6b7280"}
              size="sm"
            />
          </span>
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-[var(--color-text-muted)]">
            <Globe className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-text-heading)]">
            {label}
          </p>
          <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">
            {domain.domain}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isAdded || addDisabled}
        onClick={() => onAdd(domain.domain, label)}
        className="shrink-0 rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-body)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAdded ? addedLabel : addLabel}
      </button>
    </div>
  );
}
