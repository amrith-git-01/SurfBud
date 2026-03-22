import { useRecentEvents } from "../../../api/useDownloads";
import type { DownloadEvent } from "../../../api/downloads.api";
import {
  Archive,
  ChevronRight,
  Code2,
  File,
  FileText,
  Image,
  Music,
  Video,
} from "lucide-react";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import {
  RecentFeed,
  RecentFeedSkeletonRows,
} from "@/components/ui/RecentFeed";

interface RecentDownloadsFeedProps {
  onOpenDetail?: (payload: {
    eventId: string;
    fileId: string;
    filename: string;
    createdAt: string;
  }) => void;
  onOpenAll?: () => void;
  hideHeading?: boolean;
}

export function RecentDownloadsFeed({
  onOpenDetail,
  onOpenAll,
  hideHeading = false,
}: RecentDownloadsFeedProps) {
  const { data: events, isLoading, isError, refetch } = useRecentEvents();

  const rows = events ?? [];

  return (
    <RecentFeed
      hideHeading={hideHeading}
      sectionLabel="RECENT DOWNLOADS"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      errorMessage="Could not load recent downloads"
      emptyTitle="No recent downloads"
      emptyDescription="Recent downloads will appear here."
      skeleton={<RecentFeedSkeletonRows trailingSlot />}
      hasItems={rows.length > 0}
      listContent={rows.map((event) => (
        <DownloadEventRow
          key={event._id}
          event={event}
          onOpenDetail={onOpenDetail}
        />
      ))}
      footer={
        <button
          type="button"
          onClick={onOpenAll}
          className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-700)] transition-colors duration-200"
        >
          View all downloads -&gt;
        </button>
      }
    />
  );
}

function DownloadEventRow({
  event,
  onOpenDetail,
}: {
  event: DownloadEvent;
  onOpenDetail?: RecentDownloadsFeedProps["onOpenDetail"];
}) {
  const fileId =
    typeof event.fileId === "string"
      ? event.fileId
      : event.fileId?._id ?? "";

  return (
    <button
      type="button"
      onClick={() =>
        fileId &&
        onOpenDetail?.({
          eventId: event._id,
          fileId,
          filename: event.filename,
          createdAt: event.createdAt,
        })
      }
      className="ui-hover-row w-full text-left px-3 py-2.5 border-b border-[var(--color-border)] last:border-b-0"
    >
      <div className="flex items-start gap-2.5">
        <div className="self-center">
          <FileTypeBadge event={event} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--color-text-strong)] truncate leading-snug">
            {event.filename}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            <span className="min-w-0 flex-1 truncate font-mono text-[var(--color-text-secondary)]">
              {event.sourceDomain || "unknown"}
            </span>
            <span className="shrink-0" aria-hidden>
              &middot;
            </span>
            <span className="shrink-0 whitespace-nowrap">
              {formatRelativeTime(event.createdAt)}
            </span>
          </div>
        </div>

        <div className="ml-2 flex items-center gap-2 self-center">
          <StatusBadge status={event.status} />
          <ChevronRight
            size={14}
            className="text-[var(--color-text-muted)]"
            aria-hidden
          />
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: "new" | "duplicate" }) {
  if (status === "new") {
    return (
      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#DCFCE7] text-[#16A34A] leading-none">
        NEW
      </span>
    );
  }

  return (
    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#D97706] leading-none">
      DUP
    </span>
  );
}

function FileTypeBadge({ event }: { event: DownloadEvent }) {
  const category =
    typeof event.fileId === "string" ? "other" : event.fileId?.fileCategory || "other";

  const color = getCategoryColor(category);

  const icon = (() => {
    switch (category.toLowerCase()) {
      case "document":
        return <FileText size={12} strokeWidth={2} />;
      case "image":
        return <Image size={12} strokeWidth={2} />;
      case "video":
        return <Video size={12} strokeWidth={2} />;
      case "audio":
        return <Music size={12} strokeWidth={2} />;
      case "archive":
        return <Archive size={12} strokeWidth={2} />;
      case "code":
        return <Code2 size={12} strokeWidth={2} />;
      default:
        return <File size={12} strokeWidth={2} />;
    }
  })();

  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${color}1A`, color }}
      aria-hidden
    >
      {icon}
    </div>
  );
}

function getCategoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case "document":
      return "#2563EB";
    case "image":
      return "#7C3AED";
    case "video":
      return "#E11D48";
    case "audio":
      return "#059669";
    case "archive":
      return "#EA580C";
    case "code":
      return "#0891B2";
    default:
      return "#94A3B8";
  }
}
