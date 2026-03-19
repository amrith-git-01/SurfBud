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
import { useDuplicateGroups } from "../../../api/useDownloads";
import { formatBytes } from "../../../utils/formatBytes";

interface DuplicateGroupsProps {
  onOpenTimeline?: (payload: { fileId: string; filename: string }) => void;
}

export function DuplicateGroups({ onOpenTimeline }: DuplicateGroupsProps) {
  const { data: groups, isLoading, isError, refetch } = useDuplicateGroups();

  if (isLoading) return <DuplicateGroupsSkeleton />;

  if (isError) {
    return (
      <section className="mb-12">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Duplicate Groups</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Group repeated files and open each group to inspect duplicate history.
          </p>
        </div>
        <div className="chart-glass w-full">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load duplicate files
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const rows = groups ?? [];

  return (
    <section className="mb-12">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Duplicate Groups</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Group repeated files and open each group to inspect duplicate history.
        </p>
      </div>
      <div className="chart-glass w-full p-0 max-h-[420px] flex flex-col overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text-body)]">
              No duplicates found
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Great job keeping your downloads clean!
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {rows.map((group) => {
              const totalDownloads = group.dupCount + 1;
              const hasFileId = Boolean(group.fileId);

              return (
                <button
                  key={group.fileId ?? `${group.filename}-${group.dupCount}`}
                  type="button"
                  onClick={() => {
                    if (!hasFileId) return;
                    onOpenTimeline?.({
                      fileId: group.fileId!,
                      filename: group.filename,
                    });
                  }}
                  disabled={!hasFileId}
                  className="ui-hover-row w-full text-left px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <FileTypeBadge filename={group.filename} />

                    <p className="text-sm font-medium text-[var(--color-text-strong)] truncate max-w-[280px]">
                      {group.filename}
                    </p>

                    <div className="ml-auto flex items-center gap-6">
                      <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                        x{totalDownloads} downloads
                      </span>
                      <span className="text-xs text-[#D97706] font-medium tabular-nums">
                        {group.dupCount} duplicates
                      </span>
                      <span className="text-xs text-[var(--color-danger)] font-medium tabular-nums">
                        {formatBytes(group.totalSize)} wasted
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-[var(--color-text-muted)]"
                        aria-hidden
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function FileTypeBadge({ filename }: { filename: string }) {
  const category = getCategoryFromFilename(filename);
  const color = getCategoryColor(category);

  const icon = (() => {
    switch (category) {
      case "document":
        return <FileText size={14} strokeWidth={2} />;
      case "image":
        return <Image size={14} strokeWidth={2} />;
      case "video":
        return <Video size={14} strokeWidth={2} />;
      case "audio":
        return <Music size={14} strokeWidth={2} />;
      case "archive":
        return <Archive size={14} strokeWidth={2} />;
      case "code":
        return <Code2 size={14} strokeWidth={2} />;
      default:
        return <File size={14} strokeWidth={2} />;
    }
  })();

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${color}1A`, color }}
      aria-hidden
    >
      {icon}
    </div>
  );
}

function getCategoryFromFilename(filename: string): "document" | "image" | "video" | "audio" | "archive" | "code" | "other" {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  const documentExt = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"];
  const imageExt = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  const videoExt = ["mp4", "mov", "avi", "mkv", "webm"];
  const audioExt = ["mp3", "wav", "flac", "aac", "ogg"];
  const archiveExt = ["zip", "rar", "7z", "tar", "gz"];
  const codeExt = ["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "java", "cpp", "c", "go", "rs"];

  if (documentExt.includes(ext)) return "document";
  if (imageExt.includes(ext)) return "image";
  if (videoExt.includes(ext)) return "video";
  if (audioExt.includes(ext)) return "audio";
  if (archiveExt.includes(ext)) return "archive";
  if (codeExt.includes(ext)) return "code";
  return "other";
}

function getCategoryColor(category: string): string {
  switch (category) {
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

function DuplicateGroupsSkeleton() {
  return (
    <section className="mb-12">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Duplicate Groups</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Group repeated files and open each group to inspect duplicate history.
        </p>
      </div>
      <div className="chart-glass w-full p-0 max-h-[420px] flex flex-col overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-[var(--color-border)] last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3 w-52 rounded" />
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-4 w-4 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
