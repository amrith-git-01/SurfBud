import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  Check,
  Code,
  Copy,
  File,
  FileText,
  Image,
  Music,
  Trash2,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useFileById, useFileTimeline } from "../../../api/useDownloads";
import { BackButton } from "../../ui/BackButton";
import { StatusBadge } from "../../ui/StatusBadge";
import {
  DrawerDetailsSkeleton,
  DrawerTimelineSkeleton,
} from "@/components/skeletons/DrawerDetailSkeletons";
import type { DrawerEventSelectionMode } from "./FileDetailDrawer";

export type DrawerDetailView = "details" | "timeline";

interface DrawerDetailModeProps {
  fileId: string | null;
  eventId: string | null;
  eventSelectionMode: DrawerEventSelectionMode;
  initialView: DrawerDetailView;
  isActive: boolean;
  canGoBack: boolean;
  listTitle: string;
  onBack: () => void;
  onClose: () => void;
}

interface CategoryVisual {
  Icon: LucideIcon;
  color: string;
  tint: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  document: { Icon: FileText, color: "#2563EB", tint: "#EFF6FF" },
  text: { Icon: FileText, color: "#2563EB", tint: "#EFF6FF" },
  image: { Icon: Image, color: "#7C3AED", tint: "#EDE9FE" },
  video: { Icon: Video, color: "#E11D48", tint: "#FFE4E6" },
  audio: { Icon: Music, color: "#059669", tint: "#D1FAE5" },
  archive: { Icon: Archive, color: "#EA580C", tint: "#FED7AA" },
  code: { Icon: Code, color: "#0891B2", tint: "#CFFAFE" },
  executable: { Icon: File, color: "#94A3B8", tint: "#F1F5F9" },
  other: { Icon: File, color: "#94A3B8", tint: "#F1F5F9" },
};

const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  Icon: File,
  color: "#94A3B8",
  tint: "#F1F5F9",
};

export function DrawerDetailMode({
  fileId,
  eventId,
  eventSelectionMode,
  initialView,
  isActive,
  canGoBack,
  listTitle,
  onBack,
  onClose,
}: DrawerDetailModeProps) {
  const [activeView, setActiveView] = useState<DrawerDetailView>(initialView);
  const [isDetailsAnimated, setIsDetailsAnimated] = useState(false);
  const [isTimelineAnimated, setIsTimelineAnimated] = useState(false);
  const [isSavedPathCopied, setIsSavedPathCopied] = useState(false);
  const copyResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView, fileId]);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive || activeView !== "details") {
      setIsDetailsAnimated(false);
      return;
    }

    setIsDetailsAnimated(false);
    const timeout = window.setTimeout(() => setIsDetailsAnimated(true), 16);
    return () => window.clearTimeout(timeout);
  }, [activeView, fileId, isActive]);

  useEffect(() => {
    if (!isActive || activeView !== "timeline") {
      setIsTimelineAnimated(false);
      return;
    }

    setIsTimelineAnimated(false);
    const timeout = window.setTimeout(() => setIsTimelineAnimated(true), 16);
    return () => window.clearTimeout(timeout);
  }, [activeView, fileId, isActive]);

  const {
    data: file,
    isLoading: isFileLoading,
    isError: isFileError,
    refetch: refetchFile,
  } = useFileById(fileId);

  const {
    data: timeline,
    isLoading: isTimelineLoading,
    isError: isTimelineError,
    refetch: refetchTimeline,
  } = useFileTimeline(fileId);

  const fileCategory = normalizeCategory(file?.fileCategory);
  const visual = CATEGORY_VISUALS[fileCategory] ?? DEFAULT_CATEGORY_VISUAL;
  const selectedEvent =
    timeline?.find((event) => event._id === eventId) ??
    (eventSelectionMode === "original"
      ? timeline?.find((event) => event.status === "new") ??
        (timeline && timeline.length > 0 ? timeline[timeline.length - 1] : null)
      : timeline?.[0] ?? null);
  const displayFilename = selectedEvent?.filename ?? file?.filename ?? "Unknown file";
  const displaySavedPath =
    selectedEvent?.savedPath?.trim() || file?.savedPath?.trim()
      ? (selectedEvent?.savedPath?.trim() ? selectedEvent.savedPath : file?.savedPath) ??
        "- Not captured yet"
      : "- Not captured yet";
  const displaySourceDomain =
    selectedEvent?.sourceDomain?.trim() || file?.sourceDomain?.trim()
      ? (selectedEvent?.sourceDomain?.trim()
          ? selectedEvent.sourceDomain
          : file?.sourceDomain) ?? "Unknown"
      : "Unknown";
  const displayDownloadedAt = selectedEvent?.createdAt ?? file?.createdAt ?? "";
  const isRemoved = selectedEvent?.isRemoved ?? false;
  const hasSavedPath = displaySavedPath !== "- Not captured yet";
  const detailsRows = [
    {
      label: "Size",
      value: formatFileSize(file?.size),
      isMono: false,
      isTabular: true,
      title: undefined,
      isMutedItalic: false,
    },
    {
      label: "Saved Path",
      value: displaySavedPath,
      isMono: displaySavedPath !== "- Not captured yet",
      isTabular: false,
      title: displaySavedPath !== "- Not captured yet" ? displaySavedPath : undefined,
      isMutedItalic: displaySavedPath === "- Not captured yet",
    },
    {
      label: "Source Domain",
      value: displaySourceDomain,
      isMono: false,
      isTabular: false,
      title: undefined,
      isMutedItalic: false,
    },
    {
      label: "Extension",
      value: file?.fileExtension?.trim() ? file.fileExtension : "-",
      isMono: false,
      isTabular: false,
      title: undefined,
      isMutedItalic: false,
    },
    {
      label: "Mime Type",
      value: file?.mimeType?.trim() ? file.mimeType : "-",
      isMono: false,
      isTabular: false,
      title: undefined,
      isMutedItalic: false,
    },
    {
      label: "Downloaded At",
      value: formatDateTime(displayDownloadedAt),
      isMono: false,
      isTabular: true,
      title: undefined,
      isMutedItalic: false,
    },
  ];

  const handleCopySavedPath = async (): Promise<void> => {
    if (!hasSavedPath) {
      return;
    }

    try {
      await navigator.clipboard.writeText(displaySavedPath);
      setIsSavedPathCopied(true);

      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }

      copyResetTimeoutRef.current = window.setTimeout(() => {
        setIsSavedPathCopied(false);
        copyResetTimeoutRef.current = null;
      }, 1400);
    } catch {
      setIsSavedPathCopied(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white font-sans">
      <header className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {canGoBack ? (
              <BackButton label={listTitle} onClick={onBack} />
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-danger-light)] hover:text-[var(--color-danger)]"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-4 inline-flex rounded-lg border border-[var(--color-border)] p-1">
          <button
            type="button"
            onClick={() => setActiveView("details")}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              activeView === "details"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]",
            ].join(" ")}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveView("timeline")}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              activeView === "timeline"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]",
            ].join(" ")}
          >
            Timeline
          </button>
        </div>

        {activeView === "details" ? (
          <>
            {isFileLoading ? <DrawerDetailsSkeleton /> : null}

            {!isFileLoading && isFileError ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--color-danger)]">Could not load file details</p>
                <button
                  type="button"
                  onClick={() => void refetchFile()}
                  className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!isFileLoading && !isFileError && !file ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-[var(--color-text-body)]">No file details found</p>
              </div>
            ) : null}

            {!isFileLoading && !isFileError && file ? (
              <div className="space-y-5">
                <div
                  className="flex flex-col items-center text-center transition-all duration-200 ease-out"
                  style={{
                    opacity: isDetailsAnimated ? 1 : 0,
                    transform: isDetailsAnimated ? "translateY(0px)" : "translateY(8px)",
                  }}
                >
                  <span
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px]"
                    style={{ backgroundColor: visual.tint, color: visual.color }}
                    aria-hidden
                  >
                    <visual.Icon className="h-9 w-9" />
                  </span>

                  <p className="mt-3 max-w-full break-words font-display text-xl font-bold text-[var(--color-text-heading)]">
                    {displayFilename}
                  </p>

                  <span
                    className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize"
                    style={{ backgroundColor: visual.tint, color: visual.color }}
                  >
                    {fileCategory}
                  </span>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="section-label mb-0">FILE DETAILS</p>
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        isRemoved
                          ? "bg-[var(--color-danger-light)] text-[var(--color-danger)]"
                          : "bg-[var(--color-success-light)] text-[var(--color-success)]",
                      ].join(" ")}
                    >
                      {isRemoved ? <Trash2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {isRemoved ? "Removed" : "Preserved"}
                    </span>
                  </div>
                  <div className="chart-glass !p-4">
                    <div className="divide-y divide-[var(--color-border)]">
                      {detailsRows.map((row, index) => (
                        <div
                          key={row.label}
                          className={[
                            "flex justify-between gap-4 py-3 transition-all duration-200 ease-out",
                            row.label === "Saved Path" ? "items-start" : "items-center",
                          ].join(" ")}
                          style={{
                            opacity: isDetailsAnimated ? 1 : 0,
                            transform: isDetailsAnimated ? "translateY(0px)" : "translateY(8px)",
                            transitionDelay: `${index * 30}ms`,
                          }}
                        >
                          {row.label === "Saved Path" ? (
                            <div className="shrink-0 flex items-center gap-2">
                              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                                {row.label}
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleCopySavedPath()}
                                disabled={!hasSavedPath}
                                aria-label="Copy saved path"
                                title={hasSavedPath ? "Copy saved path" : "Saved path not available"}
                                className={[
                                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-200",
                                  hasSavedPath
                                    ? "text-[var(--color-primary)] hover:bg-[color:rgba(8,145,178,0.12)]"
                                    : "cursor-not-allowed text-[var(--color-text-muted)] opacity-60",
                                ].join(" ")}
                              >
                                {isSavedPathCopied ? (
                                  <Check className="h-3.5 w-3.5 animate-[pulse_220ms_ease-out] text-[var(--color-primary)]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                              {row.label}
                            </p>
                          )}
                          {row.label === "Saved Path" ? (
                            <div className="min-w-0 max-w-[62%]">
                              <div className="flex items-start justify-end">
                                <p
                                  className={[
                                    "min-w-0 text-right text-[14px] font-medium text-[var(--color-text-heading)]",
                                    row.isMono ? "font-mono text-sm" : "font-sans",
                                    row.isMutedItalic ? "italic text-[var(--color-text-muted)]" : "",
                                    "whitespace-normal break-normal leading-6",
                                  ].join(" ")}
                                  title={row.title}
                                >
                                  {hasSavedPath ? renderPathWithSlashBreaks(row.value) : row.value}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p
                              className={[
                                "min-w-0 max-w-[62%] truncate text-right text-[14px] font-medium text-[var(--color-text-heading)]",
                                row.isMono ? "font-mono text-sm" : "font-sans",
                                row.isMutedItalic ? "italic text-[var(--color-text-muted)]" : "",
                                row.isTabular ? "tabular-nums" : "",
                              ].join(" ")}
                              title={row.title}
                            >
                              {row.value}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeView === "timeline" ? (
        <div>
          <p className="section-label">DOWNLOAD TIMELINE</p>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Every time this file was downloaded
          </p>

          {isTimelineLoading ? <DrawerTimelineSkeleton /> : null}

          {!isTimelineLoading && isTimelineError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--color-danger)]">Could not load timeline</p>
              <button
                type="button"
                onClick={() => void refetchTimeline()}
                className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isTimelineLoading && !isTimelineError && (timeline?.length ?? 0) === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-[var(--color-text-body)]">No timeline found</p>
            </div>
          ) : null}

          {!isTimelineLoading && !isTimelineError && (timeline?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {timeline!.map((event, index) => {
                const isFirstEntry = index === 0;
                const isLastEntry = index === timeline!.length - 1;
                const isFirstDownload = isLastEntry && event.status === "new";
                const dotColorClass =
                  event.status === "new"
                    ? "bg-[var(--color-success)]"
                    : "bg-[var(--color-warning)]";
                const cardClassName = isFirstDownload
                  ? "rounded-xl border border-[var(--color-success-light)] bg-[color:rgba(22,163,74,0.05)] px-3 py-2.5"
                  : "rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5";

                return (
                  <div
                    key={event._id}
                    className="grid grid-cols-[16px_1fr] items-stretch gap-3"
                    style={{
                      opacity: isTimelineAnimated ? 1 : 0,
                      transform: isTimelineAnimated ? "translateY(0px)" : "translateY(8px)",
                      transition: `opacity 200ms ease-out ${index * 40}ms, transform 200ms ease-out ${index * 40}ms`,
                    }}
                  >
                    <div className="relative flex justify-center">
                      {timeline!.length > 1 && !isFirstEntry ? (
                        <span
                          className="absolute top-0 bottom-1/2 left-1/2 w-0.5 -translate-x-1/2 bg-[var(--color-border)]"
                          aria-hidden
                        />
                      ) : null}

                      {timeline!.length > 1 && !isLastEntry ? (
                        <span
                          className="absolute top-1/2 bottom-[-12px] left-1/2 w-0.5 -translate-x-1/2 bg-[var(--color-border)]"
                          aria-hidden
                        />
                      ) : null}

                      <span
                        className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${dotColorClass}`}
                        aria-hidden
                      />
                    </div>

                    <div className={`${cardClassName} ui-hover-row`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[var(--color-text-heading)] tabular-nums leading-5">
                            {formatDateTime(event.createdAt)}
                          </p>

                          <p className="mt-0.5 truncate text-[13px] leading-5 text-[var(--color-text-muted)]">
                            <span className="truncate align-middle text-[var(--color-text-body)] font-medium">
                              {event.sourceDomain || "unknown"}
                            </span>
                            {typeof event.duration === "number" ? (
                              <>
                                <span aria-hidden> · </span>
                                <span className="tabular-nums text-[var(--color-text-muted)]">{formatDuration(event.duration)}</span>
                              </>
                            ) : null}
                          </p>
                        </div>

                        <div className="shrink-0 self-center">
                          <StatusBadge status={event.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {timeline!.length === 1 ? (
                <p className="pt-2 text-center text-sm text-[var(--color-text-muted)]">
                  No duplicates found for this file.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}

function formatFileSize(size?: number): string {
  if (typeof size !== "number" || Number.isNaN(size) || size < 0) {
    return "Unknown";
  }

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateTime(iso: string): string {
  if (!iso) {
    return "Unknown";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function renderPathWithSlashBreaks(path: string): ReactNode[] {
  return path.split(/([\\/])/).map((part, index) => {
    if (part === "\\" || part === "/") {
      return (
        <span key={`${part}-${index}`}>
          {part}
          <wbr />
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function normalizeCategory(category?: string): string {
  return (category ?? "other").toLowerCase();
}
