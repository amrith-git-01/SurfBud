import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DownloadEvent } from "../../../api/downloads.api";
import { Dropdown } from "../../ui/Dropdown";
import { FileIcon } from "../../ui/FileIcon";
import { StatusBadge } from "../../ui/StatusBadge";
import { TextField } from "../../ui/TextField";
import { formatBytes } from "../../../utils/formatBytes";
import type {
  DrawerCategoryFilter,
  DrawerPeriod,
  DrawerStatusFilter,
} from "./FileDetailDrawer";

interface DrawerListModeProps {
  title: string;
  total: number;
  events: DownloadEvent[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  period: DrawerPeriod;
  onPeriodChange: (value: DrawerPeriod) => void;
  status: DrawerStatusFilter;
  onStatusChange: (value: DrawerStatusFilter) => void;
  category: DrawerCategoryFilter;
  onCategoryChange: (value: DrawerCategoryFilter) => void;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSelectFile: (fileId: string, eventId: string) => void;
  onClose: () => void;
}

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "duplicate", label: "Duplicate" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "document", label: "Document" },
  { value: "image", label: "Image" },
  { value: "text", label: "Text" },
  { value: "code", label: "Code" },
  { value: "executable", label: "Executable" },
  { value: "archive", label: "Archive" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "other", label: "Other" },
] as const;

export function DrawerListMode({
  title,
  total,
  events,
  isLoading,
  isError,
  onRetry,
  searchInput,
  onSearchInputChange,
  period,
  onPeriodChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onSelectFile,
  onClose,
}: DrawerListModeProps) {
  return (
    <div className="flex h-full flex-col bg-white font-sans">
      <header className="px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              className="text-xl font-semibold text-[var(--color-text-strong)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {total} files found
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="px-6 py-3 border-b border-[var(--color-border)]">
        <TextField
          label="Search"
          showLabel={false}
          type="text"
          value={searchInput}
          onChange={onSearchInputChange}
          onClear={() => onSearchInputChange("")}
          placeholder="Search by filename..."
          containerClassName="space-y-0"
          className="rounded-lg border border-[var(--color-border)] bg-white py-2 text-xs text-[var(--color-text-body)] placeholder:text-[var(--color-text-muted)]"
        />

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Dropdown
            size="sm"
            value={category}
            options={[...CATEGORY_OPTIONS]}
            onChange={(value) => onCategoryChange(value as DrawerCategoryFilter)}
            buttonClassName="w-full justify-between"
            align="left"
          />
          <Dropdown
            size="sm"
            value={status}
            options={[...STATUS_OPTIONS]}
            onChange={(value) => onStatusChange(value as DrawerStatusFilter)}
            buttonClassName="w-full justify-between"
            align="left"
          />
          <Dropdown
            size="sm"
            value={period}
            options={[...PERIOD_OPTIONS]}
            onChange={(value) => onPeriodChange(value as DrawerPeriod)}
            buttonClassName="w-full justify-between"
            align="left"
          />
        </div>
      </div>

      <div
        className={[
          "flex-1 overflow-y-auto p-3",
          !isLoading && !isError && events.length === 0 ? "flex items-center justify-center" : "",
        ].join(" ")}
      >
        {isLoading ? <ListSkeleton /> : null}

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
              Try adjusting filters
            </p>
          </div>
        ) : null}

        {!isLoading &&
          !isError &&
          events.map((event) => {
            const fileId = getEventFileId(event);
            const fileCategory = getEventCategory(event);
            const fileSize = getEventSize(event);
            const isClickable = !!fileId;

            return (
              <button
                key={event._id}
                type="button"
                onClick={() => {
                  if (!fileId) return;
                  onSelectFile(fileId, event._id);
                }}
                disabled={!isClickable}
                className="mb-3 w-full rounded-xl border border-[var(--color-border)] bg-white text-left transition-colors duration-150 hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <FileIcon category={fileCategory} size="md" />

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-[var(--color-text-strong)] truncate">
                        {event.filename}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
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

                    <div className="ml-3 flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      <ChevronRight size={16} className="text-[var(--color-text-muted)]" aria-hidden />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      <footer className="sticky bottom-0 border-t border-[var(--color-border)] bg-white px-6 py-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={onPrevPage}
            aria-label="Previous page"
            className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-bg-page)] disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-bg-page)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    </div>
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

function ListSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="px-6 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="flex-1">
              <div className="skeleton h-3 w-44 rounded mb-2" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
            <div className="skeleton h-5 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
