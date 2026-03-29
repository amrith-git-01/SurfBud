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
        <footer className="sticky bottom-0 border-t border-[var(--color-border)] bg-white px-6 py-3">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={onPrevPage}
              aria-label="Previous page"
              className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-bg-page)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <p className="text-sm text-[var(--color-text-secondary)]">
              Page {page} of {totalPages}
            </p>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={onNextPage}
              aria-label="Next page"
              className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-bg-page)] disabled:cursor-not-allowed disabled:opacity-40"
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
                className="anim-list-item-enter ui-hover-row mb-3 w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-white text-left transition-colors duration-150 hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
              >
                <div className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <FileIcon category={fileCategory} size="md" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-snug text-[var(--color-text-strong)]">
                        {event.filename}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                        <span className="font-mono text-[var(--color-text-secondary)]">
                          {event.sourceDomain || "unknown"}
                        </span>
                        <span aria-hidden>&middot;</span>
                        <span>{toRelativeTime(event.createdAt)}</span>
                        {fileSize != null ? (
                          <>
                            <span aria-hidden>&middot;</span>
                            <span className="tabular-nums">{formatBytes(fileSize)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="ml-2 flex items-center gap-2 self-center">
                      <StatusBadge status={event.status} />
                      <ChevronRight size={14} className="text-[var(--color-text-muted)]" aria-hidden />
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

