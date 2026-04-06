import { X } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { TextField } from "./TextField";

export interface DrawerListLayoutProps {
  title: string;
  subtitle?: ReactNode;
  titleAccessory?: ReactNode;
  onClose: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  showFilterBar?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  listClassName?: string;
}

export function DrawerListLayout({
  title,
  subtitle,
  titleAccessory,
  onClose,
  searchInput,
  onSearchInputChange,
  searchPlaceholder = "Search…",
  filters,
  showFilterBar = true,
  children,
  footer,
  listClassName,
}: DrawerListLayoutProps) {
  return (
    <div className="flex h-full flex-col bg-[#faf8ff] font-sans">
      <header className="border-b border-[var(--color-border)]/80 bg-[#faf8ff]/95 px-5 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="section-title-display text-xl font-bold tracking-tight text-[var(--color-text-heading)] sm:text-2xl">
              {title}
            </h3>
            {titleAccessory ? <div className="mt-1.5">{titleAccessory}</div> : null}
            {subtitle !== undefined && subtitle !== null ? (
              <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent text-[var(--color-text-muted)] transition-colors duration-150 hover:border-[var(--color-border)] hover:bg-white/80 hover:text-[var(--color-text-heading)]"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {showFilterBar ? (
        <div className="border-b border-[var(--color-border)]/60 px-5 py-3 sm:px-6">
          <div className="chart-glass !p-3">
            <TextField
              label="Search"
              showLabel={false}
              type="text"
              value={searchInput}
              onChange={onSearchInputChange}
              onClear={() => onSearchInputChange("")}
              placeholder={searchPlaceholder}
              containerClassName="space-y-0"
              className="rounded-lg border-0 bg-white/60 py-2 text-sm text-[var(--color-text-body)] shadow-none placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            {filters ? <div className="mt-3">{filters}</div> : null}
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5",
          listClassName,
        )}
      >
        {children}
      </div>

      {footer}
    </div>
  );
}
