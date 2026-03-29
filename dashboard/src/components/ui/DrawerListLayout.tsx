import { X } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { TextField } from "./TextField";

export interface DrawerListLayoutProps {
  title: string;
  /** e.g. “24 files found” or “12 sessions” */
  subtitle?: ReactNode;
  /** Extra lines under the title (e.g. timeline block context) */
  titleAccessory?: ReactNode;
  onClose: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter row below search — same grid slot as downloads (category / status / period). */
  filters?: ReactNode;
  /** When false, hides the search + filter strip entirely. */
  showFilterBar?: boolean;
  children: ReactNode;
  /** Sticky bottom bar — pagination */
  footer?: ReactNode;
  /** Apply vertical centering in the scroll region (empty states). */
  listClassName?: string;
}

/**
 * Shared list drawer chrome used by downloads `DrawerListMode` and browsing drawer.
 */
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
    <div className="flex h-full flex-col bg-white font-sans">
      <header className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-lg font-semibold text-[var(--color-text-strong)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            {titleAccessory ? (
              <div className="mt-1">{titleAccessory}</div>
            ) : null}
            {subtitle !== undefined && subtitle !== null ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-page)] hover:text-[var(--color-text-body)]"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {showFilterBar ? (
        <div className="border-b border-[var(--color-border)] px-6 py-3">
          <TextField
            label="Search"
            showLabel={false}
            type="text"
            value={searchInput}
            onChange={onSearchInputChange}
            onClear={() => onSearchInputChange("")}
            placeholder={searchPlaceholder}
            containerClassName="space-y-0"
            className="rounded-lg border border-[var(--color-border)] bg-white py-2 text-xs text-[var(--color-text-body)] placeholder:text-[var(--color-text-muted)]"
          />

          {filters ? <div className="mt-2">{filters}</div> : null}
        </div>
      ) : null}

      <div
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto p-3",
          listClassName,
        )}
      >
        {children}
      </div>

      {footer}
    </div>
  );
}
