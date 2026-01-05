import type { ReactNode } from "react";

const FEED_PANEL_HEIGHT_CLASS = "h-[420px]";

export interface RecentFeedProps {
  hideHeading?: boolean;
  sectionLabel: string;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  errorMessage: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Inner skeleton rows only (wrapped in chart-glass by RecentFeed). */
  skeleton: ReactNode;
  hasItems: boolean;
  /** Rows when loaded and `hasItems` is true. */
  listContent: ReactNode;
  /** Shown below the scroll area when `hasItems` (e.g. CTA or helper text). */
  footer?: ReactNode;
  /** Set when list rows use `role="listitem"` for a11y. */
  listRoleList?: boolean;
}

/**
 * Shared glass panel for “recent” sidebars (downloads, browsing, etc.).
 * Same layout, height, and scroll/footer pattern everywhere.
 */
export function RecentFeed({
  hideHeading = false,
  sectionLabel,
  isLoading,
  isError,
  onRetry,
  errorMessage,
  emptyTitle,
  emptyDescription,
  skeleton,
  hasItems,
  listContent,
  footer,
  listRoleList = false,
}: RecentFeedProps) {
  const sectionClass = hideHeading ? "" : "mb-12";

  if (isLoading) {
    return (
      <section className={sectionClass}>
        {!hideHeading && (
          <p className="section-label-with-gap">{sectionLabel}</p>
        )}
        <div
          className={`chart-glass w-full p-0 ${FEED_PANEL_HEIGHT_CLASS} overflow-hidden flex flex-col`}
        >
          {skeleton}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={sectionClass}>
        {!hideHeading && (
          <p className="section-label-with-gap">{sectionLabel}</p>
        )}
        <div className="chart-glass w-full">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      {!hideHeading && (
        <p className="section-label-with-gap">{sectionLabel}</p>
      )}

      <div
        className={`chart-glass w-full p-0 ${FEED_PANEL_HEIGHT_CLASS} flex flex-col overflow-hidden`}
      >
        {!hasItems ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-[var(--color-text-body)]">
              {emptyTitle}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {emptyDescription}
            </p>
          </div>
        ) : (
          <>
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              role={listRoleList ? "list" : undefined}
            >
              {listContent}
            </div>

            {footer !== undefined && footer !== null ? (
              <div className="py-3 flex justify-center border-t border-[var(--color-border)] flex-shrink-0">
                {footer}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

const DEFAULT_SKELETON_ROW_COUNT = 5;

export interface RecentFeedSkeletonRowsProps {
  /** Extra column on the right (e.g. status badge) — matches downloads row layout. */
  trailingSlot?: boolean;
  rowCount?: number;
}

/** Default pulsing rows for `RecentFeed` loading state. */
export function RecentFeedSkeletonRows({
  trailingSlot = false,
  rowCount = DEFAULT_SKELETON_ROW_COUNT,
}: RecentFeedSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="px-3 py-2.5 border-b border-[var(--color-border)] last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <div className="skeleton w-7 h-7 rounded-lg" />
            <div className="flex-1">
              <div className="skeleton h-3 w-40 mb-2 rounded" />
              <div
                className={`skeleton h-3 rounded ${trailingSlot ? "w-20" : "w-28"}`}
              />
            </div>
            {trailingSlot ? (
              <div className="skeleton h-6 w-12 rounded-md" />
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}
