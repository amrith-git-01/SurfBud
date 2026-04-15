import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DownloadEvent } from "../../../api/downloads.api";
import { DrawerListLayout } from "../../ui/DrawerListLayout";
import { FileIcon } from "../../ui/FileIcon";
import { StatusBadge } from "../../ui/StatusBadge";
import { DrawerListCardsSkeleton } from "@/components/skeletons/DrawerListCardsSkeleton";
import { formatBytes } from "../../../utils/formatBytes";
import { useEffect, useState } from "react";
interface DrawerListModeProps {
  title: string;
  total: number;
  events: DownloadEvent[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSelectFile: (fileId: string, eventId: string) => void;
  onClose: () => void;
}

export function DrawerListMode({
  title,
  total,
  events,
  isLoading,
  isError,
  onRetry,
  searchInput,
  onSearchInputChange,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onSelectFile,
  onClose,
}: DrawerListModeProps) {
  const [listAnimSeed, setListAnimSeed] = useState(0);

  useEffect(() => {
    if (!isLoading && !isError) {
      setListAnimSeed((seed) => seed + 1);
    }
  }, [isLoading, isError, page, searchInput]);

  return (
    <DrawerListLayout
      title={title}
      subtitle={`${total} files found`}
      onClose={onClose}
      searchInput={searchInput}
      onSearchInputChange={onSearchInputChange}
      searchPlaceholder="Search by filename..."
      listClassName={
        !isLoading && !isError && events.length === 0
          ? "flex items-center justify-center"
          : undefined
      }
      footer={
        <footer className="sticky bottom-0 border-t border-[var(--color-border)]/80 bg-[#faf8ff]/95 px-5 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={onPrevPage}
              aria-label="Previous page"
              className="rounded-full border border-[var(--color-border)] bg-white/80 p-2 text-[var(--color-primary)] shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <p className="min-w-[7rem] text-center text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">
              Page {page} of {totalPages}
            </p>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={onNextPage}
              aria-label="Next page"
              className="rounded-full border border-[var(--color-border)] bg-white/80 p-2 text-[var(--color-primary)] shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      }
    >
      {isLoading ? (
        <DrawerListCardsSkeleton
          rowCount={10}
          iconSizeClass="h-8 w-8"
          trailingVariant="badgeWithChevron"
        />
      ) : null}

        {!isLoading && isError ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load downloads
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && events.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text-body)]">
              No downloads found
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Try a different search term
            </p>
          </div>
        ) : null}

        {!isLoading &&
          !isError &&
          events.map((event, index) => {
            const fileId = getEventFileId(event);
            const fileCategory = getEventCategory(event);
            const fileSize = getEventSize(event);
            const isClickable = !!fileId;

            return (
              <button
                key={`${listAnimSeed}-${event._id}`}
                type="button"
                onClick={() => {
                  if (!fileId) return;
                  onSelectFile(fileId, event._id);
                }}
                disabled={!isClickable}
                className="anim-list-item-enter ui-hover-row mb-2.5 w-full cursor-pointer text-left transition-all duration-150 last:mb-0 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
              >
                <div className="chart-glass rounded-xl !p-0 transition-shadow duration-200 hover:shadow-[0_10px_28px_rgba(8,145,178,0.1)]">
                  <div className="flex items-center gap-3 px-4 py-3 sm:px-4 sm:py-3.5">
                    <FileIcon category={fileCategory} size="md" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-snug text-[var(--color-text-heading)]">
                        {event.filename}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
                        <span className="font-mono text-[var(--color-text-secondary)]">
                          {event.sourceDomain || "unknown"}
                        </span>
                        <span aria-hidden className="text-[var(--color-text-ghost)]">
                          ·
                        </span>
                        <span>{toRelativeTime(event.createdAt)}</span>
                        {fileSize != null ? (
                          <>
                            <span aria-hidden className="text-[var(--color-text-ghost)]">
                              ·
                            </span>
                            <span className="tabular-nums font-medium text-[var(--color-text-body)]">
                              {formatBytes(fileSize)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-center">
                      <StatusBadge status={event.status} />
                      <ChevronRight size={16} className="text-[var(--color-primary)]/50" aria-hidden />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
    </DrawerListLayout>
  );
}

function getEventFileId(event: DownloadEvent): string | null {
  if (typeof event.fileId === "string") return event.fileId;
  return event.fileId?._id ?? null;
}

function getEventCategory(event: DownloadEvent): string {
  if (typeof event.fileId === "string") return "other";
  return event.fileId?.fileCategory ?? "other";
}

function getEventSize(event: DownloadEvent): number | null {
  if (typeof event.fileId === "string") return null;
  if (typeof event.fileId?.size === "number") return event.fileId.size;
  return null;
}

function toRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSeconds = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86_400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86_400)}d ago`;
}

